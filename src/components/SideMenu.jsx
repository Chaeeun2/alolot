import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './SideMenu.css';

const SideMenu = ({ backgroundColor = '#ffffff' }) => {
  const location = useLocation();
  const isProjectPage = location.pathname === '/projects';
  const isProjectDetailPage = location.pathname.startsWith('/projects/');
  const isAboutPage = location.pathname === '/about';

  // 각 메뉴 요소별 mouseleave 지연 타이머를 보관
  const hoverTimeoutsRef = useRef(new Map());

  useEffect(() => {
    return () => {
      // 언마운트 시 모든 타이머 정리
      hoverTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      hoverTimeoutsRef.current.clear();
    };
  }, []);

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
    }, 300);
    hoverTimeoutsRef.current.set(target, timeoutId);
  };

  return (
    <div 
      className={`side-menu ${isProjectPage ? 'projects-page' : ''} ${isProjectDetailPage ? 'project-detail-page' : ''} ${isAboutPage ? 'about-page' : ''}`}
      style={{ backgroundColor }}
    >
      <div className="menu-top">
        <div className="menu-item-wrap">
          <Link to="/" className="menu-item" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>STUDIO ALOT</Link>
        </div>
      </div>
          <div className="menu-center">
              <div className="menu-item-wrap">
                <Link to="/about" className={`menu-item ${isAboutPage ? 'active' : ''} about`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>ABOUT</Link>
              </div>
              <div className="menu-item-wrap">
                <Link to="/projects" className={`menu-item ${isProjectPage ? 'active' : ''} projects`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>PROJECTS</Link>
              </div>
      </div>
      <div className="menu-bottom">
        <div className="menu-item-wrap">
          <a 
            href="https://www.instagram.com/alolot.kr/" 
            className="menu-item"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            target="_blank" 
            rel="noopener noreferrer"
          >
            MORE...
          </a>
        </div>
      </div>
    </div>
  );
};

export default SideMenu; 