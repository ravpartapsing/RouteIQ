import type { FastifyInstance } from 'fastify';
import { UploadUrlRequest, type Document, type DocEntityType } from '@routeiq/contracts';
import {
  CUSTOMER,
  LOCATION,
  TRAILER,
  TRUCK,
  documents,
  drivers,
  getOwned,
  users,
  type DocumentRecord,
} from '@routeiq/data';
import { authOf, requireUser } from '../plugins/auth.js';
import { parse } from '../lib/validate.js';
import { ApiError, notFound } from '../lib/errors.js';
import { newId } from '../lib/crypto.js';
import { objectStore } from '../lib/storage.js';

const UPLOAD_TTL = 10 * 60;
const DOWNLOAD_TTL = 5 * 60;

/** The document can only hang off something this carrier owns. */
async function ownsEntity(tenantId: string, type: DocEntityType, id: string): Promise<boolean> {
  switch (type) {
    case 'DRIVER': {
      const d = await drivers.getDriver(id);
      return !!d && d.tenantId === tenantId;
    }
    case 'TRUCK':
      return !!(await getOwned(TRUCK, tenantId, id));
    case 'TRAILER':
      return !!(await getOwned(TRAILER, tenantId, id));
    case 'CUSTOMER':
      return !!(await getOwned(CUSTOMER, tenantId, id));
    case 'LOCATION':
      return !!(await getOwned(LOCATION, tenantId, id));
  }
}

const toDocument = (d: DocumentRecord): Document => ({
  id: d.id,
  entityType: d.entityType as DocEntityType,
  entityId: d.entityId,
  docType: d.docType as Document['docType'],
  fileName: d.fileName,
  contentType: d.contentType,
  sizeBytes: d.sizeBytes,
  status: d.status,
  uploadedBy: d.uploadedBy,
  createdAt: d.createdAt,
});

export async function documentRoutes(app: FastifyInstance): Promise<void> {
  const readers = requireUser('OWNER', 'ADMIN', 'DISPATCHER', 'ACCOUNTING');
  const writers = requireUser('OWNER', 'ADMIN', 'DISPATCHER', 'ACCOUNTING');

  async function load(tenantId: string, id: string) {
    const d = await documents.getDocument(id);
    if (!d || d.tenantId !== tenantId) throw notFound('Document');
    return d;
  }

  /** Step 1: record the intent and hand back a signed PUT URL. */
  app.post('/v1/documents/upload-url', { preHandler: writers }, async (request, reply) => {
    const auth = authOf(request);
    const body = parse(UploadUrlRequest, request.body);
    if (!(await ownsEntity(auth.tenantId, body.entityType, body.entityId))) throw notFound(body.entityType.toLowerCase());

    const user = await users.getUser(auth.id);
    const id = newId();
    const safeName = body.fileName.replace(/[^\w.\- ]/g, '_').slice(-120);
    const objectKey = `tenants/${auth.tenantId}/${body.entityType.toLowerCase()}/${body.entityId}/${id}/${safeName}`;
    await documents.createPending({
      id,
      tenantId: auth.tenantId,
      entityType: body.entityType,
      entityId: body.entityId,
      docType: body.docType,
      fileName: body.fileName,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
      objectKey,
      status: 'PENDING',
      uploadedBy: { kind: 'USER', id: auth.id, name: user ? `${user.firstName} ${user.lastName}` : 'Unknown' },
      createdAt: new Date().toISOString(),
    });
    const signed = await objectStore().presignPut(objectKey, body.contentType, body.sizeBytes, UPLOAD_TTL);
    return reply.status(201).send({
      documentId: id,
      uploadUrl: signed.url,
      headers: signed.headers,
      expiresAt: new Date(Date.now() + UPLOAD_TTL * 1000).toISOString(),
    });
  });

  /** Step 2: after the PUT, confirm the object really is in S3 before the document is listed. */
  app.post('/v1/documents/:id/complete', { preHandler: writers }, async (request) => {
    const d = await load(authOf(request).tenantId, (request.params as { id: string }).id);
    if (d.status === 'READY') return toDocument(d);
    const size = await objectStore().head(d.objectKey);
    if (size === null) throw new ApiError(409, 'UPLOAD_MISSING', 'The file has not arrived yet — try the upload again');
    // S3 enforces the signed length, but not every S3-compatible store does; check it ourselves so
    // a file bigger than the one that was approved never becomes a listed document.
    if (size !== d.sizeBytes) {
      await objectStore().delete(d.objectKey);
      await documents.deleteDocument(d.id);
      throw new ApiError(409, 'UPLOAD_SIZE_MISMATCH', 'The uploaded file is not the one that was approved — upload it again');
    }
    await documents.markReady(d.id, size);
    return toDocument({ ...d, status: 'READY', sizeBytes: size });
  });

  app.get('/v1/documents', { preHandler: readers }, async (request) => {
    const auth = authOf(request);
    const q = request.query as { entityType?: DocEntityType; entityId?: string };
    if (!q.entityType || !q.entityId) throw new ApiError(400, 'VALIDATION_FAILED', 'entityType and entityId are required');
    if (!(await ownsEntity(auth.tenantId, q.entityType, q.entityId))) throw notFound(q.entityType.toLowerCase());
    const items = await documents.listForEntity(q.entityType, q.entityId);
    return { items: items.map(toDocument) };
  });

  app.get('/v1/documents/:id/download-url', { preHandler: readers }, async (request) => {
    const d = await load(authOf(request).tenantId, (request.params as { id: string }).id);
    if (d.status !== 'READY') throw notFound('Document');
    return {
      url: await objectStore().presignGet(d.objectKey, d.fileName, DOWNLOAD_TTL),
      expiresAt: new Date(Date.now() + DOWNLOAD_TTL * 1000).toISOString(),
    };
  });

  app.delete('/v1/documents/:id', { preHandler: requireUser('OWNER', 'ADMIN', 'DISPATCHER') }, async (request, reply) => {
    const d = await load(authOf(request).tenantId, (request.params as { id: string }).id);
    await objectStore().delete(d.objectKey);
    await documents.deleteDocument(d.id);
    return reply.status(204).send();
  });
}
