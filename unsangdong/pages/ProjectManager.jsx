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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '../components/AdminLayout';
import { contentService, projectTypeService } from '../services/dataService';
import ImageUploader from '../components/ImageUploader';
import { imageService } from '../services/imageService';
import '../styles/admin.css';

// SortableItem 컴포넌트
function SortableItem({ id, imageUrl, index, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: 'none',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={`admin-detail-media-item ${isDragging ? 'dragging' : ''}`}
    >
      <img 
        src={imageUrl} 
        alt={`이미지 ${index + 1}`} 
        style={{ pointerEvents: 'none' }}
      />
      <div className="media-index">
        {index + 1}
      </div>
      <button 
        type="button" 
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        className="delete-media-button"
      >
        ×
      </button>
    </div>
  );
}

// SortableProjectItem 컴포넌트
function SortableProjectItem({ id, project, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: 'none',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      className={`admin-table-row ${isDragging ? 'dragging' : ''}`}
    >
      <div className="admin-table-cell admin-table-title">
        <div 
          className="admin-project-drag-handle"
          {...listeners}
        >
          ⠿
        </div>
        <div className="admin-project-title-info">
          <div className="admin-project-title-main">{project.title || '제목 없음'}</div>
          {project.titleEn && (
            <div className="admin-project-title-en">{project.titleEn}</div>
          )}
        </div>
      </div>
      <div className="admin-table-cell admin-table-year">
        {project.year || '-'}
      </div>
      <div className="admin-table-cell admin-table-type">
        {project.type || '-'}
      </div>
      <div className="admin-table-cell admin-table-actions">
        <button
          className="admin-button admin-button-secondary admin-button-small"
          onClick={() => onEdit(project)}
        >
          수정
        </button>
        <button
          className="admin-button admin-button-danger admin-button-small"
          onClick={() => onDelete(project.id)}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

// SortableTypeItem 컴포넌트
function SortableTypeItem({ id, type, onEdit, onDelete, isEditing, editingValue, onEditingChange, onEditingSubmit, onEditingCancel, loading }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px,0` : undefined,
    transition: 'none',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      className={`admin-type-item ${isDragging ? 'dragging' : ''}`}
    >
      <div 
        className="admin-type-drag-handle"
        {...listeners}
      >
        ⠿
      </div>
      {isEditing ? (
        <div className="admin-type-edit">
          <input
            type="text"
            value={editingValue}
            onChange={(e) => onEditingChange(e.target.value)}
            className="admin-input admin-input-small"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onEditingSubmit();
              } else if (e.key === 'Escape') {
                onEditingCancel();
              }
            }}
            onBlur={onEditingSubmit}
          />
        </div>
      ) : (
        <>
          <span className="admin-type-name">
            {type}
          </span>
          <div className="admin-type-actions">
            <button
              type="button"
              onClick={() => onEdit(type)}
              className="admin-button admin-button-secondary admin-button-small"
              disabled={loading}
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => onDelete(type)}
              className="admin-button admin-button-danger admin-button-small"
              disabled={loading}
            >
              삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Type 관리 모달 컴포넌트
function TypeManagementModal({ isOpen, onClose, category }) {
  const [typeOptions, setTypeOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newType, setNewType] = useState('');
  const [editingType, setEditingType] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [typeUsageMap, setTypeUsageMap] = useState({});

  // DnD 관련 상태
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 타입 순서 변경 처리
  const handleTypeDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = typeOptions.findIndex(type => type === active.id);
    const newIndex = typeOptions.findIndex(type => type === over.id);
    const newTypeOptions = arrayMove(typeOptions, oldIndex, newIndex);
    setTypeOptions(newTypeOptions);
    try {
      // Firebase에 새로운 순서 저장
      const allTypes = await projectTypeService.getProjectTypes();
      allTypes[category] = newTypeOptions;
      await projectTypeService.updateProjectTypes(allTypes);
    } catch (error) {
      console.error('타입 순서 업데이트 실패:', error);
      alert('타입 순서 업데이트에 실패했습니다.');
    }
  };

  // 타입 옵션 로드
  useEffect(() => {
    async function loadTypes() {
      if (isOpen) {
        try {
          setLoading(true);
          const types = await projectTypeService.getProjectTypes();
          const currentTypes = types[category] || [];
          setTypeOptions(currentTypes);
          
          // 각 타입의 사용 여부 확인
          const usageMap = {};
          for (const type of currentTypes) {
            usageMap[type] = await projectTypeService.isTypeInUse(category, type);
          }
          setTypeUsageMap(usageMap);
        } catch (error) {
          console.error('타입 로딩 실패:', error);
          setTypeOptions([]);
          setTypeUsageMap({});
        } finally {
          setLoading(false);
        }
      }
    }

    loadTypes();
  }, [isOpen, category]);

  // 새 타입 추가
  const handleAddType = async () => {
    if (!newType.trim() || typeOptions.includes(newType.trim())) {
      alert('이미 존재하는 타입이거나 빈 값입니다.');
      return;
    }

    try {
      setLoading(true);
      await projectTypeService.addProjectType(category, newType.trim());
      setTypeOptions(prev => [newType.trim(), ...prev]);
      setNewType('');
    } catch (error) {
      console.error('타입 추가 실패:', error);
      alert('타입 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 타입 수정
  const handleEditType = async (oldType, newTypeValue) => {
    if (!newTypeValue.trim() || newTypeValue === oldType) {
      setEditingType(null);
      setEditingValue('');
      return;
    }

    if (typeOptions.includes(newTypeValue.trim())) {
      alert('이미 존재하는 타입입니다.');
      return;
    }

    try {
      setLoading(true);
      await projectTypeService.updateProjectType(category, oldType, newTypeValue.trim());
      setTypeOptions(prev => prev.map(type => type === oldType ? newTypeValue.trim() : type));
      setEditingType(null);
      setEditingValue('');
    } catch (error) {
      console.error('타입 수정 실패:', error);
      alert('타입 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 타입 삭제
  const handleDeleteType = async (typeToDelete) => {
    try {
      setLoading(true);
      
      // 해당 타입이 사용 중인지 확인
      const isInUse = await projectTypeService.isTypeInUse(category, typeToDelete);
      
      if (isInUse) {
        alert(`"${typeToDelete}"은 현재 사용 중인 프로젝트가 있어 삭제할 수 없습니다.`);
        return;
      }

      await projectTypeService.removeProjectType(category, typeToDelete);
      setTypeOptions(prev => prev.filter(type => type !== typeToDelete));
    } catch (error) {
      console.error('타입 삭제 실패:', error);
      alert('타입 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{category} Type 관리</h3>
          <button className="admin-modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="admin-modal-body">
          {/* 새 타입 추가 섹션 */}
          <div className="admin-form-group">
            <label>새 타입 추가</label>
            <div className="admin-select-with-add">
              <input
                type="text"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="새 타입명을 입력하세요"
                className="admin-input"
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && handleAddType()}
              />
              <button
                type="button"
                onClick={handleAddType}
                className="admin-button admin-button-primary admin-button-small"
                disabled={loading || !newType.trim()}
              >
                추가
              </button>
            </div>
          </div>

          {/* 기존 타입 목록 */}
          <div className="admin-form-group" style={{ marginTop: '20px' }}>
            <label>기존 타입 목록</label>
            {loading ? (
              <p>로딩 중...</p>
            ) : typeOptions.length === 0 ? (
              <p>등록된 타입이 없습니다.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTypeDragEnd}>
                <SortableContext items={typeOptions} strategy={verticalListSortingStrategy}>
                  <div className="admin-type-list">
                    {typeOptions.map((type) => (
                      <SortableTypeItem
                        key={type}
                        id={type}
                        type={type}
                        onEdit={(type) => {
                          setEditingType(type);
                          setEditingValue(type);
                        }}
                        onDelete={handleDeleteType}
                        isEditing={editingType === type}
                        editingValue={editingValue}
                        onEditingChange={setEditingValue}
                        onEditingSubmit={() => handleEditType(type, editingValue)}
                        onEditingCancel={() => { setEditingType(null); setEditingValue(''); }}
                        loading={loading}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 프로젝트 추가 모달 컴포넌트
function ProjectModal({ isOpen, onClose, onSubmit, loading, category, title }) {
  const [formData, setFormData] = useState({
    title: '',
    titleEn: '',
    year: '',
    location: '',
    type: '',
    client: '',
    director: '',
    status: '',
    description: '',
    descriptionEn: '',
    thumbnailImage: '',
    galleryImages: [],
    videos: [],
    category: category
  });

  // 초기 폼 데이터 (변경 감지용)
  const [initialFormData, setInitialFormData] = useState(null);
  
  // 업로드된 이미지 추적 (삭제용)
  const [uploadedImages, setUploadedImages] = useState([]);

  // 타입 옵션 관리
  const [typeOptionsByCategory, setTypeOptionsByCategory] = useState({});
  const [loadingTypes, setLoadingTypes] = useState(true);

      // Firebase에서 프로젝트 타입 옵션 가져오기
  useEffect(() => {
    async function loadProjectTypes() {
      try {
        setLoadingTypes(true);
        const types = await projectTypeService.getProjectTypes();
        setTypeOptionsByCategory(types);
      } catch (error) {
        console.error('프로젝트 타입 로딩 실패:', error);
        // 에러 시 기본값 설정
        setTypeOptionsByCategory({
          Architecture: ['HOUSE', 'Commercial', 'Residential', 'Cultural', 'Office', 'Hotel', 'Restaurant'],
          Art: ['Exhibition', 'Artwork', 'Installation', 'Sculpture', 'Painting', 'Performance'],
          Design: ['Interior', 'Furniture', 'Product', 'Branding', 'Graphic', 'Web']
        });
      } finally {
        setLoadingTypes(false);
      }
    }

    if (isOpen) {
      loadProjectTypes();
      // 모달이 열릴 때 초기 데이터 설정
      const initialData = {
        title: '',
        titleEn: '',
        year: '',
        location: '',
        type: '',
        client: '',
        director: '',
        status: '',
        description: '',
        descriptionEn: '',
        thumbnailImage: '',
        galleryImages: [],
        videos: [],
        category: category
      };
      setInitialFormData(initialData);
      setUploadedImages([]);
    }
  }, [isOpen, category]);

  // 폼 데이터가 변경되었는지 확인
  const hasFormChanged = () => {
    if (!initialFormData) return false;
    
    // 기본 필드들 비교
    const basicFieldsChanged = Object.keys(initialFormData).some(key => {
      if (Array.isArray(initialFormData[key])) {
        return JSON.stringify(formData[key]) !== JSON.stringify(initialFormData[key]);
      }
      return formData[key] !== initialFormData[key];
    });

    // 업로드된 이미지가 있는지 확인
    const hasUploadedImages = uploadedImages.length > 0;

    return basicFieldsChanged || hasUploadedImages;
  };

  // 업로드된 이미지들을 정리하는 함수
  const cleanupUploadedImages = async () => {
    if (uploadedImages.length === 0) return;

    try {
      const keys = uploadedImages.map(imageUrl => imageService.extractKeyFromUrl(imageUrl)).filter(Boolean);
      
      if (keys.length > 0) {
        await imageService.deleteMultipleImages(keys);
      }
    } catch (error) {
      console.error('이미지 정리 실패:', error);
    }
  };

  // 모달 닫기 핸들러
  const handleModalClose = async () => {
    if (hasFormChanged()) {
      const shouldClose = window.confirm('입력 중인 내용이 있습니다. 닫으시겠습니까?');
      if (!shouldClose) return;
    }

    // 업로드된 이미지들 정리
    await cleanupUploadedImages();
    
    // 폼 데이터 초기화
    setFormData({
      title: '',
      titleEn: '',
      year: '',
      location: '',
      type: '',
      client: '',
      director: '',
      status: '',
      description: '',
      descriptionEn: '',
      thumbnailImage: '',
      galleryImages: [],
      videos: [],
      category: category
    });
    
    setUploadedImages([]);
    setInitialFormData(null);
    onClose();
  };

  // 현재 카테고리의 type 옵션 가져오기
  const getCurrentTypeOptions = () => typeOptionsByCategory[category] || [];

  // 드래그 앤 드롭 핸들러 (react-beautiful-dnd)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.galleryImages.findIndex((_, index) => `new-gallery-${index}` === active.id);
        const newIndex = prev.galleryImages.findIndex((_, index) => `new-gallery-${index}` === over.id);

        return {
          ...prev,
          galleryImages: arrayMove(prev.galleryImages, oldIndex, newIndex),
        };
      });
    }
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (formData.title.trim()) {
      onSubmit({
        ...formData,
        category: category,
        mainImage: formData.galleryImages[0] || formData.thumbnailImage, // 첫 번째 갤러리 이미지를 메인으로 사용
        galleryImages: formData.galleryImages.filter(img => img.trim() !== ''),
        videos: formData.videos.filter(video => video.trim() !== ''),
        media: [
          ...formData.galleryImages.filter(img => img.trim() !== '').map(img => ({ type: "image", src: img })),
          ...formData.videos.filter(video => video.trim() !== '').map(video => ({ type: "video", src: video }))
        ]
      });
      setFormData({
        title: '',
        titleEn: '',
        year: '',
        location: '',
        type: '',
        client: '',
        director: '',
        status: '',
        description: '',
        descriptionEn: '',
        thumbnailImage: '',
        galleryImages: [],
        videos: [],
        category: category
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };



  // 타입 추가 (Firebase 연동)
  const addType = async () => {
    const currentTypeOptions = getCurrentTypeOptions();
    if (newType.trim() && !currentTypeOptions.includes(newType.trim())) {
      try {
        // Firebase에 저장
        await projectTypeService.addProjectType(category, newType.trim());
        
        // 로컬 상태 업데이트
        setTypeOptionsByCategory(prev => ({
          ...prev,
          [category]: [newType.trim(), ...prev[category]]
        }));
        setFormData(prev => ({ ...prev, type: newType.trim() }));
        setNewType('');
        setShowTypeInput(false);
      } catch (error) {
        console.error('타입 추가 실패:', error);
        alert('타입 추가에 실패했습니다.');
      }
    }
  };

  // 이미지 업로드 완료 핸들러
  const handleThumbnailImageUpload = (result) => {
    if (result && (result.imageUrl || result.publicUrl)) {
      setFormData(prev => ({
        ...prev,
        thumbnailImage: result.imageUrl || result.publicUrl
      }));
      // 새로 업로드한 이미지 추적
      setUploadedImages(prev => [...prev, result.imageUrl || result.publicUrl]);
    }
  };

  const handleGalleryImagesUpload = (results) => {
    if (results && results.length > 0) {
      const newUrls = results.map(result => result.imageUrl || result.publicUrl).filter(url => url);
      setFormData(prev => ({
        ...prev,
        galleryImages: [...prev.galleryImages, ...newUrls]
      }));
      // 새로 업로드한 이미지들 추적
      setUploadedImages(prev => [...prev, ...newUrls]);
    }
  };

  // 새로운 파일 선택 핸들러들
  const handleThumbnailFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      imageService.validateImageFile(file);
      const result = await imageService.uploadImage(file, {
        uploadedAt: new Date().toISOString(),
        source: 'admin-panel'
      });
      
      if (result.success) {
        handleThumbnailImageUpload(result);
      }
    } catch (error) {
      console.error('썸네일 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다: ' + error.message);
    }
    
    // 파일 입력 초기화
    event.target.value = '';
  };

  const handleGalleryFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    try {
      files.forEach(file => imageService.validateImageFile(file));
      
      if (files.length === 1) {
        const result = await imageService.uploadImage(files[0], {
          uploadedAt: new Date().toISOString(),
          source: 'admin-panel'
        });
        
        if (result.success) {
          handleGalleryImagesUpload([result]);
        }
      } else {
        const result = await imageService.uploadMultipleImages(files, {
          uploadedAt: new Date().toISOString(),
          source: 'admin-panel'
        });
        
        if (result.success) {
          handleGalleryImagesUpload(result.images);
        }
      }
    } catch (error) {
      console.error('갤러리 이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다: ' + error.message);
    }
    
    // 파일 입력 초기화
    event.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-content admin-modal-large" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{title}</h3>
                   <div className="admin-modal-footer">
            <button 
              type="button" 
              className="admin-button admin-button-secondary"
              onClick={handleModalClose}
              disabled={loading}
            >
              취소
            </button>
            <button 
              type="button" 
              onClick={handleSubmit}
              className="admin-button admin-button-primary"
              disabled={loading || !formData.title.trim()}
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="admin-modal-body">

                  
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label>프로젝트명 (국문)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="프로젝트명을 입력하세요"
                  className="admin-input"
                  autoFocus
                  disabled={loading}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>프로젝트명 (영문)</label>
                <input
                  type="text"
                  value={formData.titleEn}
                  onChange={(e) => handleInputChange('titleEn', e.target.value)}
                  placeholder="English project name"
                  className="admin-input"
                  disabled={loading}
                />
              </div>

                            <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleInputChange('year', e.target.value)}
                    placeholder="연도 입력 (예: 2024)"
                    className="admin-input"
                    disabled={loading}
                    min="1900"
                    max="2100"
                  />
                </div>
                              
                                            <div className="admin-form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="admin-input"
                  disabled={loading}
                >
                  <option value="">타입 선택</option>
                  {getCurrentTypeOptions().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              </div>

              <div className="admin-form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="예: 서울 성북구 Seoul Seongbuk-gu"
                  className="admin-input"
                  disabled={loading}
                />
                          </div>
                        

              <div className="admin-form-group">
                <label>Client</label>
                <input
                  type="text"
                  value={formData.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  placeholder="클라이언트명"
                  className="admin-input"
                  disabled={loading}
                />
              </div>

              <div className="admin-form-group">
                <label>Director</label>
                <input
                  type="text"
                  value={formData.director}
                  onChange={(e) => handleInputChange('director', e.target.value)}
                  placeholder="예: Yoongyoo Jang, Changhoon Shin"
                  className="admin-input"
                  disabled={loading}
                />
                          </div>
                          
                                                                    <div className="admin-form-group">
                  <label>Status</label>
                  <input
                    type="text"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    placeholder="예: Completed, In Progress, Planned"
                    className="admin-input"
                    disabled={loading}
                  />
                </div>
            </div>

            <div className="admin-form-column">
              <div className="admin-form-group">
                <label>썸네일 이미지</label>
                <div className="admin-upload-button-container">
                  <input
                    type="file"
                    id="thumbnail-upload"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleThumbnailFileSelect}
                    disabled={loading}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('thumbnail-upload').click()}
                    className="admin-button admin-button-secondary"
                    disabled={loading}
                  >
                    이미지 추가
                  </button>
                  <small className="admin-upload-caption">
                    지원 포맷: JPG, PNG, WebP, GIF ㅣ 최대 용량: 2MB
                  </small>
                </div>
                {formData.thumbnailImage && (
                  <div className="admin-image-preview">
                    <img src={formData.thumbnailImage} alt="썸네일 이미지" className="admin-preview-thumb" />
                  </div>
                )}
              </div>

              <div className="admin-form-group">
                <label>프로젝트 이미지</label>
                <div className="admin-upload-button-container">
                  <input
                    type="file"
                    id="gallery-upload"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleGalleryFileSelect}
                    disabled={loading}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('gallery-upload').click()}
                    className="admin-button admin-button-secondary"
                    disabled={loading}
                  >
                    이미지 추가
                  </button>
                  <small className="admin-upload-caption">
                    지원 포맷: JPG, PNG, WebP, GIF ㅣ 최대 용량: 2MB ㅣ 최대 20개 파일
                  </small>
                </div>
                {formData.galleryImages.length > 0 && (
                  <div className="admin-gallery-preview">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                      animateLayoutChanges={false}
                    >
                      <SortableContext
                        items={formData.galleryImages.map((_, index) => `new-gallery-${index}`)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="admin-detail-media-container">
                          {formData.galleryImages.map((imageUrl, index) => (
                            <SortableItem
                              key={`new-gallery-${index}`}
                              id={`new-gallery-${index}`}
                              imageUrl={imageUrl}
                              index={index}
                              onRemove={(index) => removeArrayItem('galleryImages', index)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>

              <div className="admin-form-group">
                              <label>비디오 URL (유튜브)</label>
                                              <div className="admin-upload-button-container">
                  <button 
                    type="button" 
                    onClick={() => addArrayItem('videos')}
                    className="admin-button admin-button-secondary"
                    disabled={loading}
                  >
                    비디오 추가
                  </button>
                </div>
                {formData.videos.map((video, index) => (
                  <div key={index} className="admin-array-item">
                    <input
                      type="text"
                      value={video}
                      onChange={(e) => handleArrayInputChange('videos', index, e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="admin-input"
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      onClick={() => removeArrayItem('videos', index)}
                      className="admin-button admin-button-danger admin-button-small"
                      disabled={loading}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

          <div className="admin-form-group">
            <label>설명 (국문)</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="프로젝트 설명을 입력하세요"
              className="admin-textarea"
              rows="4"
              disabled={loading}
            />
          </div>

          <div className="admin-form-group">
            <label>설명 (영문)</label>
            <textarea
              value={formData.descriptionEn}
              onChange={(e) => handleInputChange('descriptionEn', e.target.value)}
              placeholder="English project description"
              className="admin-textarea"
              rows="4"
              disabled={loading}
            />
          </div>

        </form>
      </div>
    </div>
  );
}

// 프로젝트 수정 모달 컴포넌트
function ProjectEditModal({ isOpen, onClose, project, onSubmit, loading, category }) {
  const [formData, setFormData] = useState({
    title: '',
    titleEn: '',
    year: '',
    location: '',
    type: '',
    client: '',
    director: '',
    status: '',
    description: '',
    descriptionEn: '',
    thumbnailImage: '',
    galleryImages: [],
    videos: [],
    category: category
  });

  // 초기 폼 데이터 (변경 감지용)
  const [initialFormData, setInitialFormData] = useState(null);
  
  // 업로드된 이미지 추적 (삭제용)
  const [uploadedImages, setUploadedImages] = useState([]);

  // 타입 옵션 관리
  const [typeOptionsByCategory, setTypeOptionsByCategory] = useState({});
  const [loadingTypes, setLoadingTypes] = useState(true);

  // Firebase에서 프로젝트 타입 옵션 가져오기
  useEffect(() => {
    async function loadProjectTypes() {
      try {
        setLoadingTypes(true);
        const types = await projectTypeService.getProjectTypes();
        setTypeOptionsByCategory(types);
      } catch (error) {
        console.error('프로젝트 타입 로딩 실패:', error);
        // 에러 시 기본값 설정
        setTypeOptionsByCategory({
          Architecture: ['HOUSE', 'Commercial', 'Residential', 'Cultural', 'Office', 'Hotel', 'Restaurant'],
          Art: ['Exhibition', 'Artwork', 'Installation', 'Sculpture', 'Painting', 'Performance'],
          Design: ['Interior', 'Furniture', 'Product', 'Branding', 'Graphic', 'Web']
        });
      } finally {
        setLoadingTypes(false);
      }
    }

    if (isOpen) {
      loadProjectTypes();
      setUploadedImages([]);
    }
  }, [isOpen]);

  // 폼 데이터가 변경되었는지 확인
  const hasFormChanged = () => {
    if (!initialFormData) return false;
    
    // 기본 필드들 비교
    const basicFieldsChanged = Object.keys(initialFormData).some(key => {
      if (Array.isArray(initialFormData[key])) {
        return JSON.stringify(formData[key]) !== JSON.stringify(initialFormData[key]);
      }
      return formData[key] !== initialFormData[key];
    });

    // 업로드된 이미지가 있는지 확인
    const hasUploadedImages = uploadedImages.length > 0;

    return basicFieldsChanged || hasUploadedImages;
  };

  // 업로드된 이미지들을 정리하는 함수
  const cleanupUploadedImages = async () => {
    if (uploadedImages.length === 0) return;

    try {
      const keys = uploadedImages.map(imageUrl => imageService.extractKeyFromUrl(imageUrl)).filter(Boolean);
      
      if (keys.length > 0) {
        await imageService.deleteMultipleImages(keys);
      }
    } catch (error) {
      console.error('이미지 정리 실패:', error);
    }
  };

  // 모달 닫기 핸들러
  const handleModalClose = async () => {
    if (hasFormChanged()) {
      const shouldClose = window.confirm('입력 중인 내용이 있습니다. 닫으시겠습니까?');
      if (!shouldClose) return;
    }

    // 업로드된 이미지들 정리
    await cleanupUploadedImages();
    
    setUploadedImages([]);
    setInitialFormData(null);
    onClose();
  };

  // 현재 카테고리의 type 옵션 가져오기
  const getCurrentTypeOptions = () => typeOptionsByCategory[category] || [];

  // 드래그 앤 드롭 핸들러 (react-beautiful-dnd)
  const editSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleEditDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.galleryImages.findIndex((_, index) => `edit-gallery-${index}` === active.id);
        const newIndex = prev.galleryImages.findIndex((_, index) => `edit-gallery-${index}` === over.id);

        return {
          ...prev,
          galleryImages: arrayMove(prev.galleryImages, oldIndex, newIndex),
        };
      });
    }
  };

  // 프로젝트 데이터로 폼 초기화
  useEffect(() => {
    if (project && isOpen) {
      const initialData = {
        title: project.title || '',
        titleEn: project.titleEn || '',
        year: project.year || '',
        location: project.location || '',
        type: project.type || '',
        client: project.client || '',
        director: project.director || '',
        status: project.status || '',
        description: project.description || '',
        descriptionEn: project.descriptionEn || '',
        thumbnailImage: project.thumbnailImage || '',
        galleryImages: project.galleryImages || [],
        videos: project.videos || [],
        category: project.category || category
      };
      
      setFormData(initialData);
      setInitialFormData(initialData);
    }
  }, [project, isOpen, category]);

  const handleSubmit = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (formData.title.trim()) {
      onSubmit(project.id, {
        ...formData,
        mainImage: formData.galleryImages[0] || formData.thumbnailImage,
        galleryImages: formData.galleryImages.filter(img => img.trim() !== ''),
        videos: formData.videos.filter(video => video.trim() !== ''),
        media: [
          ...formData.galleryImages.filter(img => img.trim() !== '').map(img => ({ type: "image", src: img })),
          ...formData.videos.filter(video => video.trim() !== '').map(video => ({ type: "video", src: video }))
        ]
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };



  // 타입 추가 기능 제거 (Type 관리 모달에서 별도 관리)

  // 이미지 업로드 완료 핸들러
  const handleThumbnailImageUpload = (result) => {
    if (result && (result.imageUrl || result.publicUrl)) {
      setFormData(prev => ({
        ...prev,
        thumbnailImage: result.imageUrl || result.publicUrl
      }));
      // 새로 업로드한 이미지 추적
      setUploadedImages(prev => [...prev, result.imageUrl || result.publicUrl]);
    }
  };

  const handleGalleryImagesUpload = (results) => {
    if (results && results.length > 0) {
      const newUrls = results.map(result => result.imageUrl || result.publicUrl).filter(url => url);
      setFormData(prev => ({
        ...prev,
        galleryImages: [...prev.galleryImages, ...newUrls]
      }));
      // 새로 업로드한 이미지들 추적
      setUploadedImages(prev => [...prev, ...newUrls]);
    }
  };

  // 새로운 파일 선택 핸들러들 (ProjectEditModal용)
  const handleEditThumbnailFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      imageService.validateImageFile(file);
      const result = await imageService.uploadImage(file, {
        uploadedAt: new Date().toISOString(),
        source: 'admin-panel'
      });
      
      if (result.success) {
        handleThumbnailImageUpload(result);
      }
    } catch (error) {
      console.error('썸네일 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다: ' + error.message);
    }
    
    // 파일 입력 초기화
    event.target.value = '';
  };

  const handleEditGalleryFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    try {
      files.forEach(file => imageService.validateImageFile(file));
      
      if (files.length === 1) {
        const result = await imageService.uploadImage(files[0], {
          uploadedAt: new Date().toISOString(),
          source: 'admin-panel'
        });
        
        if (result.success) {
          handleGalleryImagesUpload([result]);
        }
      } else {
        const result = await imageService.uploadMultipleImages(files, {
          uploadedAt: new Date().toISOString(),
          source: 'admin-panel'
        });
        
        if (result.success) {
          handleGalleryImagesUpload(result.images);
        }
      }
    } catch (error) {
      console.error('갤러리 이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다: ' + error.message);
    }
    
    // 파일 입력 초기화
    event.target.value = '';
  };

  if (!isOpen || !project) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-content admin-modal-large" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>프로젝트 수정: {project.title}</h3>
            <div className="admin-modal-footer">
            <button 
              type="button" 
              className="admin-button admin-button-secondary"
              onClick={handleModalClose}
              disabled={loading}
            >
              취소
            </button>
            <button 
              type="button" 
              onClick={handleSubmit}
              className="admin-button admin-button-primary"
              disabled={loading || !formData.title.trim()}
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="admin-modal-body">
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label>프로젝트명 (국문)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="프로젝트명을 입력하세요"
                  className="admin-input"
                  disabled={loading}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>프로젝트명 (영문)</label>
                <input
                  type="text"
                  value={formData.titleEn}
                  onChange={(e) => handleInputChange('titleEn', e.target.value)}
                  placeholder="English project name"
                  className="admin-input"
                  disabled={loading}
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleInputChange('year', e.target.value)}
                    placeholder="연도 입력 (예: 2024)"
                    className="admin-input"
                    disabled={loading}
                    min="1900"
                    max="2100"
                  />
                </div>
                              
                                            <div className="admin-form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="admin-input"
                  disabled={loading}
                >
                  <option value="">타입 선택</option>
                  {getCurrentTypeOptions().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              </div>

              <div className="admin-form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="예: 서울 성북구 Seoul Seongbuk-gu"
                  className="admin-input"
                  disabled={loading}
                />
              </div>

              <div className="admin-form-group">
                <label>Client</label>
                <input
                  type="text"
                  value={formData.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  placeholder="클라이언트명"
                  className="admin-input"
                  disabled={loading}
                />
              </div>

              <div className="admin-form-group">
                <label>Director</label>
                <input
                  type="text"
                  value={formData.director}
                  onChange={(e) => handleInputChange('director', e.target.value)}
                  placeholder="예: Yoongyoo Jang, Changhoon Shin"
                  className="admin-input"
                  disabled={loading}
                />
                          </div>
                          
                                          <div className="admin-form-group">
                  <label>Status</label>
                  <input
                    type="text"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    placeholder="예: Completed, In Progress, Planned"
                    className="admin-input"
                    disabled={loading}
                  />
                </div>
            </div>

            <div className="admin-form-column">
              <div className="admin-form-group">
                <label>썸네일 이미지</label>
                <div className="admin-upload-button-container">
                  <input
                    type="file"
                    id="edit-thumbnail-upload"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleEditThumbnailFileSelect}
                    disabled={loading}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('edit-thumbnail-upload').click()}
                    className="admin-button admin-button-secondary"
                    disabled={loading}
                  >
                    이미지 추가
                  </button>
                  <small className="admin-upload-caption">
                    지원 포맷: JPG, PNG, WebP, GIF ㅣ 최대 용량: 2MB
                  </small>
                </div>
                {formData.thumbnailImage && (
                  <div className="admin-image-preview">
                    <img src={formData.thumbnailImage} alt="썸네일 이미지" className="admin-preview-thumb" />
                  </div>
                )}
              </div>

              <div className="admin-form-group">
                <label>프로젝트 이미지</label>
                <div className="admin-upload-button-container">
                  <input
                    type="file"
                    id="edit-gallery-upload"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleEditGalleryFileSelect}
                    disabled={loading}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('edit-gallery-upload').click()}
                    className="admin-button admin-button-secondary"
                    disabled={loading}
                  >
                    이미지 추가
                  </button>
                  <small className="admin-upload-caption">
                    지원 포맷: JPG, PNG, WebP, GIF ㅣ 최대 용량: 2MB ㅣ 최대 20개
                  </small>
                </div>
                {formData.galleryImages.length > 0 && (
                  <div className="admin-gallery-preview">
                    <DndContext
                      sensors={editSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleEditDragEnd}
                      animateLayoutChanges={false}
                    >
                      <SortableContext
                        items={formData.galleryImages.map((_, index) => `edit-gallery-${index}`)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="admin-detail-media-container">
                          {formData.galleryImages.map((imageUrl, index) => (
                            <SortableItem
                              key={`edit-gallery-${index}`}
                              id={`edit-gallery-${index}`}
                              imageUrl={imageUrl}
                              index={index}
                              onRemove={(index) => removeArrayItem('galleryImages', index)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>

              <div className="admin-form-group">
                              <label>비디오 URL (유튜브)</label>
                                              <div className="admin-upload-button-container">
                  <button 
                    type="button" 
                    onClick={() => addArrayItem('videos')}
                    className="admin-button admin-button-secondary"
                    disabled={loading}
                  >
                    비디오 추가
                  </button>
                </div>
                {formData.videos.map((video, index) => (
                  <div key={index} className="admin-array-item">
                    <input
                      type="text"
                      value={video}
                      onChange={(e) => handleArrayInputChange('videos', index, e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="admin-input"
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      onClick={() => removeArrayItem('videos', index)}
                      className="admin-button admin-button-danger admin-button-small"
                      disabled={loading}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

          <div className="admin-form-group">
            <label>설명 (국문)</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="프로젝트 설명을 입력하세요"
              className="admin-textarea"
              rows="4"
              disabled={loading}
            />
          </div>

          <div className="admin-form-group">
            <label>설명 (영문)</label>
            <textarea
              value={formData.descriptionEn}
              onChange={(e) => handleInputChange('descriptionEn', e.target.value)}
              placeholder="English project description"
              className="admin-textarea"
              rows="4"
              disabled={loading}
            />
          </div>

        </form>
      </div>
    </div>
  );
}

export default function ProjectManager() {
  const [activeTab, setActiveTab] = useState('Architecture');
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState({
    Architecture: [],
    Art: [],
    Design: []
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTypeManagementModalOpen, setIsTypeManagementModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  // 프로젝트 로드
  async function loadProjects() {
    try {
      setLoading(true);
      const [archProjects, artProjects, designProjects] = await Promise.all([
        contentService.getContents('Architecture'),
        contentService.getContents('Art'), 
        contentService.getContents('Design')
      ]);
      
      setProjects({
        Architecture: archProjects || [],
        Art: artProjects || [],
        Design: designProjects || []
      });
    } catch (error) {
      console.error('프로젝트 로딩 실패:', error);
      alert('프로젝트 로딩에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  // 새 프로젝트 추가
  async function handleAddProject(projectData) {
    setModalLoading(true);
    try {
      const newProjectId = await contentService.addContent(projectData);
      
      // 로컬 상태 업데이트
      setProjects(prev => ({
        ...prev,
        [activeTab]: [
          { id: newProjectId, ...projectData },
          ...prev[activeTab]
        ]
      }));
      
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('프로젝트 추가 실패:', error);
      alert('프로젝트 추가에 실패했습니다: ' + error.message);
    } finally {
      setModalLoading(false);
    }
  }

  // 프로젝트 수정
  async function handleEditProject(projectId, projectData) {
    setModalLoading(true);
    try {
      await contentService.updateContent(projectId, projectData);
      
      // 로컬 상태 업데이트
      setProjects(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(p => 
          p.id === projectId ? { id: projectId, ...projectData } : p
        )
      }));
      
      setIsEditModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('프로젝트 수정 실패:', error);
      alert('프로젝트 수정에 실패했습니다: ' + error.message);
    } finally {
      setModalLoading(false);
    }
  }

  // 프로젝트 삭제
  async function handleDeleteProject(projectId) {
    if (!window.confirm('이 프로젝트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await contentService.deleteContent(projectId);
      
      // 로컬 상태 업데이트
      setProjects(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].filter(p => p.id !== projectId)
      }));
      
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  }

  const projectSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 프로젝트 목록 드래그앤드롭 핸들러
  const handleProjectListDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = currentProjects.findIndex(project => project.id === active.id);
      const newIndex = currentProjects.findIndex(project => project.id === over.id);

      const newProjects = arrayMove(currentProjects, oldIndex, newIndex);

      // 로컬 상태 업데이트
      setProjects(prev => ({
        ...prev,
        [activeTab]: newProjects
      }));

      // 백엔드 업데이트 (순서 정보 저장)
      try {
        const projectIds = newProjects.map(item => item.id);
        await contentService.updateProjectOrder(projectIds);
      } catch (error) {
        console.error('프로젝트 순서 변경 실패:', error);
        // 실패 시 원래 상태로 복구
        await loadProjects();
        alert('순서 변경에 실패했습니다.');
      }
    }
  };

  // 수정 모달 열기
  function openEditModal(project) {
    setEditingProject(project);
    setIsEditModalOpen(true);
  }

  // 검색 필터링 로직
  const filteredProjects = (projects[activeTab] || []).filter(project => {
    return !searchTerm || 
      (project.title && project.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (project.titleEn && project.titleEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const currentProjects = filteredProjects;

  return (
    <AdminLayout>
      <div className="admin-content">
        <h2 className="admin-page-title">PROJECT 관리</h2>
        
        {/* 탭 네비게이션 */}
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'Architecture' ? 'active' : ''}`}
            onClick={() => setActiveTab('Architecture')}
          >
            Architecture
          </button>
          <button 
            className={`admin-tab ${activeTab === 'Art' ? 'active' : ''}`}
            onClick={() => setActiveTab('Art')}
          >
            Art
          </button>
          <button 
            className={`admin-tab ${activeTab === 'Design' ? 'active' : ''}`}
            onClick={() => setActiveTab('Design')}
          >
            Design
          </button>
        </div>

        <div className="admin-content-layout">
          <div className="admin-content-main">
            <div className="admin-content-header">
              <h3 className="admin-content-title">{activeTab} 프로젝트 관리</h3>
              <div className="admin-header-buttons">
                <div className="admin-search-input-group">
                  <input
                    type="text"
                    placeholder="프로젝트 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="admin-input admin-search-input"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="admin-search-clear"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button 
                  className="admin-button admin-button-secondary"
                  onClick={() => setIsTypeManagementModalOpen(true)}
                >
                  Type 관리
                </button>
                <button 
                  className="admin-button admin-button-primary"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  프로젝트 추가
                </button>
              </div>
            </div>

            {loading ? (
              <p>로딩 중...</p>
            ) : (
              <div className="admin-projects-container">
                {currentProjects.length === 0 ? (
                  <div className="admin-empty-state">
                    <p>등록된 {activeTab} 프로젝트가 없습니다.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={projectSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleProjectListDragEnd}
                    animateLayoutChanges={false}
                  >
                    <SortableContext
                      items={currentProjects.map(project => project.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="admin-projects-table">
                        <div className="admin-table-body" style={{ maxHeight: 'calc(100vh - 290px)' }}>
                          {currentProjects.map((project) => (
                            <SortableProjectItem
                              key={project.id}
                              id={project.id}
                              project={project}
                              onEdit={openEditModal}
                              onDelete={handleDeleteProject}
                            />
                          ))}
                        </div>
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 프로젝트 추가 모달 */}
      <ProjectModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddProject}
        loading={modalLoading}
        category={activeTab}
        title={`${activeTab} 프로젝트 추가`}
      />

      {/* 프로젝트 수정 모달 */}
      <ProjectEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProject(null);
        }}
        project={editingProject}
        onSubmit={handleEditProject}
        loading={modalLoading}
        category={activeTab}
      />

      {/* Type 관리 모달 */}
      <TypeManagementModal
        isOpen={isTypeManagementModalOpen}
        onClose={() => setIsTypeManagementModalOpen(false)}
        category={activeTab}
      />
    </AdminLayout>
  );
} 