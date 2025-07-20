import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-logo">alolot Admin</div>
        <nav className="admin-nav">
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