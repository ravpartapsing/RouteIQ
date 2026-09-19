import { describe, expect, it } from 'vitest';
import { call, registerCarrier, useApp } from './helpers.js';
import { MemoryStore, objectStore } from '../src/lib/storage.js';

const getApp = useApp();

/** Pretend the browser PUT the file: the memory store's URL carries the object key. */
function simulateUpload(uploadUrl: string, bytes: number) {
  const store = objectStore() as MemoryStore;
  store.objects.set(uploadUrl.replace('memory://put/', ''), bytes);
}

async function setup() {
  const c = await registerCarrier(getApp());
  const t = c.tokens.accessToken;
  const truck = await call(getApp(), 'POST', '/v1/trucks', { token: t, body: { unitNumber: '42' } });
  return { c, t, truckId: truck.body.id as string };
}

const upload = (t: string, entityId: string, extra: Record<string, unknown> = {}) =>
  call(getApp(), 'POST', '/v1/documents/upload-url', {
    token: t,
    body: {
      entityType: 'TRUCK',
      entityId,
      docType: 'REGISTRATION',
      fileName: 'registration 2026.pdf',
      contentType: 'application/pdf',
      sizeBytes: 120_000,
      ...extra,
    },
  });

describe('documents', () => {
  it('sign → upload → complete → listed → download link', async () => {
    const { t, truckId } = await setup();
    const signed = await upload(t, truckId);
    expect(signed.status).toBe(201);
    expect(signed.body.headers['content-type']).toBe('application/pdf');

    // Not listed until the upload is confirmed.
    expect((await call(getApp(), 'GET', `/v1/documents?entityType=TRUCK&entityId=${truckId}`, { token: t })).body.items).toEqual([]);
    const early = await call(getApp(), 'POST', `/v1/documents/${signed.body.documentId}/complete`, { token: t });
    expect(early.status).toBe(409);

    simulateUpload(signed.body.uploadUrl, 120_000);
    const done = await call(getApp(), 'POST', `/v1/documents/${signed.body.documentId}/complete`, { token: t });
    expect(done.body).toMatchObject({ status: 'READY', sizeBytes: 120_000, uploadedBy: { name: 'Olive Owner' } });

    const list = await call(getApp(), 'GET', `/v1/documents?entityType=TRUCK&entityId=${truckId}`, { token: t });
    expect(list.body.items).toHaveLength(1);
    const dl = await call(getApp(), 'GET', `/v1/documents/${signed.body.documentId}/download-url`, { token: t });
    expect(dl.body.url).toContain('memory://get/');
  });

  it('rejects and deletes an upload that is not the size that was approved', async () => {
    const { t, truckId } = await setup();
    const signed = await upload(t, truckId);
    simulateUpload(signed.body.uploadUrl, 9_999_999);
    const res = await call(getApp(), 'POST', `/v1/documents/${signed.body.documentId}/complete`, { token: t });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('UPLOAD_SIZE_MISMATCH');
    expect((objectStore() as MemoryStore).objects.has(signed.body.uploadUrl.replace('memory://put/', ''))).toBe(false);
  });

  it('refuses executables and oversized files before signing anything', async () => {
    const { t, truckId } = await setup();
    expect((await upload(t, truckId, { contentType: 'application/x-msdownload' })).status).toBe(400);
    expect((await upload(t, truckId, { sizeBytes: 25 * 1024 * 1024 })).status).toBe(400);
  });

  it('keeps each carrier’s documents to itself', async () => {
    const { t, truckId } = await setup();
    const other = await registerCarrier(getApp());
    const signed = await upload(t, truckId);
    simulateUpload(signed.body.uploadUrl, 120_000);
    await call(getApp(), 'POST', `/v1/documents/${signed.body.documentId}/complete`, { token: t });

    const ot = other.tokens.accessToken;
    expect((await upload(ot, truckId)).status).toBe(404);
    expect((await call(getApp(), 'GET', `/v1/documents/${signed.body.documentId}/download-url`, { token: ot })).status).toBe(404);
    expect((await call(getApp(), 'GET', `/v1/documents?entityType=TRUCK&entityId=${truckId}`, { token: ot })).status).toBe(404);
    expect((await call(getApp(), 'DELETE', `/v1/documents/${signed.body.documentId}`, { token: ot })).status).toBe(404);
  });

  it('delete removes the file and the record', async () => {
    const { t, truckId } = await setup();
    const signed = await upload(t, truckId);
    simulateUpload(signed.body.uploadUrl, 120_000);
    await call(getApp(), 'POST', `/v1/documents/${signed.body.documentId}/complete`, { token: t });
    expect((await call(getApp(), 'DELETE', `/v1/documents/${signed.body.documentId}`, { token: t })).status).toBe(204);
    expect((objectStore() as MemoryStore).objects.has(signed.body.uploadUrl.replace('memory://put/', ''))).toBe(false);
    expect((await call(getApp(), 'GET', `/v1/documents?entityType=TRUCK&entityId=${truckId}`, { token: t })).body.items).toEqual([]);
  });
});
