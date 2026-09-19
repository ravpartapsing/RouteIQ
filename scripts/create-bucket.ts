/** Creates the local S3 bucket in LocalStack, with the CORS the portal needs to upload directly. Idempotent. */
import { CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';

const bucket = process.env['S3_BUCKET'] ?? 'routeiq-documents-local';
const s3 = new S3Client({
  endpoint: process.env['S3_ENDPOINT'] ?? 'http://localhost:4666',
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

try {
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`bucket ${bucket} exists`);
} catch {
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`created bucket ${bucket}`);
}
// Same rule as the deployed bucket (infra/terraform/envs/dev/main.tf).
await s3.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [{ AllowedMethods: ['GET', 'PUT'], AllowedOrigins: ['http://localhost:5173'], AllowedHeaders: ['*'], MaxAgeSeconds: 3000 }],
    },
  }),
);
console.log('cors set for http://localhost:5173');
