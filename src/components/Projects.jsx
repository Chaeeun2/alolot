import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../services/projectService';
import { useBackground } from '../contexts/BackgroundContext';
import './Projects.css';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const menuRef = useRef(null);
  // 카테고리 버튼별 hover 해제 타이머 관리
  const hoverTimeoutsRef = useRef(new Map());
  
  // BackgroundContext 사용
  const { categories, setBackgroundByCategory } = useBackground();

  // 메뉴 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // 언마운트 시 모든 타이머 정리
  useEffect(() => {
    return () => {
      hoverTimeoutsRef.current.forEach((id) => clearTimeout(id));
      hoverTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const projectsData = await getProjects();
        setProjects(projectsData);
        
      } catch (error) {
        console.error('프로젝트 로딩 중 상세 오류:', error);
        setError('프로젝트를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // 프로젝트 필터링
  useEffect(() => {
    if (selectedCategory === 'ALL') {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(project => 
        project.categories?.some(category => category.name === selectedCategory)
      );
      setFilteredProjects(filtered);
    }
  }, [projects, selectedCategory]);

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleCategoryFilter = (categoryName) => {
    setSelectedCategory(categoryName);
    setIsMenuOpen(false); // 카테고리 선택 후 메뉴 닫기
    
    // 배경색 변경
    setBackgroundByCategory(categoryName);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMouseEnter = (event) => {
    const target = event.currentTarget;
    const existingTimeout = hoverTimeoutsRef.current.get(target);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      hoverTimeoutsRef.current.delete(target);
    }
    target.classList.add('is-hovered');
  };

  const handleMouseLeave = (event) => {
    const target = event.currentTarget;
    const timeoutId = setTimeout(() => {
      target.classList.remove('is-hovered');
      hoverTimeoutsRef.current.delete(target);
    }, 200);
    hoverTimeoutsRef.current.set(target, timeoutId);
  };

  if (loading) {
    return <div className="main-projects-loading">프로젝트를 불러오는 중...</div>;
  }

  if (error) {
    return <div className="main-projects-error">{error}</div>;
  }

  return (
    <div className="main-projects-container">
      {/* 카테고리 필터 */}
      <div className="category-filter-container" ref={menuRef}>
        {/* 현재 선택된 카테고리 (메뉴가 닫혀있을 때만 표시) */}
          {!isMenuOpen && (
            <div className="category-filter-item-wrap">
              <button
                className={`category-filter-button selected-category`}
                onClick={toggleMenu}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {selectedCategory}
              </button>
            </div>
          )}
        
        {/* 다른 카테고리들 (메뉴가 열렸을 때만 표시) */}
        {isMenuOpen && (
          <>
            {/* ALL을 항상 먼저 표시 */}
            <div className="category-filter-item-wrap">
              <button
                className="category-filter-button"
                onClick={() => handleCategoryFilter('ALL')}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                ALL
              </button>
            </div>
            {/* 모든 카테고리들을 생성 순서대로 표시 */}
            {categories.map((category) => (
              <div key={category.id} className="category-filter-item-wrap">
                <button
                  className="category-filter-button"
                  onClick={() => handleCategoryFilter(category.name)}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  {category.name}
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 프로젝트 그리드 */}
      {!filteredProjects || filteredProjects.length === 0 ? (
        <div className="main-projects-empty">
          {selectedCategory === 'ALL' 
            ? '등록된 프로젝트가 없습니다.' 
            : `'${selectedCategory}' 카테고리에 해당하는 프로젝트가 없습니다.`}
        </div>
      ) : (
        <div className="main-projects-grid">
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              className="main-project-card"
              onClick={() => handleProjectClick(project.id)}
            >
              <div
                className="main-project-image"
                onMouseEnter={(e) => {
                  // -7deg ~ 7deg 사이의 랜덤 각도
                  const angle = (Math.random() * 14 - 7).toFixed(2);
                  e.currentTarget.style.setProperty('--tilt', `${angle}deg`);
                }}
              >
                <img src={project.thumbnailUrl} alt={project.title} />
              </div>
              <div className="project-info">
                <h2>{project.title}</h2>
                <div className="project-tags">
                  {project.categories?.map((category, index) => (
                    <span 
                      key={index} 
                      className="project-tag"
                      style={{ 
                        color: category.color || '#007bff',
                        backgroundColor: 'black'
                      }}
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects; 