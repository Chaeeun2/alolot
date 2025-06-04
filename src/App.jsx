import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import MainPage from './components/MainPage';
import About from './components/About';
import Projects from './components/Projects';
import ProjectDetail from './components/ProjectDetail';
import Admin from './components/Admin';
import AdminLayout from './components/layouts/AdminLayout';
import ProjectManagement from './components/admin/ProjectManagement';
import CategoryManagement from './components/admin/CategoryManagement';
import MainPageManagement from './components/admin/MainPageManagement';
import InfoManagement from './components/admin/InfoManagement';
import ScrollToTop from './components/ScrollToTop';
import { BackgroundProvider } from './contexts/BackgroundContext';
import './App.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please check the console for details.</div>;
    }
    return this.props.children;
  }
}

// Admin page wrapper
function AdminPage({ children }) {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}

function App() {
  // viewport 높이 설정 - 브라우저 UI 변화에 따라 동적 조정
  React.useEffect(() => {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // 초기 설정
    setViewportHeight();

    // 리사이즈 이벤트 처리 (디바운스 적용)
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(setViewportHeight, 100);
    };

    // 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', setViewportHeight);
    
    // 모바일 브라우저의 주소창 변화 감지를 위한 추가 처리
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      // 스크롤 이벤트로도 주소창 변화 감지
      window.addEventListener('scroll', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', setViewportHeight);
      window.removeEventListener('scroll', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <BrowserRouter 
      future={{ 
        v7_startTransition: true,
        v7_relativeSplatPath: true 
      }}
    >
      <ScrollToTop />
      <BackgroundProvider>
        <ErrorBoundary>
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminPage><Admin /></AdminPage>} />
            <Route path="/admin/projects" element={<AdminPage><ProjectManagement /></AdminPage>} />
            <Route path="/admin/info" element={<AdminPage><InfoManagement /></AdminPage>} />
            <Route path="/admin/categories" element={<AdminPage><CategoryManagement /></AdminPage>} />
            <Route path="/admin/mainpage" element={<AdminPage><MainPageManagement /></AdminPage>} />

            {/* Main Site Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<MainPage />} />
              <Route path="about" element={<About />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </ErrorBoundary>
      </BackgroundProvider>
    </BrowserRouter>
  );
}

export default App; 