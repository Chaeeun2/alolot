import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './SideMenu.css';

const SideMenu = ({ backgroundColor = '#ffffff' }) => {
  const location = useLocation();
  const isProjectPage = location.pathname === '/projects';
  const isProjectDetailPage = location.pathname.startsWith('/projects/');
  const isAboutPage = location.pathname === '/about';

  return (
    <div 
      className={`side-menu ${isProjectPage ? 'projects-page' : ''} ${isProjectDetailPage ? 'project-detail-page' : ''} ${isAboutPage ? 'about-page' : ''}`}
      style={{ backgroundColor }}
    >
      <div className="menu-top">
        <Link to="/" className="menu-item">STUDIO ALOT</Link>
      </div>
          <div className="menu-center">
              <Link to="/about" className={`menu-item ${isAboutPage ? 'active' : ''} about`}>ABOUT</Link>
        <Link to="/projects" className={`menu-item ${isProjectPage ? 'active' : ''} projects`}>PROJECTS</Link>
      </div>
      <div className="menu-bottom">
        <a 
          href="https://www.instagram.com/alolot.kr/" 
          className="menu-item" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          MORE...
        </a>
      </div>
    </div>
  );
};

export default SideMenu; 