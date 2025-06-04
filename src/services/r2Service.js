import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const ACCOUNT_ID = process.env.REACT_APP_R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.REACT_APP_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.REACT_APP_R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.REACT_APP_R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.REACT_APP_R2_PUBLIC_URL;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME || !R2_PUBLIC_URL) {
  throw new Error('Missing required R2 configuration');
}

const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

export const getPresignedUrl = async (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  // 파일명에서 확장자 추출
  const fileExtension = file.name.split('.').pop();
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const key = `uploads/${timestamp}-${randomString}.${fileExtension}`;
  
  try {
    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
    });

    await S3.send(command);

    // 공개 URL 사용 (r2.dev 도메인) - key에 이미 uploads/ 포함되어 있음
    const finalUrl = `${R2_PUBLIC_URL}/${key}`;
    
    return finalUrl;
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    throw new Error(`파일 업로드 실패: ${error.message}`);
  }
};

// R2에서 파일 삭제
export const deleteFileFromR2 = async (fileUrl) => {
  if (!fileUrl) {
    throw new Error('No file URL provided');
  }

  try {
    // URL에서 key 추출
    // 예: https://pub-xxx.r2.dev/uploads/1748992295134-yzt5bh2lk7h.jpg
    // -> uploads/1748992295134-yzt5bh2lk7h.jpg
    const urlParts = fileUrl.split('/');
    const key = urlParts.slice(urlParts.indexOf('uploads')).join('/');
    
    if (!key || !key.startsWith('uploads/')) {
      throw new Error('Invalid file URL format');
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await S3.send(command);
    console.log('R2에서 파일 삭제 완료:', key);
    
    return true;
  } catch (error) {
    console.error('R2 파일 삭제 실패:', error);
    throw new Error(`R2 파일 삭제 실패: ${error.message}`);
  }
}; 