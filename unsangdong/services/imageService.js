// Cloudflare R2 스토리지 서비스
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 설정
const R2_ACCOUNT_ID = process.env.REACT_APP_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.REACT_APP_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.REACT_APP_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.REACT_APP_R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.REACT_APP_R2_PUBLIC_URL || `https://pub-${R2_ACCOUNT_ID}.r2.dev`;

// S3 클라이언트 설정 (R2 호환)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export const imageService = {
  // 고유한 파일 이름 생성
  generateFileName(file, prefix = '') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    return `${prefix}${timestamp}-${randomString}.${extension}`;
  },

  // 이미지 업로드 (단일)
  async uploadImage(file, metadata = {}) {
    try {
      // 파일 검증
      this.validateImageFile(file);
      
      // 고유한 파일명 생성
      const fileName = this.generateFileName(file, metadata.prefix || '');
      const key = `images/${fileName}`;

      // 브라우저 환경에서 File을 ArrayBuffer로 변환
      const arrayBuffer = await file.arrayBuffer();

      // 파일명을 안전하게 인코딩 (한국어 처리) - 브라우저 호환
      const safeOriginalName = btoa(encodeURIComponent(file.name));
      
      // R2에 업로드
      const uploadCommand = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: arrayBuffer,
        ContentType: file.type,
        Metadata: {
          originalName: safeOriginalName, // Base64로 인코딩된 파일명
          uploadedAt: new Date().toISOString(),
          source: metadata.source || 'admin-panel',
                     // 추가 메타데이터도 안전하게 처리 - 브라우저 호환
           ...(metadata && Object.keys(metadata).reduce((acc, key) => {
             const value = metadata[key];
             if (typeof value === 'string') {
               // 문자열 값은 ASCII 문자만 포함하는지 확인
               acc[key] = /^[\x00-\x7F]*$/.test(value) ? value : btoa(encodeURIComponent(value));
             } else {
               acc[key] = value;
             }
             return acc;
           }, {}))
        }
      });

      await r2Client.send(uploadCommand);

      // 공개 URL 생성
      const publicUrl = `${R2_PUBLIC_URL}/${key}`;
      
      return {
        success: true,
        imageId: fileName.split('.')[0], // 확장자 제외한 파일명을 ID로 사용
        fileName: fileName,
        key: key,
        imageUrl: publicUrl,
        publicUrl: publicUrl,
        thumbnailUrl: publicUrl, // R2에서는 별도 썸네일 생성 안함 (필요시 변환 서비스 추가)
        originalUrl: publicUrl
      };
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      throw error;
    }
  },

  // 일반 파일 업로드 (이미지 검증 없음)
  async uploadFile(file, metadata = {}) {
    try {
      // 고유한 파일명 생성
      const fileName = this.generateFileName(file, metadata.prefix || '');
      const key = `files/${fileName}`;

      // 브라우저 환경에서 File을 ArrayBuffer로 변환
      const arrayBuffer = await file.arrayBuffer();

      // 파일명을 안전하게 인코딩 (한국어 처리) - 브라우저 호환
      const safeOriginalName = btoa(encodeURIComponent(file.name));
      
      // R2에 업로드
      const uploadCommand = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: arrayBuffer,
        ContentType: file.type || 'application/octet-stream',
        Metadata: {
          originalName: safeOriginalName, // Base64로 인코딩된 파일명
          uploadedAt: new Date().toISOString(),
          source: metadata.source || 'admin-panel',
          // 추가 메타데이터도 안전하게 처리 - 브라우저 호환
          ...(metadata && Object.keys(metadata).reduce((acc, key) => {
            const value = metadata[key];
            if (typeof value === 'string') {
              // 문자열 값은 ASCII 문자만 포함하는지 확인
              acc[key] = /^[\x00-\x7F]*$/.test(value) ? value : btoa(encodeURIComponent(value));
            } else {
              acc[key] = value;
            }
            return acc;
          }, {}))
        }
      });

      await r2Client.send(uploadCommand);

      // 공개 URL 생성
      const publicUrl = `${R2_PUBLIC_URL}/${key}`;
      
      return {
        success: true,
        fileId: fileName.split('.')[0], // 확장자 제외한 파일명을 ID로 사용
        fileName: fileName,
        key: key,
        fileUrl: publicUrl,
        publicUrl: publicUrl,
        originalUrl: publicUrl
      };
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      throw error;
    }
  },

  // 다중 이미지 업로드
  async uploadMultipleImages(files, metadata = {}) {
    try {
      const uploadPromises = files.map(async (file, index) => {
        return await this.uploadImage(file, { ...metadata, prefix: `batch-${index}-` });
      });
      
      const results = await Promise.all(uploadPromises);
      return {
        success: true,
        images: results
      };
    } catch (error) {
      console.error('다중 이미지 업로드 오류:', error);
      throw error;
    }
  },

  // 이미지 삭제 (파일명 또는 키로)
  async deleteImage(keyOrFileName) {
    try {
      // 키 형태가 아니면 images/ 경로 추가
      const key = keyOrFileName.includes('/') ? keyOrFileName : `images/${keyOrFileName}`;
      
      const deleteCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key
      });

      await r2Client.send(deleteCommand);
      return { success: true };
    } catch (error) {
      console.error('이미지 삭제 오류:', error);
      throw error;
    }
  },

  // 다중 이미지 삭제
  async deleteMultipleImages(keysOrFileNames) {
    try {
      const deletePromises = keysOrFileNames.map(async (keyOrFileName) => {
        try {
          return await this.deleteImage(keyOrFileName);
        } catch (error) {
          console.warn(`이미지 삭제 실패: ${keyOrFileName}`, error);
          return { success: false, error: error.message, key: keyOrFileName };
        }
      });
      
      const results = await Promise.all(deletePromises);
      const successCount = results.filter(result => result.success).length;
      
      return {
        success: successCount > 0,
        results: results,
        successCount: successCount,
        totalCount: keysOrFileNames.length
      };
    } catch (error) {
      console.error('다중 이미지 삭제 오류:', error);
      throw error;
    }
  },

  // URL에서 키 추출하는 헬퍼 함수
  extractKeyFromUrl(fileUrl) {
    if (!fileUrl) return null;
    
    try {
      // R2 Public URL에서 키 추출
      const url = new URL(fileUrl);
      let key = url.pathname.substring(1); // 맨 앞의 '/' 제거
      
      // 이미 images/ 또는 files/로 시작하면 그대로 사용
      if (key.startsWith('images/') || key.startsWith('files/')) {
        return key;
      }
      
      // 폴더 경로가 없으면 images/를 기본으로 추가 (기존 호환성)
      return `images/${key}`;
    } catch (error) {
      console.warn('URL에서 키 추출 실패:', fileUrl, error);
      return null;
    }
  },

  // 이미지 목록 조회
  async getImages(prefix = 'images/', maxKeys = 50) {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: maxKeys
      });

      const response = await r2Client.send(listCommand);
      
      const images = (response.Contents || []).map(object => ({
        key: object.Key,
        fileName: object.Key.split('/').pop(),
        publicUrl: `${R2_PUBLIC_URL}/${object.Key}`,
        size: object.Size,
        lastModified: object.LastModified,
        etag: object.ETag
      }));

      return {
        success: true,
        images: images,
        pagination: {
          totalCount: images.length,
          isTruncated: response.IsTruncated || false,
          nextContinuationToken: response.NextContinuationToken
        }
      };
    } catch (error) {
      console.error('이미지 목록 조회 오류:', error);
      throw error;
    }
  },

  // 이미지 URL 생성
  generateImageUrl(keyOrFileName) {
    const key = keyOrFileName.includes('/') ? keyOrFileName : `images/${keyOrFileName}`;
    return `${R2_PUBLIC_URL}/${key}`;
  },

  // 임시 서명된 URL 생성 (Private 버킷용)
  async generateSignedUrl(keyOrFileName, expiresIn = 3600) {
    try {
      const key = keyOrFileName.includes('/') ? keyOrFileName : `images/${keyOrFileName}`;
      
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key
      });

      const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('서명된 URL 생성 오류:', error);
      throw error;
    }
  },

  // 이미지 변환 URL 생성 (Cloudflare Transform 사용시)
  generateTransformUrl(keyOrFileName, options = {}) {
    const { width, height, quality = 85, format = 'auto', fit = 'scale-down' } = options;
    const imageUrl = this.generateImageUrl(keyOrFileName);
    
    // Cloudflare Transform API 사용 (별도 설정 필요)
    if (width || height || quality !== 85 || format !== 'auto') {
      const params = [];
      if (width) params.push(`width=${width}`);
      if (height) params.push(`height=${height}`);
      if (quality !== 85) params.push(`quality=${quality}`);
      if (format !== 'auto') params.push(`format=${format}`);
      if (fit !== 'scale-down') params.push(`fit=${fit}`);
      
      // Cloudflare Transform을 사용하는 경우 (Workers나 별도 변환 서비스 필요)
      return `${imageUrl}?${params.join('&')}`;
    }
    
    return imageUrl;
  },

  // 파일 검증
  validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 2 * 1024 * 1024; // 2MB (2,097,152 bytes)

    if (!allowedTypes.includes(file.type)) {
      throw new Error('지원되지 않는 이미지 형식입니다. (JPG, PNG, WebP, GIF만 허용)');
    }

    if (file.size > maxSize) {
      throw new Error('이미지 크기가 너무 큽니다. (최대 2MB)');
    }

    return true;
  },

  // 메타데이터에서 원본 파일명 디코딩 - 브라우저 호환
  decodeOriginalFileName(encodedName) {
    try {
      if (!encodedName) return null;
      // Base64로 인코딩된 파일명을 디코딩
      return decodeURIComponent(atob(encodedName));
    } catch (error) {
      console.warn('파일명 디코딩 실패:', error);
      return encodedName; // 디코딩 실패시 원본 반환
    }
  },

  // 문자열이 안전한 ASCII 문자열인지 확인
  isAsciiSafe(str) {
    return /^[\x00-\x7F]*$/.test(str);
  },

  // 문자열을 안전하게 인코딩 - 브라우저 호환
  encodeMetadataValue(value) {
    if (typeof value !== 'string') return value;
    return this.isAsciiSafe(value) ? value : btoa(encodeURIComponent(value));
  },

  // 인코딩된 메타데이터 값을 디코딩 - 브라우저 호환
  decodeMetadataValue(value) {
    if (typeof value !== 'string') return value;
    try {
      // Base64로 인코딩된 값인지 확인하고 디코딩
      if (!this.isAsciiSafe(value)) {
        return decodeURIComponent(atob(value));
      }
      return value;
    } catch (error) {
      return value; // 디코딩 실패시 원본 반환
    }
  }
}; 