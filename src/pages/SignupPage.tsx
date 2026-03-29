import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, BarChart2, Zap, Shield, Check } from 'lucide-react';
import { getOAuthURL } from '../lib/api';

const PERKS = [
  { icon: <BarChart2 size={15} />, title: 'See exactly where you're invisible', body: 'Real scans on ChatGPT, Perplexity, and Gemini — not estimates.' },
  { icon: <Zap size={15} />, title: 'One-click fixes applied to your store', body: 'AI-generated improvements, reviewed by you, pushed directly to Shopify.' },
  { icon: <Shield size={15} />, title: 'No credit card. 14-day free trial.', body: 'Start monitoring in 60 seconds. Cancel any time.' },
];

export function SignupPage() {
  const [shop, setShop] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const raw = shop.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!raw) {
      setError('Enter your Shopify store domain to get started');
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
          Already connected?{' '}
          <Link to="/login" className="no-underline" style={{ color: '#00D4FF' }}>
            Sign in →
          </Link>
        </p>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start" style={{ width: '100%', maxWidth: 860 }}>

          {/* Left — value props */}
          <div>
            <p
              className="font-mono text-[11px] uppercase tracking-widest mb-4"
              style={{ color: '#00D4FF' }}
            >
              AI SEARCH VISIBILITY
            </p>
            <h1 className="font-semibold text-white mb-3 leading-tight" style={{ fontSize: 'clamp(26px, 4vw, 36px)' }}>
              Stop losing customers<br />
              <span style={{ color: '#64748B' }}>to invisible competitors.</span>
            </h1>
            <p className="mb-8" style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
              ChatGPT, Perplexity, and Gemini are recommending your competitors
              right now. GeoVisibility tells you exactly why — and fixes it.
            </p>

            <div className="space-y-5">
              {PERKS.map((perk, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-[8px]"
                    style={{
                      width: 34, height: 34,
                      background: 'rgba(0,212,255,0.08)',
                      border: '1px solid rgba(0,212,255,0.15)',
                      color: '#00D4FF',
                    }}
                  >
                    {perk.icon}
                  </div>
                  <div>
                    <p className="font-medium text-white text-[14px] mb-0.5">{perk.title}</p>
                    <p style={{ color: '#64748B', fontSize: 13 }}>{perk.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Social proof strip */}
            <div
              className="mt-10 flex items-center gap-4 rounded-[8px] px-4 py-3"
              style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: '#F59E0B', fontSize: 12 }}>★</span>
                ))}
              </div>
              <p style={{ color: '#64748B', fontSize: 12 }}>
                "Visibility went from 8% to 41% in 3 weeks"
              </p>
            </div>
          </div>

          {/* Right — sign-up form */}
          <div>
            <div
              className="rounded-[12px] p-7"
              style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-[8px]"
                  style={{
                    width: 38, height: 38,
                    background: 'rgba(0,212,255,0.1)',
                    border: '1px solid rgba(0,212,255,0.2)',
                  }}
                >
                  <ShoppingBag size={18} style={{ color: '#00D4FF' }} />
                </div>
                <div>
                  <p className="font-semibold text-white text-[16px] leading-tight">Connect your store</p>
                  <p style={{ color: '#64748B', fontSize: 12 }}>Free 14-day trial. No card needed.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
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
                    marginBottom: error ? 6 : 16,
                  }}
                />
                {error && (
                  <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 14 }}>{error}</p>
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
                    <>Start free trial <ArrowRight size={15} /></>
                  )}
                </button>
              </form>

              {/* What you're granting */}
              <div
                className="mt-5 rounded-[8px] p-4 space-y-2.5"
                style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                {[
                  'Scan your products to find AI visibility gaps',
                  'Write fixes only when you approve them',
                  'AES-256 encrypted. Never shared.',
                ].map((line, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Check size={12} style={{ color: '#00D4FF', marginTop: 2, flexShrink: 0 }} />
                    <span style={{ color: '#64748B', fontSize: 12 }}>{line}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-center text-[11px]" style={{ color: '#334155' }}>
                You'll be redirected to Shopify to authorize access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
