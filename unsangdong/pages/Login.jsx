import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/admin.css';
import { useMobile } from '../contexts/MobileContext';
import MobileCheck from '../components/MobileCheck';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { isMobile } = useMobile();
  const { login, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  // 이미 인증된 관리자면 자동으로 admin 홈으로 이동
  useEffect(() => {
    if (!authLoading && user && user.isAdmin) {
      navigate('/admin/mainpage');
    }
  }, [user, authLoading]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(credentials.email, credentials.password);
      // navigate 호출 제거 - AuthContext의 상태 변경에 의존
    } catch (error) {
      setError(error.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  if (isMobile) {
    return <MobileCheck />;
  }

  if (authLoading) {
    return (
      <div className="admin-login">
        <div className="admin-form">
          <h2 className="admin-page-title">운생동 Admin</h2>
          <div>로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login">
      <form onSubmit={handleLogin} className="admin-form">
        <h2 className="admin-page-title">운생동 Admin</h2>
        <div className="admin-login-guide">관리자 계정은 제작사에 문의 바랍니다.</div>
        {error && <div className="admin-error-message">{error}</div>}
        <div className="admin-form-group" style={{marginBottom: "20px"}}>
          <label htmlFor="email">이메일</label>
          <input
            type="email"
            id="email"
            value={credentials.email}
            onChange={(e) => setCredentials({...credentials, email: e.target.value})}
            className="admin-input"
            required
            autoComplete="username"
          />
        </div>
        <div className="admin-form-group" style={{marginBottom: "20px"}}>
          <label htmlFor="password">비밀번호</label>
          <input
            type="password"
            id="password"
            value={credentials.password}
            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            className="admin-input"
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" disabled={loading} className="admin-button">
          {loading ? '로그인 중...' : '관리자 로그인'}
        </button>
      </form>
    </div>
  );
} 