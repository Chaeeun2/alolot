import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { awardsService } from '../services/dataService';

// 간단한 모달 컴포넌트
function YearModal({ isOpen, onClose, onSubmit, loading }) {
  const [newYear, setNewYear] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newYear.trim()) {
      onSubmit(newYear.trim());
      setNewYear('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>연도 추가</h3>
          <button className="admin-modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="admin-modal-body">
          <div className="admin-form-row">
            <label>추가할 연도</label>
            <input
              type="text"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder="예: 2024"
              className="admin-input"
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="admin-modal-footer">
            <button 
              type="button" 
              className="admin-button admin-button-secondary"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </button>
            <button 
              type="submit" 
              className="admin-button admin-button-primary"
              disabled={loading || !newYear.trim()}
            >
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AwardsManager() {
  const [loading, setLoading] = useState(true);
  const [awardsData, setAwardsData] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    loadAwardsData();
  }, []);

  useEffect(() => {
    // 데이터 로드 후 첫 번째 연도를 기본으로 선택
    if (awardsData.length > 0 && !selectedYear) {
      setSelectedYear(awardsData[0].year);
    }
  }, [awardsData, selectedYear]);

  async function loadAwardsData() {
    try {
      setLoading(true);
      const data = await awardsService.getAwardsData();
      
      if (data.awardsData) {
        setAwardsData(data.awardsData);
      } else if (Array.isArray(data)) {
        setAwardsData(data);
      }
    } catch (error) {
      console.error('Awards 데이터 로딩 실패:', error);
      alert('데이터 로딩에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAwards() {
    try {
      // 빈 수상내역 필터링 및 빈 연도 자동 삭제
      const filteredAwardsData = awardsData
        .map(yearData => ({
          ...yearData,
          awards: yearData.awards.filter(award => 
            award.title.EN.trim() !== '' || award.title.KO.trim() !== ''
          )
        }))
        .filter(yearData => yearData.awards.length > 0); // 수상내역이 없는 연도 삭제
      
      // 필터링된 데이터로 상태 업데이트
      if (filteredAwardsData.length !== awardsData.length || 
          JSON.stringify(filteredAwardsData) !== JSON.stringify(awardsData)) {
        setAwardsData(filteredAwardsData);
        
        // 선택된 연도가 삭제되었다면 첫 번째 연도로 변경
        if (filteredAwardsData.length > 0 && 
            !filteredAwardsData.some(yearData => yearData.year === selectedYear)) {
          setSelectedYear(filteredAwardsData[0].year);
        } else if (filteredAwardsData.length === 0) {
          setSelectedYear('');
        }
      }
      
      await awardsService.saveAwardsData(filteredAwardsData);
      alert('수상 내역이 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('수상 내역 저장 실패:', error);
      alert('수상 내역 저장에 실패했습니다: ' + error.message);
    }
  }

  async function handleAddNewYear(year) {
    setModalLoading(true);
    try {
      // 중복 연도 확인
      if (awardsData.some(yearData => yearData.year === year)) {
        alert('이미 존재하는 연도입니다.');
        return;
      }

      const newYear = {
        year: year,
        awards: [{
          title: {
            EN: '',
            KO: ''
          }
        }]
      };
      
      const newAwardsData = [newYear, ...awardsData];
      setAwardsData(newAwardsData);
      setSelectedYear(year);
      setIsModalOpen(false);
      
      alert('연도가 성공적으로 추가되었습니다.');
    } catch (error) {
      console.error('연도 추가 실패:', error);
      alert('연도 추가에 실패했습니다: ' + error.message);
    } finally {
      setModalLoading(false);
    }
  }



  function addNewAward(year) {
    const yearIndex = awardsData.findIndex(yearData => yearData.year === year);
    if (yearIndex !== -1) {
      const newAwardsData = [...awardsData];
      newAwardsData[yearIndex].awards.push({
        title: {
          EN: '',
          KO: ''
        }
      });
      setAwardsData(newAwardsData);
    }
  }

  function removeAward(year, awardIndex) {
    if (window.confirm('이 수상 내역을 삭제하시겠습니까?')) {
      const yearIndex = awardsData.findIndex(yearData => yearData.year === year);
      if (yearIndex !== -1) {
        const newAwardsData = [...awardsData];
        newAwardsData[yearIndex].awards = newAwardsData[yearIndex].awards.filter((_, index) => index !== awardIndex);
        
        // 해당 연도에 수상내역이 없으면 연도도 삭제
        if (newAwardsData[yearIndex].awards.length === 0) {
          newAwardsData.splice(yearIndex, 1);
          // 선택된 연도 업데이트
          if (selectedYear === year) {
            setSelectedYear(newAwardsData.length > 0 ? newAwardsData[0].year : '');
          }
        }
        
        setAwardsData(newAwardsData);
      }
    }
  }

  function updateAwardTitle(year, awardIndex, language, value) {
    const yearIndex = awardsData.findIndex(yearData => yearData.year === year);
    if (yearIndex !== -1) {
      const newAwardsData = [...awardsData];
      newAwardsData[yearIndex].awards[awardIndex].title[language] = value;
      setAwardsData(newAwardsData);
    }
  }



  // 선택된 연도의 데이터 찾기
  const selectedYearData = awardsData.find(yearData => yearData.year === selectedYear);

  return (
    <AdminLayout>
      <div className="admin-content">
        <h2 className="admin-page-title">AWARDS 관리</h2>
        
        <div className="admin-content-layout">
          <div className="admin-content-main">
            <div className="admin-content-header">
              <h3 className="admin-content-title">수상 내역 관리</h3>
              <div className="admin-header-buttons">
                <button 
                  className="admin-button admin-button-primary"
                  onClick={handleSaveAwards}
                  disabled={loading}
                >
                  저장
                </button>
              </div>
            </div>

            
            {loading ? (
              <p>로딩 중...</p>
            ) : (
                <>
                  <div className="admin-award-list-header">
                  {awardsData.length > 0 && (
                  <div className="admin-year-selector">
                    <div className="admin-form-row">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="admin-awards-select"
                      >
                        {awardsData.map((yearData, index) => (
                          <option key={index} value={yearData.year}>
                            {yearData.year}
                          </option>
                        ))}
                      </select>
                        </div>
                        <button 
                  className="admin-button admin-button-secondary"
                  onClick={() => setIsModalOpen(true)}
                >
                  연도 추가
                </button>
                  </div>
                )}

                <button 
                          className="admin-button admin-button-secondary"
                          onClick={() => addNewAward(selectedYear)}
                        >
                          수상 내역 추가
                      </button>
                      </div>
                  <div className="admin-awards-container">
                  {selectedYearData ? (
                    <div className="admin-year-section">
                      <div className="admin-awards-list">
                        {selectedYearData.awards.map((award, awardIndex) => (
                          <div key={awardIndex} className="admin-award-item">
                            <div className="admin-award-header">
                              <h4>Award {awardIndex + 1}</h4>
                              <button 
                                className="admin-button admin-button-danger admin-button-small"
                                onClick={() => removeAward(selectedYear, awardIndex)}
                              >
                                삭제
                              </button>
                            </div>
                            
                            <div className="admin-form-row">
                              <label>영문</label>
                              <textarea
                                value={award.title.EN}
                                onChange={(e) => updateAwardTitle(selectedYear, awardIndex, 'EN', e.target.value)}
                                className="admin-textarea"
                                rows="3"
                                placeholder="영문 수상명을 입력하세요"
                              />
                            </div>

                            <div className="admin-form-row">
                              <label>국문</label>
                              <textarea
                                value={award.title.KO}
                                onChange={(e) => updateAwardTitle(selectedYear, awardIndex, 'KO', e.target.value)}
                                className="admin-textarea"
                                rows="3"
                                placeholder="국문 수상명을 입력하세요"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="admin-empty-state">
                      <p>등록된 수상 내역이 없습니다.</p>
                      <button 
                        className="admin-button admin-button-primary"
                        onClick={() => setIsModalOpen(true)}
                      >
                        첫 번째 연도 추가
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 연도 추가 모달 */}
      <YearModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddNewYear}
        loading={modalLoading}
      />

    </AdminLayout>
  );
} 