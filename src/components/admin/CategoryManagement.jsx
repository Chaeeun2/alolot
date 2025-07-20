import React, { useState, useEffect } from 'react';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../../services/categoryService';
import './CategoryManagement.css';

function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editCategory, setEditCategory] = useState({
    name: '',
    color: '#007bff'
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#007bff'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('카테고리 로딩 중 오류:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCategory(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditCategory(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const categoryData = {
        name: newCategory.name,
        color: newCategory.color
      };

      await addCategory(categoryData);
      
      setNewCategory({
        name: '',
        color: '#007bff'
      });
      
      fetchCategories();
      alert('카테고리가 성공적으로 추가되었습니다.');
    } catch (error) {
      console.error('카테고리 추가 중 오류:', error);
      alert('카테고리 추가 실패: ' + error.message);
    }
  };

  const handleEditStart = (category) => {
    setEditingCategoryId(category.id);
    setEditCategory({
      name: category.name,
      color: category.color || '#007bff'
    });
  };

  const handleEditCancel = () => {
    setEditingCategoryId(null);
    setEditCategory({
      name: '',
      color: '#007bff'
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const categoryData = {
        name: editCategory.name,
        color: editCategory.color
      };

      await updateCategory(editingCategoryId, categoryData);
      
      handleEditCancel();
      fetchCategories();
      alert('카테고리가 성공적으로 수정되었습니다.');
    } catch (error) {
      console.error('카테고리 수정 중 오류:', error);
      alert('카테고리 수정 실패: ' + error.message);
    }
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm('정말로 이 카테고리를 삭제하시겠습니까?')) {
      try {
        await deleteCategory(categoryId);
        fetchCategories();
        alert('카테고리가 삭제되었습니다.');
      } catch (error) {
        console.error('카테고리 삭제 중 오류:', error);
        alert('카테고리 삭제 실패: ' + error.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="category-management">
        <h1>카테고리 관리</h1>
        <div className="admin-loading">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-management">
        <h1>카테고리 관리</h1>
        <div className="error-message">
          오류가 발생했습니다: {error}
          <button onClick={fetchCategories}>다시 시도</button>
        </div>
      </div>
    );
  }

  return (
    <div className="category-management">
      <div className="category-header"><h1>카테고리 관리</h1></div>
      
      <div className="category-section">
        <h2>새 카테고리 추가</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="name">카테고리 이름</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newCategory.name}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="color">컬러</label>
            <div className="color-input-group">
              <input
                type="color"
                id="color"
                name="color"
                value={newCategory.color}
                onChange={handleInputChange}
              />
              <input
                type="text"
                value={newCategory.color}
                onChange={handleInputChange}
                name="color"
                placeholder="#007bff"
                className="color-text-input"
              />
            </div>
          </div>

          <button type="submit" className="submit-button">카테고리 추가</button>
        </form>
      </div>

      <div className="category-section">
        <h2>카테고리 목록 ({categories.length}개)</h2>
        <div className="category-list">
          {categories.length === 0 ? (
            <div className="empty-message">등록된 카테고리가 없습니다.</div>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="category-item">
                {editingCategoryId === category.id ? (
                  <form onSubmit={handleEditSubmit} className="edit-form">
                    <div className="form-group">
                      <label htmlFor={`edit-name-${category.id}`}>카테고리 이름</label>
                      <input
                        type="text"
                        id={`edit-name-${category.id}`}
                        name="name"
                        value={editCategory.name}
                        onChange={handleEditInputChange}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`edit-color-${category.id}`}>컬러</label>
                      <div className="color-input-group">
                        <input
                          type="color"
                          id={`edit-color-${category.id}`}
                          name="color"
                          value={editCategory.color}
                          onChange={handleEditInputChange}
                        />
                        <input
                          type="text"
                          value={editCategory.color}
                          onChange={handleEditInputChange}
                          name="color"
                          placeholder="#007bff"
                          className="color-text-input"
                        />
                      </div>
                    </div>

                    <div className="edit-buttons">
                      <button type="submit" className="save-button">저장</button>
                      <button type="button" className="cancel-button" onClick={handleEditCancel}>
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="category-info">
                      <div className="category-name">
                        <h3>{category.name}</h3>
                        <div 
                          className="category-color-indicator"
                          style={{ 
                            backgroundColor: category.color || '#007bff',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            display: 'inline-block',
                            marginLeft: '10px'
                          }}
                        ></div>
                        <span className="color-code">{category.color || '#007bff'}</span>
                      </div>
                    </div>
                    <div className="category-actions">
                      <button
                        className="edit-button"
                        onClick={() => handleEditStart(category)}
                      >
                        수정
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(category.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryManagement; 