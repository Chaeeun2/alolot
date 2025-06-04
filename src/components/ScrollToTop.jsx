import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // viewport 높이 재계산 함수
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // 강력한 스크롤 리셋 함수
    const forceScrollToTop = () => {
      // 모바일 기기 감지
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // viewport 높이 먼저 재계산
      setViewportHeight();
      
      // 1. 모든 스크롤 가능한 요소들 찾기
      const scrollableElements = [
        window,
        document,
        document.documentElement,
        document.body,
        document.querySelector('#root'),
        document.querySelector('.App'),
        document.querySelector('main'),
        document.querySelector('.main-content'),
        document.querySelector('.layout-content'),
        document.querySelector('.layout-container'),
        ...document.querySelectorAll('[data-scroll]'),
        ...document.querySelectorAll('.scroll-container'),
        ...document.querySelectorAll('[style*="overflow"]')
      ];

      // 2. 모든 요소의 스크롤 리셋
      scrollableElements.forEach(element => {
        if (element && typeof element.scrollTo === 'function') {
          try {
            element.scrollTo({
              top: 0,
              left: 0,
              behavior: 'instant'
            });
          } catch (e) {
            // fallback
            if (element.scrollTop !== undefined) element.scrollTop = 0;
            if (element.scrollLeft !== undefined) element.scrollLeft = 0;
          }
        } else if (element) {
          if (element.scrollTop !== undefined) element.scrollTop = 0;
          if (element.scrollLeft !== undefined) element.scrollLeft = 0;
        }
      });

      // 3. window 스크롤 강제 리셋 (여러 방법 시도)
      try {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant'
        });
      } catch (e) {
        window.scrollTo(0, 0);
      }
      
      // 4. 레거시 방법들
      if (window.pageYOffset !== undefined) window.pageYOffset = 0;
      if (window.pageXOffset !== undefined) window.pageXOffset = 0;
      
      // 5. 모바일 특화 처리
      if (isMobile) {
        // iOS Safari 특별 처리
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // 약간 아래로 스크롤 후 맨 위로 (iOS 바운스 방지)
          window.scrollTo(0, 1);
          setTimeout(() => {
            window.scrollTo(0, 0);
          }, 0);
        }
        
        // requestAnimationFrame으로 추가 확인
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          if (document.documentElement) {
            document.documentElement.scrollTop = 0;
          }
          if (document.body) {
            document.body.scrollTop = 0;
          }
          
          // 한 번 더 확인
          requestAnimationFrame(() => {
            window.scrollTo(0, 0);
          });
        });
      }

      // 6. CSS 스크롤 동작 임시 비활성화 후 복원
      const originalScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.style.scrollBehavior = originalScrollBehavior;
      }, 0);
    };

    // 즉시 실행
    forceScrollToTop();
    
    // 더 많은 단계별 실행으로 확실하게
    const timers = [
      setTimeout(forceScrollToTop, 10),   // 10ms
      setTimeout(forceScrollToTop, 50),   // 50ms
      setTimeout(forceScrollToTop, 100),  // 100ms
      setTimeout(forceScrollToTop, 200),  // 200ms
    ];

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [pathname]);

  return null;
}

export default ScrollToTop; 