import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { deleteFileFromR2 } from './r2Service';

export const getProjects = async () => {
  try {
    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      detailImages: doc.data().detailImages || []
    }));
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
      detailImages: projectData.detailImages.map((img, index) => ({
        ...img,
        order: index
      }))
    });
  } catch (error) {
    console.error('프로젝트 추가 실패:', error);
    throw error;
  }
};

export const updateProjectImages = async (projectId, detailImages) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      detailImages: detailImages.map((img, index) => ({
        ...img,
        order: index
      }))
    });
  } catch (error) {
    console.error('프로젝트 이미지 업데이트 실패:', error);
    throw error;
  }
};

export const updateProject = async (projectId, projectData) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...projectData,
      detailImages: projectData.detailImages?.map((img, index) => ({
        ...img,
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