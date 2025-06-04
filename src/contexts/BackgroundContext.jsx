import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCategories } from '../services/categoryService';

const BackgroundContext = createContext();

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  
  if (!context) {
    return {
      backgroundColor: '#ffffff',
      setBackgroundColor: () => {},
      setBackgroundByCategory: () => {},
      categories: []
    };
  }
  
  return context;
};

export const BackgroundProvider = ({ children }) => {
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [categories, setCategories] = useState([]);

  // 카테고리 데이터 로드
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
        
        // 초기 랜덤 배경색 설정
        const categoriesWithColors = categoriesData.filter(category => category.color);
        
        if (categoriesWithColors.length > 0) {
          const randomIndex = Math.floor(Math.random() * categoriesWithColors.length);
          const randomColor = categoriesWithColors[randomIndex].color;
          setBackgroundColor(randomColor);
        }
      } catch (error) {
        console.error('BackgroundProvider: 카테고리 로드 실패:', error);
      }
    };

    loadCategories();
  }, []);

  // 카테고리별 배경색 설정
  const setBackgroundByCategory = (categoryName) => {
    if (categoryName === 'ALL') {
      // ALL 선택 시 랜덤 색상
      const categoriesWithColors = categories.filter(category => category.color);
      if (categoriesWithColors.length > 0) {
        const randomIndex = Math.floor(Math.random() * categoriesWithColors.length);
        const randomColor = categoriesWithColors[randomIndex].color;
        setBackgroundColor(randomColor);
      }
    } else {
      // 특정 카테고리 선택 시 해당 색상
      const selectedCategory = categories.find(category => category.name === categoryName);
      if (selectedCategory && selectedCategory.color) {
        setBackgroundColor(selectedCategory.color);
      }
    }
  };

  const value = {
    backgroundColor,
    setBackgroundColor,
    setBackgroundByCategory,
    categories
  };

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  );
};

export default BackgroundContext; 