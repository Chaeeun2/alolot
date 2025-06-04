import React, { useEffect, useState } from 'react';
import { getMainImages } from '../services/imageService';
import './MainPage.css';

const MainPage = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

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
        {/* 메인 이미지 - 첫 번째 이미지만 표시 */}
        <div className="slide-wrapper">
          <div className="slide-track">
            {images.length > 0 && (
              <div className="slide">
                <img
                  src={images[0].url}
                  alt={images[0].title || '메인 이미지'}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage; 