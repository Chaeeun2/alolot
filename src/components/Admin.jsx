import React from 'react';
import { Link } from 'react-router-dom';
import './Admin.css';

const Admin = () => {
  return (
    <div className="admin-container">
      <h1>관리자 페이지</h1>
      <div className="admin-menu">
        <Link to="/admin/projects" className="admin-menu-item">
          프로젝트 관리
        </Link>
        <Link to="/admin/categories" className="admin-menu-item">
          카테고리 관리
        </Link>
        <Link to="/admin/mainpage" className="admin-menu-item">
          메인페이지 관리
        </Link>
        <Link to="/admin/info" className="admin-menu-item">
          정보 관리
        </Link>
      </div>
    </div>
  );
};

export default Admin; 