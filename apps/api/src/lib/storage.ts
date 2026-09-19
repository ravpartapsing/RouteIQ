import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Document bytes never pass through Lambda: the API signs a short-lived URL and the browser or
 * phone talks to S3 directly. That keeps uploads off the 6 MB Lambda payload limit and off the
 * Lambda bill.
 */
export interface ObjectStore {
  presignPut(key: string, contentType: string, sizeBytes: number, ttlSeconds: number): Promise<{ url: string; headers: Record<string, string> }>;
  presignGet(key: string, fileName: string, ttlSeconds: number): Promise<string>;
  /** Size in bytes, or null if the object is not there. */
  head(key: string): Promise<number | null>;
  delete(key: string): Promise<void>;
}

class S3Store implements ObjectStore {
  private readonly s3: S3Client;
  constructor(private readonly bucket: string) {
    const endpoint = process.env['S3_ENDPOINT'];
    this.s3 = new S3Client({
      ...(endpoint ? { endpoint, forcePathStyle: process.env['S3_FORCE_PATH_STYLE'] === 'true' } : {}),
      region: process.env['AWS_REGION'] ?? 'us-east-1',
      // The SDK otherwise signs a CRC32 of the (empty) body into presigned PUT URLs, so every real
      // upload fails with "x-amz-checksum-crc32 header is invalid". Checksums only where S3 insists.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async presignPut(key: string, contentType: string, sizeBytes: number, ttl: number) {
    // Content type and length are part of the signature: the client cannot swap in a bigger file
    // or a different type than the one that was checked.
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType, ContentLength: sizeBytes });
    const url = await getSignedUrl(this.s3, cmd, { expiresIn: ttl, signableHeaders: new Set(['content-type', 'content-length']) });
    return { url, headers: { 'content-type': contentType } };
  }

  async presignGet(key: string, fileName: string, ttl: number) {
    const safe = fileName.replace(/[^\w.\- ]/g, '_');
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `inline; filename="${safe}"`,
    });
    return getSignedUrl(this.s3, cmd, { expiresIn: ttl });
  }

  async head(key: string) {
    try {
      const out = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return out.ContentLength ?? 0;
    } catch (e) {
      const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404 || status === 403) return null;
      throw e;
    }
  }

  async delete(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

/** In-memory stand-in for tests: records what was "uploaded" without any network. */
export class MemoryStore implements ObjectStore {
  readonly objects = new Map<string, number>();
  async presignPut(key: string, contentType: string) {
    return { url: `memory://put/${key}`, headers: { 'content-type': contentType } };
  }
  async presignGet(key: string) {
    return `memory://get/${key}`;
  }
  async head(key: string) {
    return this.objects.get(key) ?? null;
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
}

let store: ObjectStore | undefined;
export function objectStore(): ObjectStore {
  if (!store) {
    if (process.env['STORAGE'] === 'memory') store = new MemoryStore();
    else {
      const bucket = process.env['S3_BUCKET'];
      if (!bucket) throw new Error('S3_BUCKET is not set');
      store = new S3Store(bucket);
    }
  }
  return store;
}
