import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import MainPageManager from './pages/MainPageManager'
import AwardsManager from './pages/AwardsManager'
import ProjectManager from './pages/ProjectManager'
import AboutManager from './pages/AboutManager'
import ContactManager from './pages/ContactManager'
import NewsManager from './pages/NewsManager'
import BookManager from './pages/BookManager'
import PressManager from './pages/PressManager'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { MobileProvider } from './contexts/MobileContext'
import './styles/admin.css'

function AdminApp() {
  return (
    <MobileProvider>
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <MainPageManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/mainpage" element={
            <ProtectedRoute>
              <MainPageManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/awards" element={
            <ProtectedRoute>
              <AwardsManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/projects" element={
            <ProtectedRoute>
              <ProjectManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/about" element={
            <ProtectedRoute>
              <AboutManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/contact" element={
            <ProtectedRoute>
              <ContactManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/news" element={
            <ProtectedRoute>
              <NewsManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/books" element={
            <ProtectedRoute>
              <BookManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/press" element={
            <ProtectedRoute>
              <PressManager />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </MobileProvider>
  )
}

export default AdminApp; 