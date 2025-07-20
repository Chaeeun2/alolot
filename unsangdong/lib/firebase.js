// Firebase 설정 및 초기화
import { initializeApp } from '@firebase/app';
import { getFirestore } from '@firebase/firestore';
import { getAuth } from '@firebase/auth';

// Firebase 설정 (환경 변수에서 가져오기)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스들 초기화
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app; 