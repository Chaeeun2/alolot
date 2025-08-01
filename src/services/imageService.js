import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, writeBatch, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { deleteFileFromR2 } from './r2Service';

// Cloudflare R2 Public URL
const R2_PUBLIC_URL = process.env.REACT_APP_R2_PUBLIC_URL;

// 이미지 URL 가져오기
export const getImageUrl = (fileName) => {
  return `${R2_PUBLIC_URL}/${fileName}`;
};

// 이미지 정보를 Firebase에 저장
export const saveImageInfo = async (imageData) => {
  try {
    const { url, fileName, title, description, category } = imageData;
    // url이 제공되면 사용하고, 없으면 fileName으로 생성
    const finalUrl = url || getImageUrl(fileName);
    
    const docRef = await addDoc(collection(db, 'images'), {
      url: finalUrl,
      fileName,
      title,
      description,
      category,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return docRef.id;
  } catch (error) {
    console.error('Error saving image info:', error);
    throw error;
  }
};

// 메인 이미지들 정보 가져오기 (여러 장)
export const getMainImages = async () => {
  try {
    // 인덱스 생성 전까지 단순한 쿼리 사용
    const q = query(
      collection(db, 'images'),
      where('category', '==', 'main')
      // orderBy는 인덱스 생성 후 추가 예정
    );

    const querySnapshot = await getDocs(q);
    const images = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      order: doc.data().order || 0
    }));

    // 클라이언트 사이드에서 정렬
    // order 필드로 정렬, order가 같으면 createdAt으로 정렬
    images.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return b.createdAt - a.createdAt;
    });

    return images;
  } catch (error) {
    console.error('Error getting main images:', error);
    throw error;
  }
};

// 메인 이미지 정보를 Firebase에 저장 (order 포함)
export const saveMainImageInfo = async (imageData, order = 0) => {
  try {
    const { url, fileName, title, description } = imageData;
    // url이 제공되면 사용하고, 없으면 fileName으로 생성
    const finalUrl = url || getImageUrl(fileName);
    
    const docRef = await addDoc(collection(db, 'images'), {
      url: finalUrl,
      fileName,
      title,
      description,
      category: 'main',
      order,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return docRef.id;
  } catch (error) {
    console.error('Error saving main image info:', error);
    throw error;
  }
};

// 메인 이미지 삭제
export const deleteMainImage = async (imageId) => {
  try {
    // 먼저 이미지 정보 가져오기
    const imageDoc = await getDoc(doc(db, 'images', imageId));
    
    if (!imageDoc.exists()) {
      throw new Error('이미지를 찾을 수 없습니다.');
    }
    
    const imageData = imageDoc.data();
    
    // R2에서 실제 파일 삭제
    if (imageData.url) {
      try {
        await deleteFileFromR2(imageData.url);
        console.log('R2 파일 삭제 완료:', imageData.url);
      } catch (r2Error) {
        console.error('R2 파일 삭제 실패 (계속 진행):', r2Error);
        // R2 삭제 실패해도 메타데이터는 삭제하도록 계속 진행
      }
    }
    
    // Firebase에서 메타데이터 삭제
    await deleteDoc(doc(db, 'images', imageId));
    console.log('Firebase 메타데이터 삭제 완료:', imageId);
    
  } catch (error) {
    console.error('Error deleting main image:', error);
    throw error;
  }
};

// 메인 이미지들 순서 업데이트
export const updateMainImagesOrder = async (images) => {
  try {
    const batch = writeBatch(db);
    
    images.forEach((image, index) => {
      const imageRef = doc(db, 'images', image.id);
      batch.update(imageRef, { order: index });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error updating main images order:', error);
    throw error;
  }
};



// 메인 이미지 정보 가져오기 (단일, 호환성용)
export const getMainImage = async () => {
  try {
    const images = await getMainImages();
    return images.length > 0 ? images[0] : null;
  } catch (error) {
    console.error('Error getting main image:', error);
    throw error;
  }
}; 