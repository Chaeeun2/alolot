import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getMainImages, saveMainImageInfo, deleteMainImage, updateMainImagesOrder } from '../../services/imageService';
import { getPresignedUrl } from '../../services/r2Service';
import './MainPageManagement.css';

// 파일 크기 제한 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 이미지 압축 함수
const compressImage = (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // 원본 비율 유지하면서 크기 조정
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const newWidth = img.width * ratio;
      const newHeight = img.height * ratio;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      canvas.toBlob((blob) => {
        const compressedFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      }, file.type, quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// 파일 크기 검증 함수
const validateFileSize = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / (1024 * 1024)}MB까지 업로드 가능합니다.`);
  }
};

// SortableItem 컴포넌트
const SortableItem = ({ id, children, className, data }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={className}>
      {children}
    </div>
  );
};

const MainPageManagement = () => {
  const [mainImages, setMainImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // DnD sensors 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      
      // 파일 크기 검증
      validateFileSize(file);
      
      // 이미지 압축
      const compressedFile = await compressImage(file);
      
      // R2에 압축된 이미지 업로드하고 실제 URL 받기
      const imageUrl = await getPresignedUrl(compressedFile);
      
      // Firebase에 이미지 정보 저장 (실제 업로드된 URL 사용)
      const order = mainImages.length; // 마지막 순서로 추가
      await saveMainImageInfo({
        url: imageUrl, // 실제 업로드된 URL 사용
        fileName: compressedFile.name,
        title: compressedFile.name,
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

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = mainImages.findIndex(image => image.id === active.id);
      const newIndex = mainImages.findIndex(image => image.id === over.id);
      
      const newItems = arrayMove(mainImages, oldIndex, newIndex);

      // 즉시 UI 업데이트
      setMainImages(newItems);

      try {
        // 서버에 순서 업데이트
        await updateMainImagesOrder(newItems);
      } catch (error) {
        console.error('순서 업데이트 실패:', error);
        // 실패 시 원래 순서로 복구
        await fetchMainImages();
      }
    }
  };

  if (loading) {
    return <div className="admin-loading">로딩 중...</div>;
  }

  return (
    <div className="mainpage-management">
      <div className="mainpage-header">
        <h1>메인페이지 관리</h1>
      </div>
      
      <div className="mainpage-section">
        <h2>새 이미지 업로드</h2>
        
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

      <div className="mainpage-section">
        <h2>현재 메인 이미지들 ({mainImages.length}개)</h2>
        {error && <div className="error-message">{error}</div>}
        
        {mainImages.length === 0 ? (
          <div className="no-images-message">
            <p>현재 설정된 메인 이미지가 없습니다.</p>
            <p>위에서 이미지를 업로드해주세요.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={mainImages.map(image => image.id)}
              strategy={rectSortingStrategy}
            >
              <div className="images-grid">
                {mainImages.map((image, index) => (
                  <SortableItem
                    key={image.id}
                    id={image.id}
                    className="image-item"
                    data={{ type: 'main-image' }}
                  >
                    <img src={image.url} alt={image.title} />
                    <button
                      className="img-delete-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteImage(image.id, event);
                      }}
                       onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
                       onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
                       onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
                      title="이미지 삭제"
                    >
                      ×
                    </button>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default MainPageManagement; 