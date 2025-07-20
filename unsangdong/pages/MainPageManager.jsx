import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import ImageUploader from '../components/ImageUploader';
import { imageService } from '../services/imageService';
import { mainImageService } from '../services/dataService';

export default function MainPageManager() {
  const [horizontalImages, setHorizontalImages] = useState([]);
  const [verticalImages, setVerticalImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMainImages();
  }, []);

  async function loadMainImages() {
    try {
      setLoading(true);
      
      // Firebase에서 가로 이미지 로드
      const horizontalImagesData = await mainImageService.getMainImagesByType('horizontal');
      setHorizontalImages(horizontalImagesData);
      
      // Firebase에서 세로 이미지 로드
      const verticalImagesData = await mainImageService.getMainImagesByType('vertical');
      setVerticalImages(verticalImagesData);
      
    } catch (error) {
      console.error('메인 이미지 로딩 실패:', error);
      // 에러 발생 시 빈 배열로 초기화
      setHorizontalImages([]);
      setVerticalImages([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleHorizontalImageUpload(uploadResults) {
    try {
      setUploading(true);
      
      // 단일 결과인지 배열인지 확인하여 배열로 통일
      const results = Array.isArray(uploadResults) ? uploadResults : [uploadResults];
      
      // 모든 이미지를 Firebase에 저장
      for (const uploadResult of results) {
        await mainImageService.addMainImage({
          type: 'horizontal',
          fileName: uploadResult.fileName,
          imageUrl: uploadResult.imageUrl,
          r2Key: uploadResult.key,
          originalName: uploadResult.fileName,
          fileSize: 0, // 파일 크기 정보가 없으므로 0으로 설정
          contentType: 'image/jpeg' // 기본값으로 설정
        });
      }
      
      // 이미지 목록 다시 로드
      await loadMainImages();
      
    } catch (error) {
      console.error('가로 이미지 업로드 실패:', error);
      alert(`가로 이미지 업로드에 실패했습니다: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleVerticalImageUpload(uploadResults) {
    try {
      setUploading(true);
      
      // 단일 결과인지 배열인지 확인하여 배열로 통일
      const results = Array.isArray(uploadResults) ? uploadResults : [uploadResults];
      
      // 모든 이미지를 Firebase에 저장
      for (const uploadResult of results) {
        await mainImageService.addMainImage({
          type: 'vertical',
          fileName: uploadResult.fileName,
          imageUrl: uploadResult.imageUrl,
          r2Key: uploadResult.key,
          originalName: uploadResult.fileName,
          fileSize: 0, // 파일 크기 정보가 없으므로 0으로 설정
          contentType: 'image/jpeg' // 기본값으로 설정
        });
      }
      
      // 이미지 목록 다시 로드
      await loadMainImages();
      
    } catch (error) {
      console.error('세로 이미지 업로드 실패:', error);
      alert(`세로 이미지 업로드에 실패했습니다: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function deleteImage(imageData) {
    try {
      // 1. Cloudflare R2에서 이미지 삭제
      await imageService.deleteImage(imageData.r2Key);
      
      // 2. Firebase에서 이미지 정보 삭제
      await mainImageService.deleteMainImage(imageData.id);
      
      // 3. 이미지 목록 다시 로드
      await loadMainImages();

    } catch (error) {
      console.error('이미지 삭제 실패:', error);
      alert(`이미지 삭제에 실패했습니다: ${error.message}`);
    }
  }

  return (
    <AdminLayout>
      <div className="admin-content">
        <h2 className="admin-page-title">MAIN 관리</h2>
        <div className="admin-content-layout">
          <div className="admin-content-main">
            
            {/* 가로 이미지 섹션 */}
            <div className="admin-content-section" style={{paddingBottom: "0px"}}>
              <div className="admin-content-header">
                <h3 className="admin-content-title">가로 이미지 관리</h3>
                <p className="admin-content-description">
                  권장 비율: 3:2<br/>
                </p>
              </div>
              
              <div className="admin-upload-section">
                <ImageUploader
                  onUploadComplete={handleHorizontalImageUpload}
                  multiple={true}
                  maxFiles={100}
                  showPreview={true}
                />
                {uploading && <p>Firebase에 저장 중...</p>}
              </div>

              {/* 현재 가로 이미지 목록 */}
              <div className="admin-image-grid">
                <h4>현재 가로 이미지 ({horizontalImages.length}개)</h4>
                {loading ? (
                  <p>로딩 중...</p>
                ) : horizontalImages.length > 0 ? (
                  <div className="admin-image-grid-display">
                    {horizontalImages.map((image, index) => (
                      <div key={image.id} className="admin-image-item admin-image-item-horizontal">
                        <img src={image.imageUrl} alt={`가로 이미지 ${index + 1}`} />
                        <div className="admin-image-actions">
                          <button 
                            onClick={() => deleteImage(image)}
                            className="admin-button admin-button-danger"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="admin-no-images">업로드된 가로 이미지가 없습니다.</p>
                )}
              </div>
            </div>

          </div>
          
          <div className="admin-content-main">
              
            {/* 세로 이미지 섹션 */}
            <div className="admin-content-section" style={{paddingBottom: "0px"}}>
              <div className="admin-content-header">
                <h3 className="admin-content-title">세로 이미지 관리</h3>
                <p className="admin-content-description">
                  권장 비율: 3:4<br/>
                </p>
              </div>
              
              <div className="admin-upload-section">
                <ImageUploader
                  onUploadComplete={handleVerticalImageUpload}
                  multiple={true}
                  maxFiles={100}
                  showPreview={true}
                />
                {uploading && <p>Firebase에 저장 중...</p>}
              </div>

              {/* 현재 세로 이미지 목록 */}
              <div className="admin-image-grid">
                <h4>현재 세로 이미지 ({verticalImages.length}개)</h4>
                {loading ? (
                  <p>로딩 중...</p>
                ) : verticalImages.length > 0 ? (
                  <div className="admin-image-grid-display">
                    {verticalImages.map((image, index) => (
                      <div key={image.id} className="admin-image-item admin-image-item-vertical">
                        <img src={image.imageUrl} alt={`세로 이미지 ${index + 1}`} />
                        <div className="admin-image-actions">
                          <button 
                            onClick={() => deleteImage(image)}
                            className="admin-button admin-button-danger"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="admin-no-images">업로드된 세로 이미지가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 