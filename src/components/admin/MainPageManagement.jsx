import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { getMainImages, saveMainImageInfo, deleteMainImage, updateMainImagesOrder } from '../../services/imageService';
import { getPresignedUrl } from '../../services/r2Service';
import './MainPageManagement.css';

const MainPageManagement = () => {
  const [mainImages, setMainImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMainImages();
  }, []);

  const fetchMainImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const images = await getMainImages();
      setMainImages(images);
    } catch (error) {
      console.error('메인 이미지들 로딩 중 오류:', error);
      setError('메인 이미지를 불러오는 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      
      // R2에 이미지 업로드하고 실제 URL 받기
      const imageUrl = await getPresignedUrl(file);
      
      // Firebase에 이미지 정보 저장 (실제 업로드된 URL 사용)
      const order = mainImages.length; // 마지막 순서로 추가
      await saveMainImageInfo({
        url: imageUrl, // 실제 업로드된 URL 사용
        fileName: file.name,
        title: file.name,
        description: '메인페이지 슬라이드 이미지'
      }, order);

      // 목록 새로고침
      await fetchMainImages();
      
      // 파일 입력 초기화
      event.target.value = '';
      
      alert('이미지가 성공적으로 업로드되었습니다!');
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId, event) => {
    // 이벤트 전파 방지 (드래그 방해하지 않도록)
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (!window.confirm('이 이미지를 삭제하시겠습니까?')) return;

    try {
      await deleteMainImage(imageId);
      await fetchMainImages();
      alert('이미지가 삭제되었습니다.');
    } catch (error) {
      console.error('이미지 삭제 실패:', error);
      alert('이미지 삭제에 실패했습니다: ' + error.message);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(mainImages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 즉시 UI 업데이트
    setMainImages(items);

    try {
      // 서버에 순서 업데이트
      await updateMainImagesOrder(items);
    } catch (error) {
      console.error('순서 업데이트 실패:', error);
      // 실패 시 원래 순서로 복구
      await fetchMainImages();
    }
  };

  if (loading) {
    return <div className="admin-loading">로딩 중...</div>;
  }

  return (
    <div className="mainpage-management">
      <h1>메인페이지 관리</h1>
      
      <div className="upload-section">
        <h2>새 이미지 업로드</h2>
        <div className="upload-info">
          <p>메인페이지 슬라이드에 표시될 이미지를 업로드하세요.</p>
          <p>권장 이미지 크기: 1920x1080px 이상</p>
          <p>업로드 후 드래그 앤 드롭으로 순서를 변경할 수 있습니다.</p>
        </div>
        
        <div className="file-upload-container">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="file-input"
          />
          {uploading && <div className="upload-progress">업로드 중...</div>}
        </div>
      </div>

      <div className="current-images-section">
        <h2>현재 메인 이미지들 ({mainImages.length}개)</h2>
        {error && <div className="error-message">{error}</div>}
        
        {mainImages.length === 0 ? (
          <div className="no-images-message">
            <p>현재 설정된 메인 이미지가 없습니다.</p>
            <p>위에서 이미지를 업로드해주세요.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable 
              droppableId="main-images" 
              isDropDisabled={false}
              isCombineEnabled={false}
            >
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="images-grid"
                >
                  {mainImages.map((image, index) => (
                    <Draggable key={image.id} draggableId={image.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`image-item ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <div className="image-order">{index + 1}</div>
                          <img src={image.url} alt={image.title} />
                          <div className="image-info">
                            <p className="image-title">{image.title}</p>
                            <p className="image-date">
                              {image.createdAt?.toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            className="delete-button"
                            onClick={(event) => handleDeleteImage(image.id, event)}
                            title="이미지 삭제"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      <div className="instructions-section">
        <h2>사용 안내</h2>
        <ul>
          <li>메인페이지에서 슬라이드로 표시될 이미지들을 관리할 수 있습니다.</li>
          <li>드래그 앤 드롭으로 이미지 순서를 변경하세요.</li>
          <li>× 버튼을 클릭하여 개별 이미지를 삭제할 수 있습니다.</li>
          <li>업로드 가능한 형식: JPG, PNG, GIF</li>
          <li>최대 파일 크기: 10MB</li>
        </ul>
      </div>
    </div>
  );
};

export default MainPageManagement; 