import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SideMenu from './SideMenu';
import { useBackground } from '../contexts/BackgroundContext';
import './Layout.css';

const Layout = () => {
  const location = useLocation();
  const { backgroundColor: contextBackgroundColor } = useBackground();
  
  const isAdminRoute = location.pathname.startsWith('/admin');
  const sideMenuBackgroundColor = isAdminRoute ? '#ffffff' : contextBackgroundColor;

  return (
    <div className="layout-container">
      <SideMenu backgroundColor={sideMenuBackgroundColor} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 