import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './AdminLayout.css';

export default function AdminLayout({ children }) {
  const location = useLocation();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>운생동 Admin</h2>
        <nav>
          <ul>
            <li className={location.pathname === '/admin/mainpage' ? 'active' : ''}>
              <Link to="/admin/mainpage">Main</Link>
            </li>
            <li className={location.pathname === '/admin/about' ? 'active' : ''}>
              <Link to="/admin/about">About</Link>
            </li>
            <li className={location.pathname === '/admin/awards' ? 'active' : ''}>
              <Link to="/admin/awards">Awards</Link>
            </li>
            <li className={location.pathname === '/admin/contact' ? 'active' : ''}>
              <Link to="/admin/contact">Contact</Link>
            </li>
            <li className={location.pathname === '/admin/projects' ? 'active' : ''}>
              <Link to="/admin/projects">Project</Link>
            </li>
            <li className={location.pathname === '/admin/news' ? 'active' : ''}>
              <Link to="/admin/news">News</Link>
            </li>
            <li className={location.pathname === '/admin/books' ? 'active' : ''}>
              <Link to="/admin/books">Book</Link>
            </li>
            <li className={location.pathname === '/admin/press' ? 'active' : ''}>
              <Link to="/admin/press">Press</Link>
            </li>
          </ul>
        </nav>
      </aside>
      <div className="admin-content-wrapper">
        {children}
      </div>
    </div>
  );
} 