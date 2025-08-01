import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.REACT_APP_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.REACT_APP_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.REACT_APP_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.REACT_APP_R2_BUCKET_NAME;

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

export const getUploadUrl = async (key) => {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
};

export const getDownloadUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
}; 