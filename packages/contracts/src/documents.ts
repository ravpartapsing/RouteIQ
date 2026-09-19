import { z } from 'zod';

export const DocEntityType = z.enum(['DRIVER', 'TRUCK', 'TRAILER', 'CUSTOMER', 'LOCATION']);
export type DocEntityType = z.infer<typeof DocEntityType>;

export const DocType = z.enum([
  'BOL',
  'POD',
  'RATE_CON',
  'INVOICE',
  'CDL',
  'MEDICAL_CARD',
  'REGISTRATION',
  'INSURANCE',
  'INSPECTION',
  'LEASE',
  'W9',
  'OTHER',
]);
export type DocType = z.infer<typeof DocType>;

/** What the browser or phone may upload. Anything else is refused before a URL is signed. */
export const DOC_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'] as const;
export const DOC_MAX_BYTES = 20 * 1024 * 1024;

export const UploadUrlRequest = z.object({
  entityType: DocEntityType,
  entityId: z.string().min(1),
  docType: DocType,
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(DOC_CONTENT_TYPES, { message: 'PDF, JPEG, PNG, HEIC or WebP only' }),
  sizeBytes: z.number().int().min(1).max(DOC_MAX_BYTES, 'Files up to 20 MB'),
});
export type UploadUrlRequest = z.infer<typeof UploadUrlRequest>;

export const UploadUrlResponse = z.object({
  documentId: z.string(),
  uploadUrl: z.string(),
  /** Headers the PUT must send exactly, or the signature will not match. */
  headers: z.record(z.string()),
  expiresAt: z.string(),
});
export type UploadUrlResponse = z.infer<typeof UploadUrlResponse>;

export const Document = z.object({
  id: z.string(),
  entityType: DocEntityType,
  entityId: z.string(),
  docType: DocType,
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
  status: z.enum(['PENDING', 'READY']),
  uploadedBy: z.object({ kind: z.enum(['USER', 'DRIVER']), id: z.string(), name: z.string() }),
  createdAt: z.string(),
});
export type Document = z.infer<typeof Document>;

export const DownloadUrlResponse = z.object({ url: z.string(), expiresAt: z.string() });
export type DownloadUrlResponse = z.infer<typeof DownloadUrlResponse>;
