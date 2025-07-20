import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { deleteFileFromR2 } from './r2Service';

export const getProjects = async () => {
  try {
    const projectsRef = collection(db, 'projects');
    const querySnapshot = await getDocs(projectsRef);
    
    const projects = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // 하위 호환성: detailImages가 있으면 detailMedia로 변환
      let detailMedia = data.detailMedia || [];
      if (data.detailImages && !data.detailMedia) {
        detailMedia = data.detailImages.map(img => ({
          type: 'image',
          url: img.url,
          order: img.order || 0
        }));
      }
      
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        detailMedia: detailMedia
      };
    });

    // 최근에 추가된 프로젝트가 앞으로 오도록 createdAt으로 정렬 (내림차순)
    projects.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return projects;
  } catch (error) {
    console.error('프로젝트 데이터 가져오기 실패:', error);
    throw error;
  }
};

export const addProject = async (projectData) => {
  try {
    const projectsRef = collection(db, 'projects');
    await addDoc(projectsRef, {
      ...projectData,
      createdAt: new Date(), // 최신 프로젝트가 앞으로 오도록 현재 시간 설정
      detailMedia: projectData.detailMedia?.map((media, index) => ({
        ...media,
        order: index
      })) || []
    });
  } catch (error) {
    console.error('프로젝트 추가 실패:', error);
    throw error;
  }
};

export const updateProjectImages = async (projectId, detailMedia) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      detailMedia: detailMedia.map((media, index) => ({
        ...media,
        order: index
      }))
    });
  } catch (error) {
    console.error('프로젝트 미디어 업데이트 실패:', error);
    throw error;
  }
};

export const updateProject = async (projectId, projectData) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...projectData,
      detailMedia: projectData.detailMedia?.map((media, index) => ({
        ...media,
        order: index
      })) || []
    });
  } catch (error) {
    console.error('프로젝트 업데이트 실패:', error);
    throw error;
  }
};

export const deleteProject = async (projectId) => {
  try {
    // 먼저 프로젝트 정보 가져오기
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }
    
    const projectData = projectDoc.data();
    const imagesToDelete = [];
    
    // 삭제할 이미지 URL들 수집
    if (projectData.thumbnailUrl) {
      imagesToDelete.push(projectData.thumbnailUrl);
    }
    if (projectData.mainImageUrl) {
      imagesToDelete.push(projectData.mainImageUrl);
    }
    if (projectData.detailImages && Array.isArray(projectData.detailImages)) {
      projectData.detailImages.forEach(img => {
        if (img.url) {
          imagesToDelete.push(img.url);
        }
      });
    }
    
    // R2에서 모든 관련 이미지 삭제
    const deletePromises = imagesToDelete.map(async (imageUrl) => {
      try {
        await deleteFileFromR2(imageUrl);
        console.log('프로젝트 이미지 삭제 완료:', imageUrl);
      } catch (r2Error) {
        console.error('프로젝트 이미지 삭제 실패 (계속 진행):', r2Error);
        // 개별 이미지 삭제 실패해도 계속 진행
      }
    });
    
    // 모든 이미지 삭제 작업을 병렬로 실행
    await Promise.allSettled(deletePromises);
    
    // Firebase에서 프로젝트 메타데이터 삭제
    await deleteDoc(projectRef);
    console.log('프로젝트 삭제 완료:', projectId);
    
  } catch (error) {
    console.error('프로젝트 삭제 실패:', error);
    throw error;
  }
}; 