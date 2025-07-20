import { useState, useRef } from 'react';
import { imageService } from '../services/imageService';
import './ImageUploader.css';

export default function ImageUploader({ 
  onUploadComplete, 
  multiple = false, 
  maxFiles = 100,
  showPreview = true,
  acceptedTypes = "image/jpeg,image/jpg,image/png,image/webp,image/gif"
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImages, setPreviewImages] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    
    if (!files.length) return;
    
    // 파일 수 제한 확인
    if (multiple && files.length > maxFiles) {
      setError(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // 파일 검증
      files.forEach(file => imageService.validateImageFile(file));

      // 미리보기 생성
      if (showPreview) {
        const previews = files.map(file => ({
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name
        }));
        setPreviewImages(previews);
      }

      let result;
      
      if (multiple && files.length > 1) {
        // 다중 파일 업로드
        result = await imageService.uploadMultipleImages(files, {
          uploadedAt: new Date().toISOString(),
          source: 'admin-panel'
        });
        
        setUploadProgress(100);
        
        if (result.success && onUploadComplete) {
          onUploadComplete(result.images);
        }
      } else {
        // 단일 파일 업로드
        result = await imageService.uploadImage(files[0], {
          uploadedAt: new Date().toISOString(),
          source: 'admin-panel'
        });
        
        setUploadProgress(100);
        
        if (result.success && onUploadComplete) {
          onUploadComplete(multiple ? [result] : result);
        }
      }

    } catch (error) {
      console.error('파일 업로드 실패:', error);
      setError(error.message || '파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      
      // 미리보기 정리
      if (showPreview) {
        previewImages.forEach(preview => {
          URL.revokeObjectURL(preview.previewUrl);
        });
        setPreviewImages([]);
      }
      
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = Array.from(event.dataTransfer.files);
    
    // 이미지 파일만 필터링
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 임시로 파일 입력에 설정하여 기존 로직 재사용
    const dataTransfer = new DataTransfer();
    imageFiles.forEach(file => dataTransfer.items.add(file));
    
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
      handleFileSelect({ target: { files: dataTransfer.files } });
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="admin-image-uploader">
      <div 
        className={`admin-upload-area ${uploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        
        {uploading ? (
          <div className="admin-upload-status">
            <div className="admin-upload-spinner"></div>
            <p>업로드 중... {uploadProgress}%</p>
            {uploadProgress > 0 && (
              <div className="admin-progress-bar">
                <div 
                  className="admin-progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        ) : (
          <div className="admin-upload-placeholder">
            <p>
              {multiple 
                ? `클릭하여 이미지를 업로드`
                : '클릭하여 이미지를 업로드'
              }
            </p>
            <small>JPG, PNG, WebP, GIF 지원 (최대 2MB)</small>
          </div>
        )}
      </div>

      {error && (
        <div className="admin-upload-error">
          ⚠️ {error}
        </div>
      )}

      {showPreview && previewImages.length > 0 && (
        <div className="admin-preview-container">
          <h4>업로드 미리보기</h4>
          <div className="admin-preview-grid">
            {previewImages.map((preview, index) => (
              <div key={index} className="admin-preview-item">
                <img 
                  src={preview.previewUrl} 
                  alt={`미리보기 ${index + 1}`} 
                  className="admin-preview-image"
                />
                <span className="admin-preview-name">{preview.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 