import { 
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';

// 쿼리 함수들 내보내기
export { where, orderBy, limit };

// 컬렉션 참조 가져오기
export const getCollectionRef = (collectionName) => {
  return collection(db, collectionName);
};

// 문서 참조 가져오기
export const getDocumentRef = (collectionName, docId) => {
  return doc(db, collectionName, docId);
};

// 컬렉션의 모든 문서 가져오기
export const getAllDocuments = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(getCollectionRef(collectionName));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
};

// 특정 문서 가져오기
export const getDocument = async (collectionName, docId) => {
  try {
    const docRef = getDocumentRef(collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
};

// 새 문서 추가하기
export const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(getCollectionRef(collectionName), data);
    return docRef.id;
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
};

// 문서 업데이트하기
export const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = getDocumentRef(collectionName, docId);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

// 문서 삭제하기
export const deleteDocument = async (collectionName, docId) => {
  try {
    const docRef = getDocumentRef(collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// 쿼리 실행하기
export const queryDocuments = async (collectionName, constraints) => {
  try {
    const q = query(getCollectionRef(collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error querying documents:', error);
    throw error;
  }
}; 