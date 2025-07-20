import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { contentService } from '../services/dataService';

export default function ContentManager() {
  const navigate = useNavigate();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadContents();
  }, []);

  async function loadContents() {
    try {
      setLoading(true);
      const data = await contentService.getContents();
      setContents(data);
    } catch (error) {
      console.error('콘텐츠 로딩 실패:', error);
      // 로딩 실패 시 기본값 사용
      setContents([
        { 
          id: 'sample1', 
          title: '샘플 건축 프로젝트', 
          type: 'architecture',
          createdAt: { toDate: () => new Date() },
          status: 'published'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        setLoading(true);
        await contentService.deleteContent(id);
        await loadContents(); // 목록 새로고침
      } catch (error) {
        console.error('콘텐츠 삭제 실패:', error);
        alert('삭제에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }
  };

  const categories = [
    { value: 'all', label: '전체' },
    { value: 'architecture', label: '건축' },
    { value: 'art', label: '아트' },
    { value: 'design', label: '디자인' }
  ];

  const filteredContents = selectedCategory === 'all' 
    ? contents 
    : contents.filter(content => content.type === selectedCategory || content.category === selectedCategory);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    // Firebase Timestamp 처리
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <AdminLayout>
      <div className="admin-content">
        <h2 className="admin-page-title">콘텐츠 관리</h2>
        <div className="admin-content-layout">
          <div className="admin-content-nav">
            <h3>카테고리</h3>
            <div className="admin-menu-list">
              {categories.map(category => (
                <div 
                  key={category.value}
                  className={`admin-menu-item child ${selectedCategory === category.value ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {category.label}
                </div>
              ))}
            </div>
          </div>
          <div className="admin-content-main">
            <div className="admin-content-header">
              <h3>콘텐츠 목록</h3>
              <button 
                className="admin-button"
                onClick={() => navigate('/admin/content/new')}
              >
                새 콘텐츠 추가
              </button>
            </div>
            <div className="admin-content-controls">
              <div className="admin-filter-checkbox">
                <input type="checkbox" id="showDrafts" />
                <label htmlFor="showDrafts">
                  <span className="admin-checkmark"></span>
                  임시저장 포함
                </label>
              </div>
            </div>
            {loading ? (
              <div className="admin-loading">데이터를 불러오는 중...</div>
            ) : (
              <div className="admin-content-list">
                {filteredContents.length > 0 ? (
                  filteredContents.map(content => (
                    <div key={content.id} className="admin-content-item">
                      <div className="admin-content-item-header">
                        <h3>{content.title}</h3>
                        <div className="admin-content-actions">
                          <button 
                            className="admin-button"
                            onClick={() => navigate(`/admin/content/edit/${content.id}`)}
                          >
                            수정
                          </button>
                          <button className="admin-button">미리보기</button>
                          <button 
                            className="admin-button delete"
                            onClick={() => handleDelete(content.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <div className="admin-content-item-body">
                        <div className="admin-content-preview">
                          <p>카테고리: {categories.find(cat => cat.value === (content.type || content.category))?.label}</p>
                          <p>생성일: {formatDate(content.createdAt || content.created_at)}</p>
                          <p>상태: {content.status === 'published' ? '게시됨' : '임시저장'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-no-content-message">
                    <p>등록된 콘텐츠가 없습니다.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 