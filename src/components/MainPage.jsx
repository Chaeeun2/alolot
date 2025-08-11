import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { getMainImages } from '../services/imageService';
import './MainPage.css';

const MainPage = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // 모바일 여부 체크
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 슬라이드 높이 계산
  const getSlideHeight = () => {
    if (isMobile) {
      // 모바일: 100vh - 61vw
      const vw = window.innerWidth / 100;
      return `calc(100vh - ${61 * vw}px)`;
    }
    return '100vh'; // 데스크톱
  };

  useEffect(() => {
    const fetchMainImages = async () => {
      try {
        const data = await getMainImages();
        setImages(data);
      } catch (error) {
        console.error('Error fetching main images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMainImages();
  }, []);

  // 다음 슬라이드로 이동
  const nextSlide = useCallback(() => {
    if (images.length === 0) return;
    setCurrentSlide(prev => (prev + 1) % images.length);
  }, [images.length]);

  // 이전 슬라이드로 이동
  const prevSlide = useCallback(() => {
    if (images.length === 0) return;
    setCurrentSlide(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // 특정 슬라이드로 이동
  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  // 자동 슬라이드 효과
  useEffect(() => {
    if (!isAutoPlay || images.length <= 1) return;

    const intervalId = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % images.length);
    }, 4000); // 4초마다 슬라이드 변경

    return () => clearInterval(intervalId);
  }, [isAutoPlay, images.length]);

  if (loading) {
    return <div className="main-loading">Loading...</div>;
  }

  if (images.length === 0) {
    return (
      <div className="main-no-images">
        <div className="no-images-message">
          <h2>메인 이미지가 없습니다</h2>
          <p>관리자 페이지에서 이미지를 업로드해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-slideshow">
      <Helmet>
        <title>스튜디오 어랏 ALOT</title>
        <meta name="description" content="CREATIVE Web · Graphic Design STUDIO" />
        <link rel="canonical" href="https://alolot-7fa32.web.app/" />
      </Helmet>
      <div className="slideshow-container">
        <div className="slide-wrapper">
          <div 
            className="slide-track"
            style={{
              transform: isMobile 
                ? `translateY(-${currentSlide * (window.visualViewport ? window.visualViewport.height - (61 * window.innerWidth / 100) : window.innerHeight - (61 * window.innerWidth / 100))}px)`
                : `translateY(-${currentSlide * (window.visualViewport ? window.visualViewport.height : window.innerHeight)}px)`,
              height: isMobile
                ? `${images.length * (window.visualViewport ? window.visualViewport.height - (61 * window.innerWidth / 100) : window.innerHeight - (61 * window.innerWidth / 100))}px`
                : `${images.length * (window.visualViewport ? window.visualViewport.height : window.innerHeight)}px`
            }}
          >
            {images.map((image, index) => (
              <div key={image.id || index} className="slide">
                <img
                  src={image.url}
                  alt={image.title ? `${image.title} 슬라이드` : `슬라이드 ${index + 1}`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage; 