import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('geo_session_token', token);
      navigate('/dashboard', { replace: true });
    } else {
      // No token — something went wrong, go back to landing
      navigate('/', { replace: true });
    }
  }, [params, navigate]);

  return (
    <div
      style={{
        background: '#0A0A0B',
        color: '#ffffff',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#00D4FF', fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.1em', marginBottom: 12 }}>
          CONNECTING STORE
        </p>
        <p style={{ color: '#64748B', fontSize: 14 }}>Setting up your dashboard…</p>
      </div>
    </div>
  );
}
