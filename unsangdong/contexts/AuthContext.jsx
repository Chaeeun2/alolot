import { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged } from '@firebase/auth';
import { auth } from '../lib/firebase';
import { loginAdmin, logoutAdmin, checkAdminPermission } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase Auth 상태 변경 리스너
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 관리자 권한 확인
          const isAdmin = await checkAdminPermission();
          if (isAdmin) {
            setUser({ user: firebaseUser, isAdmin: true });
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('관리자 권한 확인 실패:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const result = await loginAdmin(email, password);
      setUser(result);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutAdmin();
      setUser(null);
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const checkAdmin = async () => {
    return await checkAdminPermission();
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 