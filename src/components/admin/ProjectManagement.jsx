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
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addProject, getProjects, deleteProject, updateProjectImages, updateProject } from '../../services/projectService';
import { getCategories } from '../../services/categoryService';
import { getPresignedUrl } from '../../services/r2Service';
import { convertToEmbedUrl, isValidVideoUrl, detectVideoPlatform } from '../../utils/videoUtils';
import './ProjectManagement.css';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';

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
    linkUrl: '',
    linkButtonName: '',
    thumbnailUrl: '',
    mainImageUrl: '',
    detailMedia: [], // 이미지와 동영상을 함께 관리
    categories: []
  });
  const [newProject, setNewProject] = useState({
    title: '',
    detail: '',
    description: '',
    linkUrl: '',
    linkButtonName: '',
    thumbnailUrl: '',
    mainImageUrl: '',
    detailMedia: [], // 이미지와 동영상을 함께 관리
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

  // 이미지 미리보기 URL 상태 (URL.createObjectURL 사용)
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [mainImagePreview, setMainImagePreview] = useState('');
  const [detailImagePreviews, setDetailImagePreviews] = useState([]);

  // 수정용 이미지 미리보기 URL 상태
  const [editThumbnailPreview, setEditThumbnailPreview] = useState('');
  const [editMainImagePreview, setEditMainImagePreview] = useState('');
  const [editDetailImagePreviews, setEditDetailImagePreviews] = useState([]);

  // 동영상 URL 상태 추가
  const [videoUrl, setVideoUrl] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');

  // DnD sensors 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 컴포넌트 언마운트 시 미리보기 URL 정리
  useEffect(() => {
    return () => {
      // 미리보기 URL들 정리
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      detailImagePreviews.forEach(url => URL.revokeObjectURL(url));
      if (editThumbnailPreview) URL.revokeObjectURL(editThumbnailPreview);
      if (editMainImagePreview) URL.revokeObjectURL(editMainImagePreview);
      editDetailImagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // YouTube 비디오 ID 추출 함수
  const extractYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Vimeo 비디오 ID 추출 함수
  const extractVimeoVideoId = (url) => {
    const regExp = /(?:vimeo)\.com.*(?:videos|video|channels|)\/([\d]+)/i;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

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

  const handleImagePreview = async (e, type) => {
    try {
      if (type === 'detail') {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        for (const file of files) {
          // 파일 크기 검증
          validateFileSize(file);
          
          // 상세 이미지는 압축하지 않음 (원본 품질 유지)
          const previewUrl = URL.createObjectURL(file);
          
          setNewProject(prev => ({
            ...prev,
            detailMedia: [...prev.detailMedia, {
              type: 'image',
              url: previewUrl, // 임시 미리보기 URL
              file: file, // 원본 파일 사용
              order: prev.detailMedia.length
            }]
          }));
        }
      } else {
        const file = e.target.files[0];
        if (!file) return;

        // 파일 크기 검증
        validateFileSize(file);
        
        // 썸네일과 메인 이미지는 압축 (웹 최적화)
        const compressedFile = await compressImage(file);
        
        // URL.createObjectURL 사용
        const previewUrl = URL.createObjectURL(compressedFile);
        
        switch (type) {
          case 'thumbnail':
            setThumbnailPreview(previewUrl);
            setThumbnailFile(compressedFile);
            break;
          case 'main':
            setMainImagePreview(previewUrl);
            setMainImageFile(compressedFile);
            break;
          default:
            console.warn('Unknown image type:', type);
            break;
        }
      }
    } catch (error) {
      alert(error.message);
      e.target.value = ''; // 파일 입력 초기화
    }
  };

  const handleDetailImageDelete = (index) => {
    setDetailImagePreviews(prev => prev.filter((_, i) => i !== index));
    setDetailImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 동영상 URL 추가 함수
  const handleAddVideo = () => {
    if (!videoUrl.trim()) {
      alert('동영상 URL을 입력해주세요.');
      return;
    }

    if (!isValidVideoUrl(videoUrl)) {
      alert('유효한 유튜브 또는 비메오 URL을 입력해주세요.');
      return;
    }

    const embedUrl = convertToEmbedUrl(videoUrl);
    if (!embedUrl) {
      alert('URL을 변환할 수 없습니다. 올바른 URL인지 확인해주세요.');
      return;
    }

    const videoData = {
      type: 'video',
      url: embedUrl,
      originalUrl: videoUrl,
      platform: detectVideoPlatform(videoUrl),
      order: newProject.detailMedia.length
    };

    setNewProject(prev => ({
      ...prev,
      detailMedia: [...prev.detailMedia, videoData]
    }));

    setVideoUrl('');
  };

  // 수정 모드에서 동영상 URL 추가 함수
  const handleEditAddVideo = () => {
    if (!editVideoUrl.trim()) {
      alert('동영상 URL을 입력해주세요.');
      return;
    }

    let embedUrl = '';
    let platform = '';

    // YouTube URL 처리
    if (editVideoUrl.includes('youtube.com') || editVideoUrl.includes('youtu.be')) {
      const videoId = extractYouTubeVideoId(editVideoUrl);
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
        platform = 'YouTube';
      }
    }
    // Vimeo URL 처리
    else if (editVideoUrl.includes('vimeo.com')) {
      const videoId = extractVimeoVideoId(editVideoUrl);
      if (videoId) {
        embedUrl = `https://player.vimeo.com/video/${videoId}`;
        platform = 'Vimeo';
      }
    }

    if (!embedUrl) {
      alert('지원하지 않는 동영상 URL입니다. YouTube 또는 Vimeo URL을 입력해주세요.');
      return;
    }

    const newVideo = {
      type: 'video',
      url: embedUrl,
      platform: platform,
      originalUrl: editVideoUrl
    };

    setEditProject(prev => ({
      ...prev,
      detailMedia: [...(prev.detailMedia || []), newVideo]
    }));

    setEditVideoUrl('');
  };

  // 미디어 아이템 삭제 함수 (이미지와 동영상 모두 지원)
  const handleDetailMediaDelete = (index) => {
    setNewProject(prev => ({
      ...prev,
      detailMedia: prev.detailMedia.filter((_, i) => i !== index)
    }));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const activeId = active.id;
      const overId = over.id;
      const activeData = active.data.current;
      const overData = over.data.current;

      // 새 프로젝트 추가 시 상세 미디어 순서 변경
      if (activeData?.type === 'new-project-detail-media') {
        setNewProject(prev => {
          const oldIndex = parseInt(activeId.replace('new-media-', ''));
          const newIndex = parseInt(overId.replace('new-media-', ''));
          
          const newDetailMedia = arrayMove(prev.detailMedia, oldIndex, newIndex);
          return {
            ...prev,
            detailMedia: newDetailMedia
          };
        });
        return;
      }

      // 모달에서 편집 중인 경우
      if (showEditModal && editingProjectId && activeData?.type === 'edit-detail-media') {
        setEditProject(prev => {
          const oldIndex = parseInt(activeId.replace('edit-media-', ''));
          const newIndex = parseInt(overId.replace('edit-media-', ''));
          
          const newDetailMedia = arrayMove(prev.detailMedia, oldIndex, newIndex);
          
          // Firebase 업데이트
          updateProjectImages(editingProjectId, newDetailMedia).catch(error => {
            console.error('드래그 앤 드롭 업데이트 실패:', error);
            fetchProjects();
          });
          
          return {
            ...prev,
            detailMedia: newDetailMedia
          };
        });
        return;
      }

      // 프로젝트 목록 순서 변경
      if (activeData?.type === 'project-list') {
        const oldIndex = projects.findIndex(project => project.id === activeId);
        const newIndex = projects.findIndex(project => project.id === overId);
        
        const newProjects = arrayMove(projects, oldIndex, newIndex);
        
        // 순서 업데이트 (createdAt 필드로 최신 순서 유지)
        const now = new Date();
        const updatedProjects = newProjects.map((project, index) => {
          const newCreatedAt = new Date(now.getTime() - index * 1000);
          return {
            ...project,
            createdAt: newCreatedAt
          };
        });

        setProjects(updatedProjects);

        // Firestore에 createdAt 업데이트
        const batch = writeBatch(db);
        updatedProjects.forEach((project) => {
          const projectRef = doc(db, 'projects', project.id);
          batch.update(projectRef, { createdAt: project.createdAt });
        });
        batch.commit().catch(error => {
          console.error('프로젝트 순서 업데이트 실패:', error);
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const thumbnailUrl = await getPresignedUrl(thumbnailFile);
      const mainImageUrl = await getPresignedUrl(mainImageFile);
      
      // detailMedia 처리 (이미지와 동영상 모두)
      const detailMediaProcessed = await Promise.all(
        newProject.detailMedia.map(async (media, index) => {
          if (media.type === 'image' && media.file) {
            // 이미지인 경우 업로드
            const url = await getPresignedUrl(media.file);
            return {
              type: 'image',
              url,
              order: index
            };
          } else if (media.type === 'video') {
            // 동영상인 경우 embed URL 그대로 사용
            return {
              type: 'video',
              url: media.url,
              originalUrl: media.originalUrl,
              platform: media.platform,
              order: index
            };
          }
          return media;
        })
      );

      const projectData = {
        title: newProject.title,
        detail: newProject.detail,
        description: newProject.description,
        linkUrl: newProject.linkUrl,
        linkButtonName: newProject.linkButtonName,
        thumbnailUrl,
        mainImageUrl,
        detailMedia: detailMediaProcessed,
        categories: newProject.categories,
        createdAt: new Date()
      };

      await addProject(projectData);
      
      // 폼 초기화
      setNewProject({
        title: '',
        detail: '',
        description: '',
        linkUrl: '',
        linkButtonName: '',
        thumbnailUrl: '',
        mainImageUrl: '',
        detailMedia: [],
        categories: []
      });
      setThumbnailPreview('');
      setMainImagePreview('');
      setThumbnailFile(null);
      setMainImageFile(null);
      setVideoUrl('');
      
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
      linkUrl: project.linkUrl || '',
      linkButtonName: project.linkButtonName || '',
      thumbnailUrl: project.thumbnailUrl,
      mainImageUrl: project.mainImageUrl,
      detailMedia: project.detailMedia || [],
      categories: project.categories || []
    });
    
    // 기존 이미지 미리보기 설정
    setEditThumbnailPreview(project.thumbnailUrl);
    setEditMainImagePreview(project.mainImageUrl);
    setEditDetailImagePreviews(project.detailMedia?.map(media => media.url) || []);
    
    // 파일 상태 초기화
    setEditThumbnailFile(null);
    setEditMainImageFile(null);
    setEditDetailImageFiles([]);
    
    // 모달 열기
    setShowEditModal(true);
  };

  const handleEditCancel = () => {
    // 미리보기 URL들 정리
    if (editThumbnailPreview && editThumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editThumbnailPreview);
    }
    if (editMainImagePreview && editMainImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(editMainImagePreview);
    }
    editDetailImagePreviews.forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    setEditingProjectId(null);
    setShowEditModal(false);
    setEditProject({
      title: '',
      detail: '',
      description: '',
      linkUrl: '',
      linkButtonName: '',
      thumbnailUrl: '',
      mainImageUrl: '',
      detailMedia: [],
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

  const handleEditImagePreview = async (e, type) => {
    try {
      if (type === 'detail') {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        for (const file of files) {
          // 파일 크기 검증
          validateFileSize(file);
          
          // 상세 이미지는 압축하지 않음 (원본 품질 유지)
          const previewUrl = URL.createObjectURL(file);
          
          setEditDetailImagePreviews(prev => [...prev, previewUrl]);
          setEditDetailImageFiles(prev => [...prev, file]); // 원본 파일 사용
          
          // editProject.detailMedia에도 임시 항목 추가 (업로드 후 실제 URL로 교체됨)
          setEditProject(prev => ({
            ...prev,
            detailMedia: [...prev.detailMedia, {
              type: 'image',
              url: previewUrl, // 임시 미리보기 URL
              file: file, // 원본 파일 사용
              order: prev.detailMedia.length,
              isNew: true // 새로 추가된 항목임을 표시
            }]
          }));
        }
      } else {
        const file = e.target.files[0];
        if (!file) return;

        // 파일 크기 검증
        validateFileSize(file);
        
        // 썸네일과 메인 이미지는 압축 (웹 최적화)
        const compressedFile = await compressImage(file);
        
        // URL.createObjectURL 사용
        const previewUrl = URL.createObjectURL(compressedFile);
        
        switch (type) {
          case 'thumbnail':
            setEditThumbnailPreview(previewUrl);
            setEditThumbnailFile(compressedFile);
            break;
          case 'main':
            setEditMainImagePreview(previewUrl);
            setEditMainImageFile(compressedFile);
            break;
          default:
            console.warn('Unknown image type:', type);
            break;
        }
      }
    } catch (error) {
      alert(error.message);
      e.target.value = ''; // 파일 입력 초기화
    }
  };

  const handleEditDetailMediaDelete = (index, event) => {
    // 이벤트 전파 방지 (드래그 방해하지 않도록)
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // editProject.detailMedia에서 해당 항목 삭제
    setEditProject(prev => ({
      ...prev,
      detailMedia: prev.detailMedia.filter((_, i) => i !== index)
    }));
    
    // 새로 추가된 이미지인 경우에만 미리보기와 파일 상태 업데이트
    const deletedMedia = editProject.detailMedia[index];
    if (deletedMedia && deletedMedia.isNew && deletedMedia.type === 'image') {
      setEditDetailImagePreviews(prev => {
        const newPreviews = [];
        let previewIndex = 0;
        
        for (let i = 0; i < editProject.detailMedia.length; i++) {
          if (i !== index) {
            if (editProject.detailMedia[i].isNew && editProject.detailMedia[i].type === 'image') {
              newPreviews.push(prev[previewIndex]);
              previewIndex++;
            }
          } else {
            if (editProject.detailMedia[i].isNew && editProject.detailMedia[i].type === 'image') {
              previewIndex++;
            }
          }
        }
        
        return newPreviews;
      });
      
      setEditDetailImageFiles(prev => {
        const newFiles = [];
        let fileIndex = 0;
        
        for (let i = 0; i < editProject.detailMedia.length; i++) {
          if (i !== index) {
            if (editProject.detailMedia[i].isNew && editProject.detailMedia[i].type === 'image') {
              newFiles.push(prev[fileIndex]);
              fileIndex++;
            }
          } else {
            if (editProject.detailMedia[i].isNew && editProject.detailMedia[i].type === 'image') {
              fileIndex++;
            }
          }
        }
        
        return newFiles;
      });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      let thumbnailUrl = editProject.thumbnailUrl;
      let mainImageUrl = editProject.mainImageUrl;
      let detailMedia = [...editProject.detailMedia];

      // 새 썸네일 이미지가 있으면 업로드
      if (editThumbnailFile) {
        thumbnailUrl = await getPresignedUrl(editThumbnailFile);
      }

      // 새 메인 이미지가 있으면 업로드
      if (editMainImageFile) {
        mainImageUrl = await getPresignedUrl(editMainImageFile);
      }

      // 새로 추가된 상세 이미지들을 실제 URL로 교체
      const updatedDetailMedia = await Promise.all(
        detailMedia.map(async (media, index) => {
          if (media.isNew && media.file) {
            // 새로 추가된 이미지인 경우 실제 URL로 업로드
            const url = await getPresignedUrl(media.file);
            return {
              type: 'image',
              url: url,
              order: index
            };
          } else {
            // 기존 이미지인 경우 그대로 유지
            return {
              ...media,
              order: index
            };
          }
        })
      );

      const projectData = {
        title: editProject.title,
        detail: editProject.detail,
        description: editProject.description,
        linkUrl: editProject.linkUrl,
        linkButtonName: editProject.linkButtonName,
        thumbnailUrl,
        mainImageUrl,
        detailMedia: updatedDetailMedia,
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
      <div className="project-header">
        <h1>프로젝트 관리</h1>
      </div>

      {/* 새 프로젝트 추가 폼 */}
      <div className="project-section">
        <h2>새 프로젝트 추가</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="project-form-group">
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

                    <div className="project-form-group">
            <label htmlFor="description">프로젝트 간단 설명</label>
            <input
              type="text"
              id="description"
              name="description"
              value={newProject.description}
              onChange={handleInputChange}
              required
              placeholder="웹, 2025, 클라이언트"
            />
          </div>
          
          <div className="project-form-group">
            <label htmlFor="detail">프로젝트 상세 설명</label>
            <textarea
              id="detail"
              name="detail"
              value={newProject.detail}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="project-form-group">
            <label htmlFor="linkUrl">링크 URL (선택사항)</label>
            <input
              type="url"
              id="linkUrl"
              name="linkUrl"
              value={newProject.linkUrl}
              onChange={handleInputChange}
              placeholder="https://example.com"
            />
          </div>

          <div className="project-form-group">
            <label htmlFor="linkButtonName">버튼 이름 (선택사항)</label>
            <input
              type="text"
              id="linkButtonName"
              name="linkButtonName"
              value={newProject.linkButtonName}
              onChange={handleInputChange}
              placeholder="프로젝트 보기"
            />
          </div>


          <div className="project-form-group">
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
          </div>

          <div className="project-form-group">
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

          <div className="project-form-group">
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

          <div className="project-form-group">
            <label htmlFor="detailImages">상세 이미지들 (여러 장 한번에 선택 가능)</label>
            <input
              type="file"
              id="detailImages"
              accept="image/*"
              onChange={(e) => handleImagePreview(e, 'detail')}
              multiple
            />
          </div>

          {/* 동영상 URL 추가 */}
          <div className="project-form-group">
            <label htmlFor="videoUrl">동영상 URL 추가 (유튜브/비메오)</label>
            <div className="video-input-container">
              <input
                type="url"
                id="videoUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... 또는 https://vimeo.com/..."
              />
              <button
                type="button"
                onClick={handleAddVideo}
                className="add-video-button"
              >
                동영상 추가
              </button>
            </div>
          </div>

          {/* 상세 미디어 (이미지 + 동영상) 순서 조정 */}
          {newProject.detailMedia.length > 0 && (
            <div className="admin-detail-media-section">
              <h4>상세 미디어 순서 조정</h4>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                                  <SortableContext
                    items={newProject.detailMedia.map((media, index) => `new-media-${index}`)}
                    strategy={rectSortingStrategy}
                  >
                  <div className="admin-detail-media-container">
                    {newProject.detailMedia.map((media, index) => (
                      <SortableItem
                        key={`new-media-${index}`}
                        id={`new-media-${index}`}
                        className="admin-detail-media-item"
                        data={{ type: 'new-project-detail-media' }}
                      >
                        {media.type === 'image' ? (
                          <img 
                            src={media.url} 
                            alt={`상세 이미지 ${index + 1}`}
                            style={{
                              width: '200px',
                              height: '200px',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div className="video-preview">
                            <iframe
                              src={media.url}
                              width="100"
                              height="75"
                              frameBorder="0"
                              allowFullScreen
                              title={`동영상 ${index + 1}`}
                            />
                            <div className="video-info">
                              <span className="video-platform">{media.platform}</span>
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          className="delete-media-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDetailMediaDelete(index);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          ×
                        </button>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          <button type="submit" className="submit-button">프로젝트 추가</button>
        </form>
      </div>

      {/* 프로젝트 목록 */}
      <div className="project-section">
        <h2>프로젝트 목록 (드래그하여 순서 변경)</h2>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={projects.map(project => project.id)}
            strategy={rectSortingStrategy}
          >
            <div className="project-list-simple">
              {projects.map((project, index) => (
                <SortableItem
                  key={project.id}
                  id={project.id}
                  className="project-list-item"
                  data={{ type: 'project-list' }}
                >
                  <div className="project-thumbnail">
                    {project.thumbnailUrl ? (
                      <img 
                        src={project.thumbnailUrl} 
                        alt={`${project.title} 썸네일`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="thumbnail-placeholder" style={{ display: project.thumbnailUrl ? 'none' : 'flex' }}>
                      📷
                    </div>
                  </div>
                  <div className="project-info">
                    <span className="project-title">{project.title}</span>
                  </div>
                  <div className="project-actions-wrapper">
                    <div className="project-actions" onMouseDown={(e) => e.stopPropagation()}>
                      <button
                        className="edit-button"
                        draggable={false}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setTimeout(() => {
                            handleEditStart(project);
                          }, 0);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onDragStart={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        수정
                      </button>
                      <button
                        className="delete-button"
                        draggable={false}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setTimeout(() => {
                            handleDelete(project.id);
                          }, 0);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onDragStart={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* 수정 모달 */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>프로젝트 수정</h2>
              <button className="modal-close" onClick={handleEditCancel}>×</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="project-form-group">
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
              
              <div className="project-form-group">
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

              <div className="project-form-group">
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

              <div className="project-form-group">
                <label htmlFor="edit-linkUrl">링크 URL (선택사항)</label>
                <input
                  type="url"
                  id="edit-linkUrl"
                  name="linkUrl"
                  value={editProject.linkUrl}
                  onChange={handleEditInputChange}
                  placeholder="https://example.com"
                />
              </div>

              <div className="project-form-group">
                <label htmlFor="edit-linkButtonName">버튼 이름 (선택사항)</label>
                <input
                  type="text"
                  id="edit-linkButtonName"
                  name="linkButtonName"
                  value={editProject.linkButtonName}
                  onChange={handleEditInputChange}
                  placeholder="프로젝트 보기"
                />
              </div>

              <div className="project-form-group">
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
              </div>

              <div className="project-form-group">
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

              <div className="project-form-group">
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

              <div className="project-form-group">
                <label htmlFor="edit-detailImages">상세 이미지들 (여러 장 한번에 선택 가능)</label>
                <input
                  type="file"
                  id="edit-detailImages"
                  accept="image/*"
                  onChange={(e) => handleEditImagePreview(e, 'detail')}
                  multiple
                />
                <div className="admin-detail-images-preview">
                  {editProject.detailMedia.map((media, index) => (
                    <div key={index} className="admin-detail-image-item">
                      {media.type === 'image' ? (
                        <img src={media.url} alt={`상세 이미지 ${index + 1}`} />
                      ) : media.type === 'video' ? (
                        <div className="video-preview">
                          <iframe
                            src={media.url}
                            title={`동영상 ${index + 1}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ width: '100px', height: '100px' }}
                          />
                        </div>
                      ) : null}
                      <div className="media-info">
                        <span className="media-type">{media.type === 'image' ? '이미지' : '동영상'}</span>
                        {media.isNew && <span className="new-badge">새로 추가</span>}
                      </div>
                      <button
                        type="button"
                        className="delete-image-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditDetailMediaDelete(index, e);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 동영상 URL 추가 */}
              <div className="project-form-group">
                <label htmlFor="edit-video-url">동영상 URL 추가 (YouTube, Vimeo)</label>
                <div className="video-url-input">
                  <input
                    type="url"
                    id="edit-video-url"
                    value={editVideoUrl}
                    onChange={(e) => setEditVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... 또는 https://vimeo.com/..."
                  />
                  <button
                    type="button"
                    className="add-video-button"
                    onClick={handleEditAddVideo}
                  >
                    동영상 추가
                  </button>
                </div>
              </div>

              {editProject.detailMedia && editProject.detailMedia.length > 0 && (
                <div className="admin-detail-images-section">
                  <h4>기존 상세 이미지 순서 조정</h4>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={editProject.detailMedia.map((media, index) => `edit-media-${index}`)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="admin-detail-images-container">
                        {editProject.detailMedia.map((media, index) => (
                          <SortableItem
                            key={`edit-media-${index}`}
                            id={`edit-media-${index}`}
                            className="admin-detail-image-item"
                            data={{ type: 'edit-detail-media' }}
                          >
                            {media.type === 'image' ? (
                              <img
                                src={media.url}
                                alt={`상세 이미지 ${index + 1}`}
                                style={{
                                  width: '100px',
                                  height: '100px',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : media.type === 'video' ? (
                              <div className="video-preview">
                                <iframe
                                  src={media.url}
                                  title={`동영상 ${index + 1}`}
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  style={{ width: '100px', height: '100px' }}
                                />
                              </div>
                            ) : null}
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
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