import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const location = useLocation();

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-logo">alolot Admin</div>
        <nav className="admin-nav">
          <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
            대시보드
          </Link>
          <Link to="/admin/info" className={location.pathname === '/admin/info' ? 'active' : ''}>
            정보 관리
          </Link>
          <Link to="/admin/categories" className={location.pathname === '/admin/categories' ? 'active' : ''}>
            카테고리 관리
          </Link>
          <Link to="/admin/mainpage" className={location.pathname === '/admin/mainpage' ? 'active' : ''}>
            메인페이지 관리
          </Link>
          <Link to="/admin/projects" className={location.pathname === '/admin/projects' ? 'active' : ''}>
            프로젝트 관리
          </Link>
        </nav>
      </div>
      <div className="admin-content">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout; 