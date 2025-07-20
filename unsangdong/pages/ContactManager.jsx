import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { contactService } from '../services/dataService';

export default function ContactManager() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inquiries'); // 'inquiries' 또는 'info'
  
  // Contact 정보 관련 상태
  const [contactInfo, setContactInfo] = useState({
    address: { ko: '', en: '' },
    email: '',
    tel: '',
    fax: '',
    sns: { instagram: '', url: '' }
  });
  const [infoSaving, setInfoSaving] = useState(false);

  // 문의사항 관련 상태
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  useEffect(() => {
    loadContactInfo();
    if (activeTab === 'inquiries') {
      loadInquiries();
    }
  }, [activeTab]);

  // Contact 정보 로드
  async function loadContactInfo() {
    try {
      setLoading(true);
      const data = await contactService.getContactInfo();
      setContactInfo(data);
    } catch (error) {
      console.error('Contact 정보 로딩 실패:', error);
      alert('Contact 정보 로딩에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  // 문의사항 목록 로드
  async function loadInquiries() {
    try {
      setInquiriesLoading(true);
      const data = await contactService.getInquiries();
      setInquiries(data);
    } catch (error) {
      console.error('문의사항 로딩 실패:', error);
      alert('문의사항 로딩에 실패했습니다.');
    } finally {
      setInquiriesLoading(false);
    }
  }

  // Contact 정보 저장
  async function handleSaveContactInfo() {
    try {
      setInfoSaving(true);
      await contactService.saveContactInfo(contactInfo);
      alert('Contact 정보가 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('Contact 정보 저장 실패:', error);
      alert('Contact 정보 저장에 실패했습니다: ' + error.message);
    } finally {
      setInfoSaving(false);
    }
  }

  // Contact 정보 입력 처리
  const handleContactInfoChange = (field, value, subField = null) => {
    if (subField) {
      setContactInfo(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [subField]: value
        }
      }));
    } else {
      setContactInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };



  // 문의사항 삭제
  async function handleDeleteInquiry(inquiryId) {
    if (!window.confirm('이 문의사항을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await contactService.deleteInquiry(inquiryId);
      alert('문의사항이 삭제되었습니다.');
      await loadInquiries();
    } catch (error) {
      console.error('문의사항 삭제 실패:', error);
      alert('문의사항 삭제에 실패했습니다.');
    }
  }



  // 날짜 포맷팅
  const formatDate = (dateValue) => {
    if (!dateValue) return '날짜 없음';
    
    try {
      let date;
      
      // Firebase Timestamp 객체인 경우
      if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
        date = dateValue.toDate();
      }
      // 문자열이나 숫자인 경우
      else {
        date = new Date(dateValue);
      }
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return '날짜 형식 오류';
      }
      
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('날짜 포맷팅 에러:', error, dateValue);
      return '날짜 처리 오류';
    }
  };

  return (
    <AdminLayout>
      <div className="admin-content">
        <h2 className="admin-page-title">CONTACT 관리</h2>
        
        {/* 탭 네비게이션 */}
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'inquiries' ? 'active' : ''}`}
            onClick={() => setActiveTab('inquiries')}
          >
            문의 관리 ({inquiries.length})
          </button>
          <button 
            className={`admin-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            정보 관리
          </button>
        </div>

        {/* 문의사항 관리 탭 */}
        {activeTab === 'inquiries' && (
          <div className="admin-content-layout">
            <div className="admin-content-main">
              <div className="admin-content-header">
                <h3 className="admin-content-title">문의사항 목록</h3>
                <div className="admin-header-buttons">
                </div>
              </div>

              {inquiriesLoading ? (
                <p>로딩 중...</p>
              ) : inquiries.length === 0 ? (
                <div className="admin-empty-state">
                  <p>등록된 문의사항이 없습니다.</p>
                </div>
              ) : (
                <div className="admin-inquiries-container">
                  {inquiries.map((inquiry) => (
                    <div key={inquiry.id} className="admin-inquiry-item">

                      <div className="admin-inquiry-content">
                        <div className="admin-inquiry-info">
                          <div className="admin-inquiry-field">
                            <p className="admin-inquiry-label">회사명</p> {inquiry.companyName}
                          </div>
                          <div className="admin-inquiry-field">
                            <p className="admin-inquiry-label">담당자</p> {inquiry.contactName}
                          </div>
                          <div className="admin-inquiry-field">
                            <p className="admin-inquiry-label">이메일</p> 
                            <a style={{paddingLeft: '4px'}} href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                          </div>
                          <div className="admin-inquiry-field">
                            <p className="admin-inquiry-label">연락처</p> {inquiry.phoneNumber}
                          </div>
                        </div>
                        <div className="admin-inquiry-details">
                          <div className="admin-inquiry-title">
                            <p className="admin-inquiry-label">제목</p> {inquiry.inquiryTitle}
                          </div>
                          <div className="admin-inquiry-message">
                                      <p className="admin-inquiry-label">내용</p>
                            <div className="admin-inquiry-text">
                              {inquiry.inquiryContent}
                            </div>
                          </div>
                        </div>
                          </div>
                                                <div className="admin-inquiry-header">
                        <div className="admin-inquiry-meta">
                          <span className="admin-inquiry-date">
                            {formatDate(inquiry.createdAt)}
                          </span>
                        </div>
                        <div className="admin-inquiry-actions">
                          <button
                            className="admin-button admin-button-danger admin-button-small"
                            onClick={() => handleDeleteInquiry(inquiry.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact 정보 관리 탭 */}
        {activeTab === 'info' && (
          <div className="admin-content-layout">
            <div className="admin-content-main">
              <div className="admin-content-header">
                <h3 className="admin-content-title">Contact 정보</h3>
                <div className="admin-header-buttons">
                  <button 
                    className="admin-button admin-button-primary"
                    onClick={handleSaveContactInfo}
                    disabled={loading || infoSaving}
                  >
                    {infoSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>

              {loading ? (
                <p>로딩 중...</p>
              ) : (
                <div className="admin-contact-form">
                  <div className="admin-form-section">
                    <h3>주소</h3>
                    <div className="admin-form-row">
                      <label>국문</label>
                      <input
                        type="text"
                        value={contactInfo.address.ko}
                        onChange={(e) => handleContactInfoChange('address', e.target.value, 'ko')}
                        className="admin-input"
                        placeholder="한국어 주소를 입력하세요"
                      />
                    </div>
                    <div className="admin-form-row">
                      <label>영문</label>
                      <input
                        type="text"
                        value={contactInfo.address.en}
                        onChange={(e) => handleContactInfoChange('address', e.target.value, 'en')}
                        className="admin-input"
                        placeholder="영어 주소를 입력하세요"
                      />
                    </div>
                  </div>

                  <div className="admin-form-section">
                    <h3>연락처 정보</h3>
                    <div className="admin-form-row">
                      <label>이메일</label>
                      <input
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) => handleContactInfoChange('email', e.target.value)}
                        className="admin-input"
                        placeholder="이메일 주소"
                      />
                    </div>
                    <div className="admin-form-row">
                      <label>전화</label>
                      <input
                        type="text"
                        value={contactInfo.tel}
                        onChange={(e) => handleContactInfoChange('tel', e.target.value)}
                        className="admin-input"
                        placeholder="전화번호"
                      />
                    </div>
                    <div className="admin-form-row">
                      <label>팩스</label>
                      <input
                        type="text"
                        value={contactInfo.fax}
                        onChange={(e) => handleContactInfoChange('fax', e.target.value)}
                        className="admin-input"
                        placeholder="팩스번호"
                      />
                    </div>
                  </div>

                  <div className="admin-form-section">
                    <h3>SNS 정보</h3>
                    <div className="admin-form-row">
                      <label>아이디</label>
                      <input
                        type="text"
                        value={contactInfo.sns.instagram}
                        onChange={(e) => handleContactInfoChange('sns', e.target.value, 'instagram')}
                        className="admin-input"
                        placeholder="@unsangdong"
                      />
                    </div>
                    <div className="admin-form-row">
                      <label>URL</label>
                      <input
                        type="url"
                        value={contactInfo.sns.url}
                        onChange={(e) => handleContactInfoChange('sns', e.target.value, 'url')}
                        className="admin-input"
                        placeholder="https://www.instagram.com/unsangdong/"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
                      </div>
          )}
      </div>
    </AdminLayout>
  );
} 