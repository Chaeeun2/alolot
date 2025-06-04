import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { addProject, getProjects, deleteProject, updateProjectImages, updateProject } from '../../services/projectService';
import { getCategories } from '../../services/categoryService';
import { getPresignedUrl } from '../../services/r2Service';
import './ProjectManagement.css';

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProject, setEditProject] = useState({
    title: '',
    detail: '',
    description: '',
    thumbnailUrl: '',
    mainImageUrl: '',
    detailImages: [],
    categories: []
  });
  const [newProject, setNewProject] = useState({
    title: '',
    detail: '',
    description: '',
    thumbnailUrl: '',
    mainImageUrl: '',
    detailImages: [],
    categories: []
  });

  // 이미지 파일 상태 (기존)
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [detailImageFiles, setDetailImageFiles] = useState([]);

  // 수정용 이미지 파일 상태
  const [editThumbnailFile, setEditThumbnailFile] = useState(null);
  const [editMainImageFile, setEditMainImageFile] = useState(null);
  const [editDetailImageFiles, setEditDetailImageFiles] = useState([]);

  // 이미지 미리보기 상태 (기존)
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [mainImagePreview, setMainImagePreview] = useState('');
  const [detailImagePreviews, setDetailImagePreviews] = useState([]);

  // 수정용 이미지 미리보기 상태
  const [editThumbnailPreview, setEditThumbnailPreview] = useState('');
  const [editMainImagePreview, setEditMainImagePreview] = useState('');
  const [editDetailImagePreviews, setEditDetailImagePreviews] = useState([]);

  useEffect(() => {
    fetchProjects();
    fetchCategories();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data || []);
    } catch (error) {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data || []);
    } catch (error) {
      setCategories([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProject(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryToggle = (category, isNewProject = true) => {
    if (isNewProject) {
      setNewProject(prev => {
        const isSelected = prev.categories.some(cat => cat.id === category.id);
        return {
          ...prev,
          categories: isSelected
            ? prev.categories.filter(cat => cat.id !== category.id)
            : [...prev.categories, category]
        };
      });
    } else {
      setEditProject(prev => {
        const isSelected = prev.categories.some(cat => cat.id === category.id);
        return {
          ...prev,
          categories: isSelected
            ? prev.categories.filter(cat => cat.id !== category.id)
            : [...prev.categories, category]
        };
      });
    }
  };

  const handleImagePreview = (e, type) => {
    if (type === 'detail') {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setDetailImagePreviews(prev => [...prev, reader.result]);
          setDetailImageFiles(prev => [...prev, file]);
        };
        reader.readAsDataURL(file);
      });
    } else {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        switch (type) {
          case 'thumbnail':
            setThumbnailPreview(reader.result);
            setThumbnailFile(file);
            break;
          case 'main':
            setMainImagePreview(reader.result);
            setMainImageFile(file);
            break;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetailImageDelete = (index) => {
    setDetailImagePreviews(prev => prev.filter((_, i) => i !== index));
    setDetailImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const sourceDroppableId = result.source.droppableId;

    // 새 프로젝트 추가 시 상세 이미지 순서 변경
    if (sourceDroppableId === 'new-project-detail-images') {
      const items = Array.from(detailImagePreviews);
      const files = Array.from(detailImageFiles);
      
      // 미리보기 배열 순서 변경
      const [reorderedPreview] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedPreview);
      
      // 파일 배열 순서 변경
      const [reorderedFile] = files.splice(result.source.index, 1);
      files.splice(result.destination.index, 0, reorderedFile);
      
      setDetailImagePreviews(items);
      setDetailImageFiles(files);
      return;
    }

    // 모달에서 편집 중인 경우
    if (showEditModal && editingProjectId) {
      // editProject의 detailImages 순서 변경
      const items = Array.from(editProject.detailImages);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      // editProject 상태 업데이트
      setEditProject(prev => ({
        ...prev,
        detailImages: items
      }));

      // 전체 projects 배열도 업데이트 (UI 일관성을 위해)
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === editingProjectId
            ? { ...p, detailImages: items }
            : p
        )
      );

      // Firebase 업데이트
      updateProjectImages(editingProjectId, items).catch(error => {
        console.error('드래그 앤 드롭 업데이트 실패:', error);
        // 실패 시 원래 상태로 복구
        fetchProjects();
      });
    } else {
      // 일반 목록에서의 드래그 앤 드롭 (기존 로직)
      const projectId = result.source.droppableId.replace('droppable-', '');
      const project = projects.find(p => p.id === projectId);
      
      if (!project || !project.detailImages) return;

      const items = Array.from(project.detailImages);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === projectId
            ? { ...p, detailImages: items }
            : p
        )
      );

      updateProjectImages(projectId, items).catch(error => {
        console.error('드래그 앤 드롭 업데이트 실패:', error);
        fetchProjects();
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const thumbnailUrl = await getPresignedUrl(thumbnailFile);
      const mainImageUrl = await getPresignedUrl(mainImageFile);
      
      const detailImagesPromises = detailImageFiles.map(async (file) => {
        const url = await getPresignedUrl(file);
        return { url, order: detailImageFiles.indexOf(file) };
      });
      const detailImages = await Promise.all(detailImagesPromises);

      const projectData = {
        title: newProject.title,
        detail: newProject.detail,
        description: newProject.description,
        thumbnailUrl,
        mainImageUrl,
        detailImages,
        categories: newProject.categories,
        createdAt: new Date()
      };

      await addProject(projectData);
      
      // 폼 초기화
      setNewProject({
        title: '',
        detail: '',
        description: '',
        thumbnailUrl: '',
        mainImageUrl: '',
        detailImages: [],
        categories: []
      });
      setThumbnailPreview('');
      setMainImagePreview('');
      setDetailImagePreviews([]);
      setThumbnailFile(null);
      setMainImageFile(null);
      setDetailImageFiles([]);
      
      fetchProjects();
    } catch (error) {
      console.error('프로젝트 추가 중 오류:', error);
    }
  };

  const handleDelete = async (projectId) => {
    if (window.confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
      try {
        await deleteProject(projectId);
        fetchProjects();
      } catch (error) {
        console.error('프로젝트 삭제 중 오류:', error);
      }
    }
  };

  const handleEditStart = (project) => {
    setEditingProjectId(project.id);
    setEditProject({
      title: project.title,
      detail: project.detail,
      description: project.description,
      thumbnailUrl: project.thumbnailUrl,
      mainImageUrl: project.mainImageUrl,
      detailImages: project.detailImages || [],
      categories: project.categories || []
    });
    
    // 기존 이미지 미리보기 설정
    setEditThumbnailPreview(project.thumbnailUrl);
    setEditMainImagePreview(project.mainImageUrl);
    setEditDetailImagePreviews(project.detailImages?.map(img => img.url) || []);
    
    // 파일 상태 초기화
    setEditThumbnailFile(null);
    setEditMainImageFile(null);
    setEditDetailImageFiles([]);
    
    // 모달 열기
    setShowEditModal(true);
  };

  const handleEditCancel = () => {
    setEditingProjectId(null);
    setShowEditModal(false);
    setEditProject({
      title: '',
      detail: '',
      description: '',
      thumbnailUrl: '',
      mainImageUrl: '',
      detailImages: [],
      categories: []
    });
    setEditThumbnailPreview('');
    setEditMainImagePreview('');
    setEditDetailImagePreviews([]);
    setEditThumbnailFile(null);
    setEditMainImageFile(null);
    setEditDetailImageFiles([]);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditProject(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditImagePreview = (e, type) => {
    if (type === 'detail') {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditDetailImagePreviews(prev => [...prev, reader.result]);
          setEditDetailImageFiles(prev => [...prev, file]);
        };
        reader.readAsDataURL(file);
      });
    } else {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        switch (type) {
          case 'thumbnail':
            setEditThumbnailPreview(reader.result);
            setEditThumbnailFile(file);
            break;
          case 'main':
            setEditMainImagePreview(reader.result);
            setEditMainImageFile(file);
            break;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditDetailImageDelete = (index, event) => {
    // 이벤트 전파 방지 (드래그 방해하지 않도록)
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    setEditDetailImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    // 기존 이미지를 삭제하는 경우
    if (index < editProject.detailImages.length) {
      setEditProject(prev => ({
        ...prev,
        detailImages: prev.detailImages.filter((_, i) => i !== index)
      }));
    } else {
      // 새로 추가된 파일을 삭제하는 경우  
      const fileIndex = index - editProject.detailImages.length;
      setEditDetailImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      let thumbnailUrl = editProject.thumbnailUrl;
      let mainImageUrl = editProject.mainImageUrl;
      let detailImages = [...editProject.detailImages];

      // 새 썸네일 이미지가 있으면 업로드
      if (editThumbnailFile) {
        thumbnailUrl = await getPresignedUrl(editThumbnailFile);
      }

      // 새 메인 이미지가 있으면 업로드
      if (editMainImageFile) {
        mainImageUrl = await getPresignedUrl(editMainImageFile);
      }

      // 새 상세 이미지들이 있으면 업로드
      if (editDetailImageFiles.length > 0) {
        const newDetailImagesPromises = editDetailImageFiles.map(async (file) => {
          const url = await getPresignedUrl(file);
          return { url, order: detailImages.length + editDetailImageFiles.indexOf(file) };
        });
        const newDetailImages = await Promise.all(newDetailImagesPromises);
        detailImages = [...detailImages, ...newDetailImages];
      }

      const projectData = {
        title: editProject.title,
        detail: editProject.detail,
        description: editProject.description,
        thumbnailUrl,
        mainImageUrl,
        detailImages,
        categories: editProject.categories
      };

      await updateProject(editingProjectId, projectData);
      
      handleEditCancel();
      fetchProjects();
    } catch (error) {
      console.error('프로젝트 수정 중 오류:', error);
    }
  };

  if (loading) {
    return <div className="admin-loading">로딩 중...</div>;
  }

  return (
    <div className="project-management">
      <h1>프로젝트 관리</h1>

      {/* 새 프로젝트 추가 폼 */}
      <div className="admin-form-section">
        <h2>새 프로젝트 추가</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="title">프로젝트 제목</label>
            <input
              type="text"
              id="title"
              name="title"
              value={newProject.title}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="detail">프로젝트 상세 설명</label>
            <textarea
              id="detail"
              name="detail"
              value={newProject.detail}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">프로젝트 간단 설명</label>
            <input
              type="text"
              id="description"
              name="description"
              value={newProject.description}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>카테고리 선택</label>
            <div className="categories-selection">
              {categories.map((category) => (
                <label key={category.id} className="category-checkbox">
                  <input
                    type="checkbox"
                    checked={newProject.categories.some(cat => cat.id === category.id)}
                    onChange={() => handleCategoryToggle(category, true)}
                  />
                  <span 
                    className="category-label"
                    style={{ 
                      backgroundColor: 'black',
                      color: category.color || '#007bff',
                      padding: '4px 8px',
                      marginLeft: '5px'
                    }}
                  >
                    {category.name}
                  </span>
                </label>
              ))}
            </div>
            <div className="selected-categories">
              <strong>선택된 카테고리:</strong>
              <div className="categories-display">
                {newProject.categories.map((cat, index) => (
                  <span 
                    key={index} 
                    className="selected-category"
                    style={{ 
                      backgroundColor: 'black',
                      color: cat.color || '#007bff'
                    }}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="thumbnail">썸네일 이미지</label>
            <input
              type="file"
              id="thumbnail"
              accept="image/*"
              onChange={(e) => handleImagePreview(e, 'thumbnail')}
              required
            />
            {thumbnailPreview && (
              <div className="image-preview">
                <img src={thumbnailPreview} alt="썸네일 미리보기" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="mainImage">메인 이미지</label>
            <input
              type="file"
              id="mainImage"
              accept="image/*"
              onChange={(e) => handleImagePreview(e, 'main')}
              required
            />
            {mainImagePreview && (
              <div className="image-preview">
                <img src={mainImagePreview} alt="메인 이미지 미리보기" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="detailImages">상세 이미지들 (여러 장 한번에 선택 가능)</label>
            <input
              type="file"
              id="detailImages"
              accept="image/*"
              onChange={(e) => handleImagePreview(e, 'detail')}
              multiple
            />
            {detailImagePreviews.length > 0 && (
              <div className="detail-images-section">
                <h4>상세 이미지 순서 조정</h4>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable
                    droppableId="new-project-detail-images"
                    direction="horizontal"
                    isDropDisabled={false}
                    isCombineEnabled={false}
                  >
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`detail-images-container ${
                          snapshot.isDraggingOver ? 'dragging-over' : ''
                        }`}
                      >
                        {detailImagePreviews.map((preview, index) => (
                          <Draggable
                            key={`new-image-${index}`}
                            draggableId={`new-image-${index}`}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`detail-image-item ${
                                  snapshot.isDragging ? 'dragging' : ''
                                }`}
                              >
                                <img 
                                  src={preview} 
                                  alt={`상세 이미지 ${index + 1}`}
                                  style={{
                                    width: '100px',
                                    height: '100px',
                                    objectFit: 'cover'
                                  }}
                                />
                                <button
                                  type="button"
                                  className="delete-image-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleDetailImageDelete(index);
                                  }}
                                >
                                  삭제
                                </button>
                                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                                  {index + 1}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}
          </div>

          <button type="submit" className="submit-button">프로젝트 추가</button>
        </form>
      </div>

      {/* 프로젝트 목록 */}
      <div className="admin-list-section">
        <h2>프로젝트 목록</h2>
        <div className="project-list-simple">
          {projects.map((project) => (
            <div key={project.id} className="project-list-item">
              <span className="project-title">{project.title}</span>
              <div className="project-actions">
                <button
                  className="edit-button"
                  onClick={() => handleEditStart(project)}
                >
                  수정
                </button>
                <button
                  className="delete-button"
                  onClick={() => handleDelete(project.id)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 수정 모달 */}
      {showEditModal && (
        <div className="modal-overlay" onClick={handleEditCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>프로젝트 수정</h2>
              <button className="modal-close" onClick={handleEditCancel}>×</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="edit-title">프로젝트 제목</label>
                <input
                  type="text"
                  id="edit-title"
                  name="title"
                  value={editProject.title}
                  onChange={handleEditInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-detail">프로젝트 상세 설명</label>
                <textarea
                  id="edit-detail"
                  name="detail"
                  value={editProject.detail}
                  onChange={handleEditInputChange}
                  required
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">프로젝트 간단 설명</label>
                <input
                  type="text"
                  id="edit-description"
                  name="description"
                  value={editProject.description}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>카테고리 선택</label>
                <div className="categories-selection">
                  {categories.map((category) => (
                    <label key={category.id} className="category-checkbox">
                      <input
                        type="checkbox"
                        checked={editProject.categories.some(cat => cat.id === category.id)}
                        onChange={() => handleCategoryToggle(category, false)}
                      />
                      <span 
                        className="category-label"
                        style={{ 
                          backgroundColor: 'black',
                          color: category.color || '#007bff',
                          padding: '4px 8px',
                          marginLeft: '5px'
                        }}
                      >
                        {category.name}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="selected-categories">
                  <strong>선택된 카테고리:</strong>
                  <div className="categories-display">
                    {editProject.categories.map((cat, index) => (
                      <span 
                        key={index} 
                        className="selected-category"
                        style={{ 
                          backgroundColor: 'black',
                          color: cat.color || '#007bff'
                        }}
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit-thumbnail">썸네일 이미지</label>
                <input
                  type="file"
                  id="edit-thumbnail"
                  accept="image/*"
                  onChange={(e) => handleEditImagePreview(e, 'thumbnail')}
                />
                {editThumbnailPreview && (
                  <div className="image-preview">
                    <img src={editThumbnailPreview} alt="썸네일 미리보기" />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="edit-mainImage">메인 이미지</label>
                <input
                  type="file"
                  id="edit-mainImage"
                  accept="image/*"
                  onChange={(e) => handleEditImagePreview(e, 'main')}
                />
                {editMainImagePreview && (
                  <div className="image-preview">
                    <img src={editMainImagePreview} alt="메인 이미지 미리보기" />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="edit-detailImages">상세 이미지들 (여러 장 한번에 선택 가능)</label>
                <input
                  type="file"
                  id="edit-detailImages"
                  accept="image/*"
                  onChange={(e) => handleEditImagePreview(e, 'detail')}
                  multiple
                />
                <div className="detail-images-preview">
                  {editDetailImagePreviews.map((preview, index) => (
                    <div key={index} className="detail-image-item">
                      <img src={preview} alt={`상세 이미지 ${index + 1}`} />
                      <button
                        type="button"
                        className="delete-image-button"
                        onClick={(e) => handleEditDetailImageDelete(index, e)}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {editProject.detailImages && editProject.detailImages.length > 0 && (
                <div className="detail-images-section">
                  <h4>기존 상세 이미지 순서 조정</h4>
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable
                      droppableId={`droppable-${editingProjectId}`}
                      direction="horizontal"
                      isDropDisabled={false}
                      isCombineEnabled={false}
                    >
                      {(provided, snapshot) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`detail-images-container ${
                            snapshot.isDraggingOver ? 'dragging-over' : ''
                          }`}
                        >
                          {editProject.detailImages.map((image, index) => (
                            <Draggable
                              key={`image-${index}`}
                              draggableId={`image-${index}`}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`detail-image-item ${
                                    snapshot.isDragging ? 'dragging' : ''
                                  }`}
                                >
                                  <img
                                    src={image.url}
                                    alt={`상세 이미지 ${index + 1}`}
                                    style={{
                                      width: '100px',
                                      height: '100px',
                                      objectFit: 'cover'
                                    }}
                                  />
                                  <div style={{ textAlign: 'center', marginTop: '4px' }}>
                                    {index + 1}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              )}

              <div className="modal-buttons">
                <button type="submit" className="save-button">저장</button>
                <button type="button" className="cancel-button" onClick={handleEditCancel}>
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectManagement; 