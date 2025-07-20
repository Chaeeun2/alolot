import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import ImageUploader from '../components/ImageUploader';
import { contentService } from '../services/dataService';
import { imageService } from '../services/imageService';

export default function ContentEditor() {
  const navigate = useNavigate();
  const { id } = useParams(); // 편집 모드일 때 콘텐츠 ID
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'architecture',
    content: '',
    description: '',
    status: 'draft',
    mainImage: '',
    thumbnailImage: '',
    galleryImages: [],
    tags: []
  });

  const [uploadedImages, setUploadedImages] = useState({
    main: null,
    thumbnail: null,
    gallery: []
  });

  const categories = [
    { value: 'architecture', label: '건축' },
    { value: 'art', label: '아트' },
    { value: 'design', label: '디자인' },
    { value: 'news', label: '뉴스' }
  ];

  useEffect(() => {
    if (isEditMode) {
      loadContent();
    }
  }, [id, isEditMode]);

  async function loadContent() {
    try {
      setLoading(true);
      const content = await contentService.getContent(id);
      setFormData(content);
    } catch (error) {
      console.error('콘텐츠 로딩 실패:', error);
      setError('콘텐츠를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTagsChange = (e) => {
    const tagsString = e.target.value;
    const tagsArray = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({
      ...prev,
      tags: tagsArray
    }));
  };

  // 메인 이미지 업로드 완료
  const handleMainImageUpload = (result) => {
    setUploadedImages(prev => ({ ...prev, main: result }));
    setFormData(prev => ({
      ...prev,
      mainImage: result.publicUrl
    }));
  };

  // 썸네일 이미지 업로드 완료  
  const handleThumbnailImageUpload = (result) => {
    setUploadedImages(prev => ({ ...prev, thumbnail: result }));
    setFormData(prev => ({
      ...prev,
      thumbnailImage: result.thumbnailUrl
    }));
  };

  // 갤러리 이미지 업로드 완료
  const handleGalleryImagesUpload = (results) => {
    const galleryUrls = results.map(result => result.publicUrl);
    setUploadedImages(prev => ({ ...prev, gallery: results }));
    setFormData(prev => ({
      ...prev,
      galleryImages: [...prev.galleryImages, ...galleryUrls]
    }));
  };

  // 갤러리 이미지 삭제
  const removeGalleryImage = async (index, imageId) => {
    try {
      if (imageId) {
        await imageService.deleteImage(imageId);
      }
      
      setFormData(prev => ({
        ...prev,
        galleryImages: prev.galleryImages.filter((_, i) => i !== index)
      }));
      
      setUploadedImages(prev => ({
        ...prev,
        gallery: prev.gallery.filter((_, i) => i !== index)
      }));
    } catch (error) {
      console.error('이미지 삭제 실패:', error);
      alert('이미지 삭제에 실패했습니다.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEditMode) {
        await contentService.updateContent(id, formData);
        alert('콘텐츠가 수정되었습니다.');
      } else {
        await contentService.addContent(formData);
        alert('콘텐츠가 생성되었습니다.');
      }
      
      navigate('/admin/content');
    } catch (error) {
      console.error('콘텐츠 저장 실패:', error);
      setError('콘텐츠 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('변경사항이 저장되지 않을 수 있습니다. 정말 취소하시겠습니까?')) {
      navigate('/admin/content');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-content">
          <div className="admin-loading">콘텐츠를 불러오는 중...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-content">
        <h2 className="admin-page-title">
          {isEditMode ? '콘텐츠 편집' : '새 콘텐츠 작성'}
        </h2>
        
        {error && (
          <div className="admin-error-message">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="admin-content-editor-form">
          {/* 기본 정보 */}
          <div className="admin-form-section">
            <h3>기본 정보</h3>
            
            <div className="admin-form-group">
              <label htmlFor="title">제목 *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="admin-input"
                required
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label htmlFor="category">카테고리</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="admin-input"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label htmlFor="status">상태</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="admin-input"
                >
                  <option value="draft">임시저장</option>
                  <option value="published">게시</option>
                </select>
              </div>
            </div>

            <div className="admin-form-group">
              <label htmlFor="description">설명</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="admin-input"
                rows="3"
                placeholder="콘텐츠에 대한 간단한 설명을 입력하세요"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="tags">태그 (쉼표로 구분)</label>
              <input
                type="text"
                id="tags"
                value={formData.tags.join(', ')}
                onChange={handleTagsChange}
                className="admin-input"
                placeholder="건축, 모던, 주거공간"
              />
            </div>
          </div>

          {/* 이미지 업로드 */}
          <div className="admin-form-section">
            <h3>이미지 관리</h3>
            
            {/* 메인 이미지 */}
            <div className="admin-image-upload-section">
              <h4>메인 이미지</h4>
              {formData.mainImage ? (
                <div className="admin-current-image">
                  <img src={formData.mainImage} alt="메인 이미지" />
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({ ...prev, mainImage: '' }))}
                    className="admin-remove-image-btn"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <ImageUploader
                  onUploadComplete={handleMainImageUpload}
                  multiple={false}
                />
              )}
            </div>

            {/* 썸네일 이미지 */}
            <div className="admin-image-upload-section">
              <h4>썸네일 이미지</h4>
              {formData.thumbnailImage ? (
                <div className="admin-current-image thumbnail">
                  <img src={formData.thumbnailImage} alt="썸네일 이미지" />
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({ ...prev, thumbnailImage: '' }))}
                    className="admin-remove-image-btn"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <ImageUploader
                  onUploadComplete={handleThumbnailImageUpload}
                  multiple={false}
                />
              )}
            </div>

            {/* 갤러리 이미지 */}
            <div className="admin-image-upload-section">
              <h4>갤러리 이미지</h4>
              
              {formData.galleryImages.length > 0 && (
                <div className="admin-gallery-images">
                  {formData.galleryImages.map((imageUrl, index) => (
                    <div key={index} className="admin-gallery-image-item">
                      <img src={imageUrl} alt={`갤러리 이미지 ${index + 1}`} />
                      <button 
                        type="button" 
                        onClick={() => removeGalleryImage(index)}
                        className="admin-remove-image-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <ImageUploader
                onUploadComplete={handleGalleryImagesUpload}
                multiple={true}
                maxFiles={10}
              />
            </div>
          </div>

          {/* 콘텐츠 내용 */}
          <div className="admin-form-section">
            <h3>콘텐츠 내용</h3>
            <div className="admin-form-group">
              <label htmlFor="content">내용</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                className="admin-input admin-content-textarea"
                rows="15"
                placeholder="콘텐츠 내용을 입력하세요..."
              />
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="admin-form-actions">
            <button 
              type="button" 
              onClick={handleCancel}
              className="admin-button secondary"
              disabled={saving}
            >
              취소
            </button>
            <button 
              type="submit" 
              className="admin-button"
              disabled={saving}
            >
              {saving ? '저장 중...' : (isEditMode ? '수정 완료' : '콘텐츠 생성')}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
} 