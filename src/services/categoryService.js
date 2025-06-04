import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const getCategories = async () => {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('카테고리 데이터 가져오기 실패:', error);
    throw error;
  }
};

export const getCategory = async (categoryId) => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    const docSnapshot = await getDoc(categoryRef);
    if (docSnapshot.exists()) {
      return {
        id: docSnapshot.id,
        ...docSnapshot.data(),
        createdAt: docSnapshot.data().createdAt?.toDate() || new Date()
      };
    } else {
      throw new Error('카테고리를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('카테고리 가져오기 실패:', error);
    throw error;
  }
};

export const addCategory = async (categoryData) => {
  try {
    const categoriesRef = collection(db, 'categories');
    await addDoc(categoriesRef, {
      ...categoryData,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('카테고리 추가 실패:', error);
    throw error;
  }
};

export const updateCategory = async (categoryId, categoryData) => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, categoryData);
  } catch (error) {
    console.error('카테고리 업데이트 실패:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
  } catch (error) {
    console.error('카테고리 삭제 실패:', error);
    throw error;
  }
}; 