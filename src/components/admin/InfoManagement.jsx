import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAboutInfo, saveAboutInfo } from '../../services/aboutService';
import './InfoManagement.css';

const InfoManagement = () => {
  const [aboutData, setAboutData] = useState({
    storyText: '',
    email: '',
    instagram: '',
    anotherProjects: [],
    partners: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newProject, setNewProject] = useState('');

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 }
  });
  const sensors = useSensors(pointerSensor);

  useEffect(() => {
    fetchAboutInfo();
  }, []);

  const fetchAboutInfo = async () => {
    try {
      setLoading(true);
      const data = await getAboutInfo();
      setAboutData(data);
    } catch (error) {
      console.error('About 정보 로딩 실패:', error);
      alert('About 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setAboutData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProjectAdd = () => {
    if (newProject.trim()) {
      setAboutData(prev => ({
        ...prev,
        // 가장 최근 항목이 맨 위로 오도록 앞에 추가
        anotherProjects: [newProject.trim(), ...prev.anotherProjects]
      }));
      setNewProject('');
    }
  };

  const handleProjectDelete = (index) => {
    setAboutData(prev => ({
      ...prev,
      anotherProjects: prev.anotherProjects.filter((_, i) => i !== index)
    }));
  };

  const handleProjectEdit = (index, newValue) => {
    setAboutData(prev => ({
      ...prev,
      anotherProjects: prev.anotherProjects.map((project, i) => 
        i === index ? newValue : project
      )
    }));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = active.data.current.index;
    const newIndex = over.data.current.index;
    if (oldIndex === undefined || newIndex === undefined) return;

    setAboutData(prev => ({
      ...prev,
      anotherProjects: arrayMove(prev.anotherProjects, oldIndex, newIndex)
    }));
  };

  const SortableItem = ({ index, value, onChange, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: index,
      data: { index }
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition
    };

    return (
      <div ref={setNodeRef} style={style} className="noproject-item" {...attributes} {...listeners}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(index, e.target.value)}
          className="noproject-input"
        />
        <button 
          onClick={() => onDelete(index)}
          className="delete-button"
        >
          삭제
        </button>
      </div>
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveAboutInfo(aboutData);
      alert('About 정보가 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('About 정보 저장 실패:', error);
      alert('About 정보 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="info-management-loading">로딩 중...</div>;
  }

  return (
    <div className="info-management">
      <div className="info-header">
        <h1>정보 관리</h1>
                {/* 저장 버튼 */}
        <div className="save-section">
          <button 
            onClick={handleSave} 
            className="save-button"
            disabled={saving}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
      


      <div className="info-management-content">
        
        {/* 스튜디오 소개 */}
        <section className="info-section">
          <h2>스튜디오 소개</h2>
          <textarea
            className="story-textarea"
            value={aboutData.storyText}
            onChange={(e) => handleInputChange('storyText', e.target.value)}
            placeholder="스튜디오 소개 텍스트를 입력하세요"
            rows={6}
          />
        </section>

        {/* 연락처 정보 */}
        <section className="info-section">
          <h2>연락처 정보</h2>
          <div className="contact-form">
            <div className="form-group">
              <label htmlFor="email">이메일</label>
              <input
                type="email"
                id="email"
                value={aboutData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@alolot.kr"
              />
            </div>
            <div className="form-group">
              <label htmlFor="instagram">인스타그램 URL</label>
              <input
                type="url"
                id="instagram"
                value={aboutData.instagram}
                onChange={(e) => handleInputChange('instagram', e.target.value)}
                placeholder="https://www.instagram.com/alolot.kr/"
              />
            </div>
          </div>
        </section>

        {/* 수록되지 않은 프로젝트 */}
        <section className="info-section">
          <h2>수록되지 않은 프로젝트</h2>
          <div className="noprojects-form">
            <div className="add-noproject">
              <input
                type="text"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="새 프로젝트 추가 (예: 2025, Child Knee Kick 참여)"
                onKeyPress={(e) => e.key === 'Enter' && handleProjectAdd()}
              />
              <button onClick={handleProjectAdd} className="add-button">
                추가
              </button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={aboutData.anotherProjects.map((_, idx) => idx)}
                strategy={verticalListSortingStrategy}
              >
                <div className="noprojects-list">
                  {aboutData.anotherProjects.map((project, index) => (
                    <SortableItem
                      key={index}
                      index={index}
                      value={project}
                      onChange={handleProjectEdit}
                      onDelete={handleProjectDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </section>

        {/* 함께해주신 분들 */}
        <section className="info-section">
          <h2>함께해주신 분들</h2>
          <textarea
            className="partners-textarea"
            value={aboutData.partners}
            onChange={(e) => handleInputChange('partners', e.target.value)}
            placeholder="함께해주신 분들을 쉼표로 구분하여 입력하세요"
            rows={4}
          />
        </section>
      </div>
    </div>
  );
};

export default InfoManagement; 