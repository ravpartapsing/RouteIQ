import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DOC_CONTENT_TYPES,
  DOC_MAX_BYTES,
  type DocEntityType,
  type DocType,
  type Document,
  type DownloadUrlResponse,
  type UploadUrlResponse,
} from '@routeiq/contracts';
import { request } from '../lib/api';
import { Alert, Button } from './ui';

const LABEL: Record<DocType, string> = {
  BOL: 'Bill of lading',
  POD: 'Proof of delivery',
  RATE_CON: 'Rate confirmation',
  INVOICE: 'Invoice',
  CDL: 'CDL',
  MEDICAL_CARD: 'Medical card',
  REGISTRATION: 'Registration',
  INSURANCE: 'Insurance',
  INSPECTION: 'Inspection',
  LEASE: 'Lease',
  W9: 'W-9',
  OTHER: 'Other',
};

const size = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/**
 * Upload is three steps and the file never touches our API: ask for a signed URL, PUT the bytes
 * straight to S3, then confirm so the server checks the object arrived at the approved size.
 */
export function DocumentsPanel({ entityType, entityId, types }: { entityType: DocEntityType; entityId: string; types: DocType[] }) {
  const [items, setItems] = useState<Document[] | null>(null);
  const [docType, setDocType] = useState<DocType>(types[0] ?? 'OTHER');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    request<{ items: Document[] }>('GET', `/v1/documents?entityType=${entityType}&entityId=${entityId}`)
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message));
  }, [entityType, entityId]);
  useEffect(load, [load]);

  async function upload(file: File) {
    setError(null);
    if (!(DOC_CONTENT_TYPES as readonly string[]).includes(file.type)) return setError('PDF, JPEG, PNG, HEIC or WebP only.');
    if (file.size > DOC_MAX_BYTES) return setError('Files up to 20 MB.');
    setBusy(`Uploading ${file.name}…`);
    try {
      const signed = await request<UploadUrlResponse>('POST', '/v1/documents/upload-url', {
        entityType,
        entityId,
        docType,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      const put = await fetch(signed.uploadUrl, { method: 'PUT', headers: signed.headers, body: file });
      if (!put.ok) throw new Error(`Storage refused the upload (${put.status})`);
      await request('POST', `/v1/documents/${signed.documentId}/complete`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = '';
    }
  }

  async function open(d: Document) {
    try {
      const r = await request<DownloadUrlResponse>('GET', `/v1/documents/${d.id}/download-url`);
      window.open(r.url, '_blank', 'noopener');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(d: Document) {
    if (!confirm(`Delete ${d.fileName}? This cannot be undone.`)) return;
    try {
      await request('DELETE', `/v1/documents/${d.id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">Documents</h3>
        <div className="flex items-center gap-2">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocType)}
            className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm"
            aria-label="Document type"
          >
            {types.map((t) => (
              <option key={t} value={t}>{LABEL[t]}</option>
            ))}
          </select>
          <Button variant="secondary" busy={!!busy} onClick={() => input.current?.click()}>Upload</Button>
          <input
            ref={input}
            type="file"
            hidden
            accept={DOC_CONTENT_TYPES.join(',')}
            onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
          />
        </div>
      </div>
      {error && <div className="mb-2"><Alert>{error}</Alert></div>}
      {busy && <p className="mb-2 text-sm text-gray-500">{busy}</p>}
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {items === null && <li className="px-4 py-3 text-sm text-gray-400">Loading…</li>}
        {items?.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500">No documents yet.</li>}
        {items?.map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-gray-100 text-[10px] font-semibold text-gray-500">
              {d.contentType === 'application/pdf' ? 'PDF' : 'IMG'}
            </span>
            <div className="min-w-0 flex-1">
              <button onClick={() => void open(d)} className="block truncate text-left font-medium text-accent-600 hover:underline">
                {d.fileName}
              </button>
              <p className="text-xs text-gray-500">
                {LABEL[d.docType]} · {size(d.sizeBytes)} · {new Date(d.createdAt).toLocaleDateString()} by {d.uploadedBy.name}
              </p>
            </div>
            <Button variant="ghost" onClick={() => void remove(d)} aria-label={`Delete ${d.fileName}`}>Delete</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
