import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Shield, Zap } from 'lucide-react';
import { getOAuthURL } from '../lib/api';

export function LoginPage() {
  const [shop, setShop] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const raw = shop.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!raw) {
      setError('Enter your Shopify store domain');
      return;
    }
    const domain = raw.endsWith('.myshopify.com') ? raw : `${raw}.myshopify.com`;
    setLoading(true);
    window.location.href = getOAuthURL(domain);
  }

  return (
    <div
      style={{
        background: '#0A0A0B',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5">
        <Link to="/" className="flex items-baseline gap-0 no-underline">
          <span className="font-bold font-mono text-[18px]" style={{ color: '#00D4FF' }}>GEO</span>
          <span className="text-[16px]" style={{ color: '#64748B' }}>.visibility</span>
        </Link>
        <p className="text-[13px]" style={{ color: '#64748B' }}>
          New here?{' '}
          <Link to="/signup" className="no-underline" style={{ color: '#00D4FF' }}>
            Start free trial →
          </Link>
        </p>
      </header>

      {/* Center card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Icon + heading */}
          <div className="mb-8">
            <div
              className="mb-5 inline-flex items-center justify-center rounded-[10px]"
              style={{
                width: 44, height: 44,
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.2)',
              }}
            >
              <ShoppingBag size={20} style={{ color: '#00D4FF' }} />
            </div>
            <h1 className="font-semibold text-white mb-2" style={{ fontSize: 26 }}>
              Welcome back
            </h1>
            <p style={{ color: '#64748B', fontSize: 14 }}>
              Connect your store to access your dashboard.
            </p>
          </div>

          {/* Form card */}
          <form
            onSubmit={handleSubmit}
            className="rounded-[10px] p-6"
            style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <label
              htmlFor="shop"
              style={{ display: 'block', fontSize: 11, color: '#64748B', letterSpacing: '0.08em', marginBottom: 8 }}
            >
              STORE DOMAIN
            </label>
            <input
              id="shop"
              autoFocus
              type="text"
              placeholder="your-store.myshopify.com"
              value={shop}
              onChange={(e) => { setShop(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#0D0D0F',
                border: `1px solid ${error ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 8,
                padding: '11px 14px',
                color: '#ffffff',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
                marginBottom: error ? 6 : 20,
              }}
            />
            {error && (
              <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 16 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full font-semibold transition-all"
              style={{
                background: loading ? 'rgba(0,212,255,0.6)' : '#00D4FF',
                color: '#0A0A0B',
                border: 'none',
                borderRadius: 8,
                padding: '12px 0',
                fontSize: 14,
                cursor: loading ? 'default' : 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {loading ? (
                'Redirecting to Shopify…'
              ) : (
                <>Connect Store <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          {/* Trust signals */}
          <div className="mt-5 space-y-2.5">
            {[
              { icon: <Shield size={13} />, text: 'Your access token is AES-256 encrypted at rest' },
              { icon: <Zap size={13} />, text: 'Read-only access unless you approve a fix' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span style={{ color: '#334155', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ color: '#475569', fontSize: 12 }}>{item.text}</span>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-[12px]" style={{ color: '#334155' }}>
            You'll be redirected to Shopify to authorize access.
          </p>
        </div>
      </div>
    </div>
  );
}
