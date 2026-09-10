/** Creates the local S3 bucket in LocalStack. Idempotent. */
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

const bucket = process.env['S3_BUCKET'] ?? 'routeiq-documents-local';
const s3 = new S3Client({
  endpoint: process.env['S3_ENDPOINT'] ?? 'http://localhost:4666',
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

try {
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`bucket ${bucket} already exists — nothing to do`);
} catch {
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`created bucket ${bucket}`);
}
