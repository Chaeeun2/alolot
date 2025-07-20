import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import AdminLayout from '../components/AdminLayout';
import { newsService } from '../services/dataService';
import { imageService } from '../services/imageService';
import '../styles/admin.css';

// TinyMCE 리치텍스트 에디터 컴포넌트
function RichEditor({ content, setContent }) {
  // API 키가 없으면 개발 모드에서는 작동하지만 경고 메시지가 나타남
  const apiKey = process.env.REACT_APP_TINYMCE_API_KEY || 'no-api-key';

  return (
    <Editor
      apiKey={apiKey}
      value={content}
      init={{
        height: 400,
        menubar: false,
        plugins: [
          'lists',
          'link',
          'table',
          'code',
          'advlist'
        ],
        toolbar: 'undo redo | ' +
          'bold italic underline forecolor backcolor | ' +
          'alignleft aligncenter alignright alignjustify | ' +
          'bullist numlist | link table | code',
        formats: {
          forecolor: { inline: 'span', styles: { color: '%value' } },
          backcolor: { inline: 'span', styles: { 'background-color': '%value' } }
        },
        base_url: 'https://cdn.jsdelivr.net/npm/tinymce@6.8.3',
        setup: (editor) => {
          editor.on('init', () => {
            const container = editor.getContainer();
            const editorElement = editor.getBody();
            
            const passiveEvents = ['scroll', 'wheel', 'touchstart', 'touchmove'];
            passiveEvents.forEach(eventType => {
              container.addEventListener(eventType, () => {}, { passive: true });
              editorElement.addEventListener(eventType, () => {}, { passive: true });
            });
          });
        },
        content_style: `
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            font-size: 18px; 
            line-height: 1.7; 
            margin: 16px; 
            padding: 0; 
            color: black; 
            background-color: #ffffff;
          }
          p { 
            margin: 0; 
            font-size: 18px; 
            line-height: 1.7;
            color: black;
            font-weight: 400;
          }
          h1, h2, h3, h4, h5, h6 { 
            margin: 0; 
            font-weight: bold; 
            line-height: 1.5; 
          }
          h1 { font-size: 28px; }
          h2 { font-size: 26px; }
          h3 { font-size: 24px; }
          h4 { font-size: 22px; }
          h5 { font-size: 20px; }
          h6 { font-size: 18px; }
          ul, ol { 
            margin: 0 0 0; 
            padding-left: 15px; 
          }
          li { 
            margin-bottom: 0; 
            line-height: 1.7; 
          }
          blockquote { 
            margin: 16px 0; 
            padding: 12px 16px; 
            border-left: 4px solid #ddd; 
            background-color: #f9f9f9; 
            font-style: italic; 
          }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 16px 0; 
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px 12px; 
            text-align: left; 
          }
          th { 
            background-color: #f5f5f5; 
            font-weight: bold; 
          }
          img { 
            max-width: 100%; 
            height: auto; 
            margin: 20px 0; 
          }
          a { 
            color: black; 
            text-decoration: underline; 
          }
          code { 
            background-color: #f4f4f4; 
            padding: 2px 4px; 
            border-radius: 3px; 
            font-family: 'Courier New', monospace; 
            font-size: 14px; 
          }
          pre { 
            background-color: #f4f4f4; 
            padding: 16px; 
            border-radius: 5px; 
            overflow-x: auto; 
            margin: 16px 0; 
          }
          pre code { 
            background-color: transparent; 
            padding: 0; 
          }
        `,
        branding: false,
        promotion: false,
        resize: false,
        statusbar: false,
        browser_spellcheck: true,
        contextmenu: false,
        paste_data_images: true,
        paste_as_text: false,
        paste_webkit_styles: 'all',
        paste_merge_formats: true,
        paste_preprocess: function(plugin, args) {
          const allowedStyles = [
            'color', 'font-size', 'text-decoration', 'font-weight',
            'text-align', 'text-align-last', 'text-justify'
          ];
          args.content = args.content.replace(/style="([^"]*)"/g, (match, styleStr) => {
            const filtered = styleStr
              .split(';')
              .map(s => s.trim())
              .filter(s => allowedStyles.some(a => s.startsWith(a)))
              .join('; ');
            return filtered ? `style="${filtered}"` : '';
          });
        },
        default_link_target: '_blank',
        link_assume_external_targets: true,
        link_default_protocol: 'https',
        onboarding: false,
        quickbars_selection_toolbar: false,
        quickbars_insert_toolbar: false,
        quickbars_image_toolbar: false
      }}
      onEditorChange={(newValue) => setContent(newValue)}
    />
  );
}

// 뉴스 모달 컴포넌트
function NewsModal({ isOpen, onClose, news, onSave, loading }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);

  useEffect(() => {
    if (news) {
      // 수정 모드
      setTitle(news.title || '');
      setContent(news.content || '');
      setImages(news.images || []);
      setFiles(news.files || []);
    } else {
      // 새 뉴스 모드
      setTitle('');
      setContent('');
      setImages([]);
      setFiles([]);
    }
  }, [news, isOpen]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        try {
          imageService.validateImageFile(file);
          const result = await imageService.uploadImage(file, {
            source: 'news',
            uploadedAt: new Date().toISOString()
          });
          return result.success ? result.publicUrl : null;
        } catch (error) {
          console.error('이미지 업로드 실패:', file.name, error);
          alert(`${file.name} 업로드 실패: ${error.message}`);
          return null;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(url => url !== null);
      
      setImages(prev => [...prev, ...validUrls]);
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      e.target.value = ''; // 파일 입력 초기화
    }
  };

  const handleRemoveImage = async (index) => {
    const imageUrl = images[index];
    
    // R2에서 이미지 삭제
    try {
      const key = imageService.extractKeyFromUrl(imageUrl);
      if (key) {
        await imageService.deleteImage(key);
      }
    } catch (error) {
      console.warn('이미지 삭제 실패:', error);
      // 에러가 발생해도 state에서는 제거 (이미 삭제된 파일일 수도 있음)
    }
    
    // state에서 제거
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (uploadedFiles.length === 0) return;

    // 최대 5개 제한 확인
    if (files.length + uploadedFiles.length > 5) {
      alert('첨부파일은 최대 5개까지 업로드 가능합니다.');
      e.target.value = '';
      return;
    }

    setFileUploading(true);
    try {
      const uploadPromises = uploadedFiles.map(async (file) => {
        try {
          // 파일 포맷 검증
          const allowedExtensions = ['gif', 'jpg', 'jpeg', 'png', 'webp', 'pdf', 'hwp', 'docx', 'doc', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'];
          const fileExtension = file.name.split('.').pop().toLowerCase();
          
          if (!allowedExtensions.includes(fileExtension)) {
            throw new Error(`지원되지 않는 파일 형식입니다. (${allowedExtensions.join(', ').toUpperCase()}만 허용)`);
          }

          // 파일 크기 확인 (10MB 제한)
          if (file.size > 10 * 1024 * 1024) {
            throw new Error('파일 크기는 10MB 이하여야 합니다.');
          }

          const result = await imageService.uploadFile(file, {
            source: 'news-files',
            uploadedAt: new Date().toISOString()
          });

          if (result.success) {
            // 파일 크기를 적절한 단위로 변환
            const formatFileSize = (bytes) => {
              if (bytes === 0) return '0 Bytes';
              const k = 1024;
              const sizes = ['Bytes', 'KB', 'MB', 'GB'];
              const i = Math.floor(Math.log(bytes) / Math.log(k));
              return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
            };

            return {
              name: file.name,
              url: result.publicUrl,
              size: formatFileSize(file.size)
            };
          }
          return null;
        } catch (error) {
          console.error('파일 업로드 실패:', file.name, error);
          alert(`${file.name} 업로드 실패: ${error.message}`);
          return null;
        }
      });

      const uploadedFileData = await Promise.all(uploadPromises);
      const validFiles = uploadedFileData.filter(file => file !== null);
      
      setFiles(prev => [...prev, ...validFiles]);
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setFileUploading(false);
      e.target.value = ''; // 파일 입력 초기화
    }
  };

  const handleRemoveFile = async (index) => {
    const file = files[index];
    
    // R2에서 파일 삭제
    try {
      const key = imageService.extractKeyFromUrl(file.url);
      if (key) {
        await imageService.deleteImage(key); // 파일도 deleteImage 함수로 삭제 가능
      }
    } catch (error) {
      console.warn('파일 삭제 실패:', error);
      // 에러가 발생해도 state에서는 제거 (이미 삭제된 파일일 수도 있음)
    }
    
    // state에서 제거
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    
    if (!content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    const newsData = {
      title: title.trim(),
      content: content.trim(),
      images,
      files
    };

    await onSave(newsData);
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-content admin-modal-large" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{news ? '뉴스 수정' : '새 뉴스 작성'}</h3>
                    {/* 버튼 */}
          <div className="admin-form-actions">
            <button
              type="button"
              onClick={onClose}
              className="admin-button admin-button-secondary"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="admin-button admin-button-primary"
              disabled={loading || uploading}
            >
              {loading ? '저장 중...' : news ? '수정' : '저장'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-body">
            <div className="admin-form-column">
              {/* 제목 */}
              <div className="admin-form-group">
                <label>제목</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="뉴스 제목을 입력하세요"
                  className="admin-input"
                  disabled={loading}
                  required
                />
              </div>


            </div>

            <div className="admin-form-column">
              {/* 이미지 업로드 */}
              <div className="admin-form-group">
                <label>이미지</label>
                <div className="admin-upload-button-container">
                  <input
                    type="file"
                    id="news-images"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleImageUpload}
                    disabled={loading || uploading}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('news-images').click()}
                    className="admin-button admin-button-secondary"
                    disabled={loading || uploading}
                  >
                    {uploading ? '업로드 중...' : '이미지 추가'}
                  </button>
                  <small className="admin-upload-caption">
                    지원 포맷: JPG, PNG, WebP, GIF ㅣ 최대 용량: 2MB
                  </small>
                </div>

                {/* 업로드된 이미지 미리보기 */}
                {images.length > 0 && (
                              <div className="admin-image-grid">
                                   <div className="admin-image-grid-display">
                    {images.map((imageUrl, index) => (
                      <div key={index} className="admin-image-item">
                        <img src={imageUrl} alt={`이미지 ${index + 1}`} />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="admin-image-remove"
                          disabled={loading}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                                  </div>
                                  </div>
                )}
              </div>
            </div>

          {/* 내용 에디터 */}
          <div className="admin-form-group">
            <label>내용</label>
            <RichEditor content={content} setContent={setContent} />
                  </div>
                  
                            {/* 첨부파일 업로드 */}
          <div style={{marginTop: '30px'}} className="admin-form-group">
            <label>첨부파일 (최대 5개)</label>
            <div className="admin-upload-button-container">
              <input
                type="file"
                id="news-files"
                accept=".gif,.jpg,.jpeg,.png,.webp,.pdf,.hwp,.docx,.doc,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                multiple
                onChange={handleFileUpload}
                disabled={loading || fileUploading || files.length >= 5}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('news-files').click()}
                className="admin-button admin-button-secondary"
                disabled={loading || fileUploading || files.length >= 5}
              >
                {fileUploading ? '업로드 중...' : '파일 추가'}
              </button>
            </div>

            {/* 업로드된 파일 목록 */}
            {files.length > 0 && (
              <div className="admin-file-list">
                {files.map((file, index) => (
                  <div key={index} className="admin-file-item">
                    <div className="admin-file-info">
                      <span className="admin-file-name">{file.name}</span>
                      <span className="admin-file-size">{file.size}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="admin-button admin-button-small admin-button-danger"
                      disabled={loading}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const NewsManager = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const itemsPerPage = 10;

  // 뉴스 목록 로드
  useEffect(() => {
    loadNews();
  }, [currentPage]);

  const loadNews = async () => {
    try {
      setLoading(true);
      const result = await newsService.getNews({
        page: currentPage,
        limit: itemsPerPage
      });
      
      setNewsList(result.news);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('뉴스 로딩 실패:', error);
      alert('뉴스를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newsData) => {
    try {
      setSaveLoading(true);
      
      if (editingNews) {
        // 수정
        await newsService.updateNews(editingNews.id, newsData);
      } else {
        // 새 뉴스 추가
        await newsService.addNews(newsData);
      }
      
      setModalOpen(false);
      setEditingNews(null);
      await loadNews();
    } catch (error) {
      console.error('뉴스 저장 실패:', error);
      alert('뉴스 저장에 실패했습니다.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEdit = (news) => {
    setEditingNews(news);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      // 뉴스 데이터 먼저 가져오기 (관련 파일 URL 확인용)
      const newsToDelete = newsList.find(news => news.id === id);
      
      // Firebase에서 뉴스 삭제
      await newsService.deleteNews(id);
      
      // 관련 파일들 R2에서 삭제
      if (newsToDelete) {
        const deletePromises = [];
        
        // 이미지들 삭제
        if (newsToDelete.images && newsToDelete.images.length > 0) {
          newsToDelete.images.forEach(imageUrl => {
            const key = imageService.extractKeyFromUrl(imageUrl);
            if (key) {
              deletePromises.push(
                imageService.deleteImage(key).catch(err => 
                  console.warn('이미지 삭제 실패:', imageUrl, err)
                )
              );
            }
          });
        }
        
        // 첨부파일들 삭제
        if (newsToDelete.files && newsToDelete.files.length > 0) {
          newsToDelete.files.forEach(file => {
            const key = imageService.extractKeyFromUrl(file.url);
            if (key) {
              deletePromises.push(
                imageService.deleteImage(key).catch(err => 
                  console.warn('파일 삭제 실패:', file.url, err)
                )
              );
            }
          });
        }
        
        // 모든 파일 삭제 작업 병렬 실행 (에러가 발생해도 계속 진행)
        if (deletePromises.length > 0) {
          await Promise.allSettled(deletePromises);
        }
      }
      
      await loadNews();
    } catch (error) {
      console.error('뉴스 삭제 실패:', error);
      alert('뉴스 삭제에 실패했습니다.');
    }
  };

  const handleNewNews = () => {
    setEditingNews(null);
    setModalOpen(true);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp?.toDate) {
      date = timestamp.toDate(); // Firestore Timestamp
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <AdminLayout>
      <div className="admin-content">
        <h2 className="admin-page-title">NEWS 관리</h2>
        
        <div className="admin-content-layout">
          <div className="admin-content-main">
            <div className="admin-content-header">
              <div className="admin-content-title-section">
                <h3 className="admin-content-title">News 목록</h3>
              </div>
              <div className="admin-header-buttons">
                <button
                  onClick={handleNewNews}
                  className="admin-button admin-button-primary"
                >
                  새 뉴스 작성
                </button>
              </div>
            </div>

            {loading ? (
              <div className="admin-loading-state">
                <p>로딩 중...</p>
              </div>
            ) : newsList.length === 0 ? (
              <div className="admin-empty-state">
                <p>등록된 뉴스가 없습니다.</p>
                <button
                  onClick={handleNewNews}
                  className="admin-button admin-button-primary"
                >
                  첫 번째 뉴스 작성하기
                </button>
              </div>
            ) : (
              <>
                {/* 뉴스 목록 */}
                <div className="admin-table-container">
                  <table className="admin-table">
                    <tbody>
                      {newsList.map((news, index) => (
                        <tr key={news.id}>
                          <td style={{width: '50px'}}>{totalCount - ((currentPage - 1) * itemsPerPage) - index}</td>
                          <td className="admin-table-title" style={{width: '80%'}}>
                            {news.title}
                          </td>
                          <td style={{minWidth: '250px', width: '250px', fontSize: '16px'}}>{formatDate(news.createdAt)}</td>
                          <td style={{minWidth: '150px', width: '150px', padding: '20px 0'}}>
                            <div className="admin-table-actions">
                              <button
                                onClick={() => handleEdit(news)}
                                className="admin-button admin-button-small admin-button-secondary"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(news.id)}
                                className="admin-button admin-button-small admin-button-danger"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="admin-pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="admin-button admin-button-secondary admin-button-small"
                    >
                      이전
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`admin-button admin-button-small ${
                          currentPage === page ? 'admin-button-primary' : 'admin-button-secondary'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="admin-button admin-button-secondary admin-button-small"
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 뉴스 모달 */}
        <NewsModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingNews(null);
          }}
          news={editingNews}
          onSave={handleSave}
          loading={saveLoading}
        />
      </div>
    </AdminLayout>
  );
};

export default NewsManager; 