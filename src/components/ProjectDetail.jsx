import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjects } from '../services/projectService';
import { useBackground } from '../contexts/BackgroundContext';
import SideMenu from './SideMenu';
import './ProjectDetail.css';

const ProjectDetail = () => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { backgroundColor } = useBackground();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const data = await getProjects();
        const foundProject = data.find(p => p.id === projectId);
        if (!foundProject) {
          navigate('/projects');
          return;
        }
        setProject(foundProject);
      } catch (error) {
        console.error('프로젝트 로딩 중 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, navigate]);

  if (loading) {
    return (
      <>
        <SideMenu backgroundColor={backgroundColor} />
        <div className="project-detail-loading">로딩 중...</div>
      </>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <>
      <SideMenu backgroundColor={backgroundColor} />
      <div className="project-detail-container">
        <div className="project-detail-header">
          <h1>{project.title}</h1>
          <p className="project-description">{project.description}</p>
        </div>

        <div className="project-detail-main-image">
          <img src={project.mainImageUrl} alt={project.title} />
        </div>

        <div className="project-detail-content">
          <div className="project-detail-info">
                      
                      <div className="project-detail-text" style={{ whiteSpace: 'pre-wrap' }}>
            {project.detail}
          </div>
          </div>

          {project.detailImages && project.detailImages.length > 0 && (
            <div className="project-detail-images">
              {project.detailImages.map((image, index) => (
                  <div key={index} className="detail-image">
                    <img src={image.url} alt={`상세 이미지 ${index + 1}`} />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProjectDetail; 