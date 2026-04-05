import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AdminLoginPage() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) {
      setError('API key is required');
      return;
    }
    localStorage.setItem('admin_api_key', key.trim());
    navigate('/admin/spot-checks');
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0A0A0B' }}
    >
      <div
        className="w-full max-w-sm rounded-lg p-8"
        style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="mb-8">
          <span className="flex items-baseline gap-0 mb-1">
            <span className="font-bold font-mono text-[17px]" style={{ color: '#00D4FF' }}>GEO</span>
            <span className="text-[15px] font-normal" style={{ color: '#64748B' }}>.visibility</span>
          </span>
          <p className="text-white font-medium text-[15px] mt-4">Admin access</p>
          <p className="text-[13px] mt-1" style={{ color: '#64748B' }}>
            Enter your admin API key to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] mb-1.5 font-medium" style={{ color: '#94A3B8' }}>
              Admin API key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(''); }}
              placeholder="sk-admin-..."
              autoFocus
              className="w-full rounded px-3 py-2 text-[13px] text-white outline-none transition-colors"
              style={{
                background: '#161618',
                border: `1px solid ${error ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                fontFamily: 'DM Mono, monospace',
              }}
            />
            {error && (
              <p className="text-[12px] mt-1" style={{ color: '#EF4444' }}>{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="rounded px-4 py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#00D4FF', color: '#000' }}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
