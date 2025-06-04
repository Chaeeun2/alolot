import React, { useEffect, useState } from 'react';
import { getMainImages } from '../services/imageService';
import './MainPage.css';

const MainPage = () => {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);

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

  // 자동 슬라이드 기능
  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [autoPlay, images.length, currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const handleNext = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
  };

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
      <div className="slideshow-container">
        {/* 메인 이미지 */}
        <div className="slide-wrapper">
        <div
            className="slide-track"
            style={{ transform: `translateY(-${currentIndex * 100}%)` }}
        >
            {images.map((image, index) => (
            <div key={image.id} className="slide">
                <img
                src={image.url}
                alt={image.title || `슬라이드 이미지 ${index + 1}`}
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