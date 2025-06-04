import React, { useRef } from 'react';
import { saveImageInfo } from '../services/imageService';
import { getPresignedUrl } from '../services/r2Service';
import './ImageUploader.css';

const ImageUploader = ({ onUploadSuccess }) => {
  const fileInputRef = useRef(null);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Get pre-signed URL and upload
      const uploadedUrl = await getPresignedUrl(file);

      // Firebase에 이미지 정보 저장 (실제 업로드된 URL 사용)
      await saveImageInfo({
        url: uploadedUrl, // 실제 업로드된 URL 사용
        fileName: file.name,
        title: file.name,
        description: '업로드된 이미지',
        category: 'main'
      });

      alert('업로드 성공!');
      
      // 입력 필드 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // 성공 콜백 호출 (있는 경우)
      if (onUploadSuccess) {
        onUploadSuccess();
      } else {
        // 페이지 새로고침하여 새 이미지 표시 (기본 동작)
        window.location.reload();
      }
      
    } catch (error) {
      console.error('Upload error details:', error);
      alert('업로드 실패: ' + error.message);
    }
  };

  return (
    <div className="uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
      />
    </div>
  );
};

export default ImageUploader; 