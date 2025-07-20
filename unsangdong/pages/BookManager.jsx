import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '../components/AdminLayout';
import { bookService } from '../services/dataService';
import { imageService } from '../services/imageService';
import '../styles/admin.css';

// SortableBookItem 컴포넌트
function SortableBookItem({ id, book, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      className={`admin-table-row ${isDragging ? 'dragging' : ''}`}
    >
      <div className="admin-table-cell admin-table-title">
        <div 
          className="admin-project-drag-handle"
          {...listeners}
        >
          ⠿
        </div>
        <div className="admin-project-title-info">
          <div className="admin-project-title-main">{book.title || '제목 없음'}</div>
        </div>
      </div>
      <div className="admin-table-cell admin-table-size">
        {book.size || '-'}
      </div>
      <div className="admin-table-cell admin-table-link">
        {book.externalLink ? (
          <a 
            href={book.externalLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="external-link"
          >
            URL
          </a>
        ) : (
          '-'
        )}
      </div>
      <div className="admin-table-cell admin-table-actions">
        <button
          className="admin-button admin-button-secondary admin-button-small"
          onClick={() => onEdit(book)}
        >
          수정
        </button>
        <button
          className="admin-button admin-button-danger admin-button-small"
          onClick={() => onDelete(book.id)}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

// Book 모달 컴포넌트
function BookModal({ isOpen, onClose, onSubmit, loading, book = null }) {
  const [title, setTitle] = useState('');
  const [size, setSize] = useState('중간');
  const [externalLink, setExternalLink] = useState('');
  const [useExternalLink, setUseExternalLink] = useState(false);
  const [thumbnailImage, setThumbnailImage] = useState('');
  const [uploading, setUploading] = useState(false);

  // 모달이 열릴 때 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      if (book) {
        // 수정 모드
        setTitle(book.title || '');
        setSize(book.size || '중간');
        setExternalLink(book.externalLink || '');
        setUseExternalLink(!!book.externalLink);
        setThumbnailImage(book.thumbnailImage || '');
      } else {
        // 새 추가 모드
        setTitle('');
        setSize('중간');
        setExternalLink('');
        setUseExternalLink(false);
        setThumbnailImage('');
      }
    }
  }, [isOpen, book]);

  const handleSubmit = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    
    if (!thumbnailImage) {
      alert('썸네일 이미지를 업로드해주세요.');
      return;
    }

    const bookData = {
      title: title.trim(),
      size,
      externalLink: useExternalLink ? externalLink.trim() : '',
      thumbnailImage,
      order: book ? book.order : 0
    };

    onSubmit(bookData);
  };

  const handleThumbnailUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await imageService.uploadImage(file, { prefix: 'books-' });
      setThumbnailImage(result.imageUrl || result.publicUrl);
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      alert('썸네일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveThumbnail = async () => {
    if (!thumbnailImage) return;

    try {
      await imageService.deleteImage(thumbnailImage);
      setThumbnailImage('');
    } catch (error) {
      console.error('Error removing thumbnail:', error);
      alert('썸네일 삭제에 실패했습니다.');
    }
  };



  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="admin-modal-content admin-modal-large">
        <div className="admin-modal-header">
          <h3>{book ? '도서 수정' : '새 도서 추가'}</h3>
                    <div className="admin-form-actions">
            <button
              type="button"
              onClick={onClose}
              className="admin-button admin-button-secondary"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="admin-button admin-button-primary"
              disabled={loading || uploading}
            >
              {loading ? '저장 중...' : (book ? '수정' : '추가')}
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="admin-modal-body">
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label>제목</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="admin-input"
                  required
                />
              </div>
              
              <div className="admin-form-group">
                <label>크기</label>
                <select value={size} onChange={(e) => setSize(e.target.value)} className="book-select">
                  <option value="작게">작게</option>
                  <option value="중간">중간</option>
                  <option value="크게">크게</option>
                </select>
              </div>
              
              <div className="admin-form-group">
              <label className="admin-checkbox-label">
                <div>
                  <input
                    type="checkbox"
                    checked={useExternalLink}
                    onChange={(e) => setUseExternalLink(e.target.checked)}
                  />
                  </div>
                  <div>URL 사용</div>
                </label>
              </div>
              
              {useExternalLink && (
                <div className="admin-form-group">
                  <label>URL</label>
                  <input
                    type="url"
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    className="admin-input"
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>
            
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label>썸네일 이미지</label>
                <div className="admin-upload-button-container">
                  <input
                    type="file"
                    id="book-thumbnail"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('book-thumbnail').click()}
                    className="admin-button admin-button-secondary"
                    disabled={uploading}
                  >
                    {uploading ? '업로드 중...' : '이미지 선택'}
                  </button>
                  <small className="admin-upload-caption">
                    지원 포맷: JPG, PNG, WebP, GIF ㅣ 최대 용량: 2MB
                  </small>
                </div>
                
                {thumbnailImage && (
                  <div className="admin-book-preview">
                    <img src={thumbnailImage} alt="썸네일 미리보기" />
                  </div>
                )}
              </div>
              
                          </div>
        </form>
      </div>
    </div>
  );
}

const BookManager = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const bookSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const booksData = await bookService.getBooks();
      setBooks(booksData || []);
    } catch (error) {
      console.error('도서 로딩 실패:', error);
      alert('도서 로딩에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (bookData) => {
    setModalLoading(true);
    try {
      if (editingBook) {
        // 수정
        await bookService.updateBook(editingBook.id, bookData);
        setBooks(prev => prev.map(book => 
          book.id === editingBook.id ? { id: editingBook.id, ...bookData } : book
        ));
      } else {
        // 새 추가
        const newBookId = await bookService.addBook(bookData);
        setBooks(prev => [
          { id: newBookId, ...bookData },
          ...prev
        ]);
      }
      setIsModalOpen(false);
      setEditingBook(null);
    } catch (error) {
      console.error('도서 저장 실패:', error);
      alert('도서 저장에 실패했습니다.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 도서를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await bookService.deleteBook(id);
      setBooks(prev => prev.filter(book => book.id !== id));
    } catch (error) {
      console.error('도서 삭제 실패:', error);
      alert('도서 삭제에 실패했습니다.');
    }
  };

  const handleNewBook = () => {
    setEditingBook(null);
    setIsModalOpen(true);
  };

  // 도서 목록 드래그앤드롭 핸들러
  const handleBookListDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = books.findIndex(book => book.id === active.id);
      const newIndex = books.findIndex(book => book.id === over.id);

      const newBooks = arrayMove(books, oldIndex, newIndex);

      // 로컬 상태 업데이트
      setBooks(newBooks);

      // 백엔드 업데이트 (순서 정보 저장)
      try {
        const bookIds = newBooks.map(item => item.id);
        await bookService.updateBookOrder(bookIds);
      } catch (error) {
        console.error('도서 순서 변경 실패:', error);
        // 실패 시 원래 상태로 복구
        await loadBooks();
        alert('순서 변경에 실패했습니다.');
      }
    }
  };

  return (
    <AdminLayout>
      <div className="admin-content">
        <h2 className="admin-page-title">BOOK 관리</h2>
        
        <div className="admin-content-layout">
          <div className="admin-content-main">
            <div className="admin-content-header">
              <h3 className="admin-content-title">도서 관리</h3>
              <div className="admin-header-buttons">
                <button 
                  className="admin-button admin-button-primary"
                  onClick={handleNewBook}
                >
                  도서 추가
                </button>
              </div>
            </div>

            {loading ? (
              <p>로딩 중...</p>
            ) : (
              <div className="admin-projects-container">
                {books.length === 0 ? (
                  <div className="admin-empty-state">
                    <p>등록된 도서가 없습니다.</p>
                    <button 
                      className="admin-button admin-button-primary"
                      onClick={handleNewBook}
                    >
                      첫 번째 도서 추가
                    </button>
                  </div>
                ) : (
                  <DndContext
                    sensors={bookSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleBookListDragEnd}
                    animateLayoutChanges={false}
                  >
                    <SortableContext
                      items={books.map(book => book.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="admin-projects-table">
                        <div className="admin-table-body" style={{ maxHeight: 'calc(100vh - 230px)' }}>
                          {books.map((book) => (
                            <SortableBookItem
                              key={book.id}
                              id={book.id}
                              book={book}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BookModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBook(null);
        }}
        onSubmit={handleSave}
        loading={modalLoading}
        book={editingBook}
      />
    </AdminLayout>
  );
};

export default BookManager; 