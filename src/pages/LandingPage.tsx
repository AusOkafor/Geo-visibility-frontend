import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, ArrowRight, ShoppingBag, Shield, Zap } from 'lucide-react';
import { getOAuthURL } from '../lib/api';

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);
  return scrolled;
}

const PRICING = [
  {
    name: 'Starter',
    price: 29,
    popular: false,
    features: [
      '3 AI platforms monitored',
      '30 queries per platform',
      'Weekly scan frequency',
      '5 fixes per month',
    ],
  },
  {
    name: 'Growth',
    price: 79,
    popular: true,
    features: [
      '3 AI platforms monitored',
      '100 queries per platform',
      'Daily scan frequency',
      'Unlimited fixes',
      'Competitor tracking (top 10)',
    ],
  },
  {
    name: 'Pro',
    price: 179,
    popular: false,
    features: [
      '3 AI platforms monitored',
      '500 queries per platform',
      'Real-time monitoring',
      'Unlimited fixes',
      'Competitor tracking (top 50)',
      'API access',
    ],
  },
];

// ── Shared modal state lifted to module level so any button can open it ────────
let _setModalOpen: ((v: boolean) => void) | null = null;

function openConnectModal() {
  _setModalOpen?.(true);
}

function ConnectModal() {
  const [open, setOpen] = useState(false);
  const [shop, setShop] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Register setter so any button can trigger this modal
  useEffect(() => {
    _setModalOpen = setOpen;
    return () => { _setModalOpen = null; };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setShop('');
    setError('');
    setLoading(false);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  function handleConnect() {
    const raw = shop.trim().toLowerCase().replace(/^https?:\/\//, '');
    if (!raw) {
      setError('Please enter your Shopify store domain');
      return;
    }
    const domain = raw.endsWith('.myshopify.com') ? raw : `${raw}.myshopify.com`;
    setLoading(true);
    window.location.href = getOAuthURL(domain);
  }

  if (!open) return null;

  return createPortal(
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111113',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 480,
          padding: '32px',
          position: 'relative',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'rgba(0,212,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingBag size={18} style={{ color: '#00D4FF' }} />
            </div>
            <div>
              <p style={{ color: '#ffffff', fontWeight: 600, fontSize: 16, margin: 0 }}>
                Connect your Shopify store
              </p>
              <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
                Takes less than 60 seconds
              </p>
            </div>
          </div>
        </div>

        {/* What you're granting */}
        <div style={{
          background: '#0D0D0F',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {[
            { icon: <Zap size={14} />, text: 'Read your product catalog to run AI visibility scans' },
            { icon: <ArrowRight size={14} />, text: 'Write product descriptions when you approve a fix' },
            { icon: <Shield size={14} />, text: 'Your access token is AES-256 encrypted at rest' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ color: '#00D4FF', marginTop: 1, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Domain input */}
        <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#64748B', letterSpacing: '0.05em' }}>
          YOUR STORE DOMAIN
        </label>
        <div style={{ position: 'relative', marginBottom: error ? 8 : 20 }}>
          <input
            autoFocus
            type="text"
            placeholder="your-store.myshopify.com"
            value={shop}
            onChange={(e) => { setShop(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#0D0D0F',
              border: `1px solid ${error ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 8,
              padding: '12px 14px',
              color: '#ffffff',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
        </div>
        {error && (
          <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 16, marginTop: 0 }}>{error}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleConnect}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#00D4FF99' : '#00D4FF',
            color: '#0A0A0B',
            border: 'none',
            borderRadius: 8,
            padding: '13px 0',
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading ? 'Redirecting to Shopify…' : (
            <>Connect Store <ArrowRight size={16} /></>
          )}
        </button>

        <p style={{ color: '#64748B', fontSize: 11, textAlign: 'center', marginTop: 14, marginBottom: 0 }}>
          You'll be redirected to Shopify to authorize access. No credit card required.
        </p>
      </div>
    </div>,
    document.body
  );
}

function ConnectButton({ label, className, style }: { label: string; className?: string; style?: React.CSSProperties }) {
  return (
    <button onClick={openConnectModal} className={className} style={style}>
      {label}
    </button>
  );
}

export function LandingPage() {
  const scrolled = useScrolled();
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ background: '#0A0A0B', color: '#ffffff', fontFamily: 'DM Sans, sans-serif' }}>
      <ConnectModal />
      {/* Sticky header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 transition-all duration-300"
        style={{
          height: 60,
          background: scrolled ? 'rgba(10,10,11,0.9)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
        }}
      >
        <span className="flex items-baseline gap-0">
          <span className="font-bold font-mono text-[18px]" style={{ color: '#00D4FF' }}>
            GEO
          </span>
          <span className="text-[16px]" style={{ color: '#64748B' }}>
            .visibility
          </span>
        </span>
        <nav className="hidden md:flex items-center gap-8 text-[14px]" style={{ color: '#94a3b8' }}>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </nav>
        <ConnectButton
          label="Connect Store"
          className="text-[13px] font-medium px-4 py-1.5 rounded transition-all hover:bg-[#00D4FF22]"
          style={{
            border: '1px solid #00D4FF',
            color: '#00D4FF',
            borderRadius: 6,
            background: 'transparent',
            cursor: 'pointer',
          }}
        />
      </header>

      {/* Hero */}
      <section
        className="relative flex items-center min-h-screen pt-16 px-8"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,212,255,0.04) 0%, transparent 70%), #0A0A0B',
        }}
      >
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-5 gap-12 items-center">
          {/* Left */}
          <div className="md:col-span-3">
            <p
              className="text-[11px] font-mono uppercase tracking-widest mb-5"
              style={{ color: '#00D4FF' }}
            >
              AI SEARCH VISIBILITY
            </p>
            <h1
              className="font-semibold leading-tight mb-6"
              style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}
            >
              <span className="text-white">Your store is invisible</span>
              <br />
              <span style={{ color: '#64748B' }}>to AI search engines.</span>
            </h1>
            <p
              className="text-[18px] mb-8 max-w-lg leading-relaxed"
              style={{ color: '#94a3b8' }}
            >
              ChatGPT, Perplexity, and Gemini are recommending your competitors
              right now. Find out why — and fix it in minutes.
            </p>
            <ConnectButton
              label="Connect My Shopify Store →"
              className="inline-flex items-center gap-2 font-medium text-[16px] px-6 py-3 transition-all hover:scale-[1.02] hover:brightness-110"
              style={{
                background: '#00D4FF',
                color: '#0A0A0B',
                borderRadius: 6,
                height: 48,
                border: 'none',
                cursor: 'pointer',
              }}
            />
            <p className="text-[12px] mt-3" style={{ color: '#64748B' }}>
              Free 14-day trial. No credit card. Connects in 60 seconds.
            </p>
          </div>

          {/* Right — live score card */}
          <div
            className="md:col-span-2 rounded-[8px] p-6"
            style={{
              background: '#111113',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <p className="text-[11px] font-mono uppercase tracking-widest mb-1" style={{ color: '#64748B' }}>
              LIVE SCAN
            </p>
            <p className="text-white font-medium mb-5 text-[14px]">Oakwood Leather Co.</p>

            {[
              { name: 'ChatGPT', score: 8, color: '#00D4FF', label: '↓ invisible' },
              { name: 'Perplexity', score: 21, color: '#A78BFA', label: '↑ improving' },
              { name: 'Gemini', score: 5, color: '#F59E0B', label: '↓ critical' },
            ].map((p) => (
              <div key={p.name} className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: p.color,
                        boxShadow: p.name === 'ChatGPT' && pulse ? `0 0 6px ${p.color}` : 'none',
                      }}
                    />
                    <span className="text-[13px] text-white">{p.name}</span>
                  </div>
                  <span className="font-mono text-[13px]" style={{ color: p.color }}>
                    {p.score}%
                  </span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 6, background: '#1a1a1f' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p.score}%`,
                      background: `linear-gradient(90deg, ${p.color}44, ${p.color})`,
                    }}
                  />
                </div>
                <p className="text-[11px] mt-1" style={{ color: '#64748B' }}>
                  {p.label}
                </p>
              </div>
            ))}

            <div
              className="mt-5 pt-4 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span className="text-[13px]" style={{ color: '#F59E0B' }}>
                3 competitors cited above you
              </span>
              <span className="text-[13px]" style={{ color: '#00D4FF' }}>
                14 fixes available
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* The problem */}
      <section id="features" className="py-24 px-8" style={{ background: '#0A0A0B' }}>
        <div className="max-w-7xl mx-auto">
          <h2
            className="font-semibold mb-12 text-center"
            style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}
          >
            While you weren't looking...
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                platform: 'ChatGPT',
                color: '#00D4FF',
                query: 'Best leather wallet brands under $100?',
                results: ['Bellroy', 'Fossil', 'Herschel Supply Co.', 'MVMT'],
              },
              {
                platform: 'Perplexity',
                color: '#A78BFA',
                query: 'Handmade leather wallet recommendations?',
                results: ['Bellroy', 'Travelsmith', 'Saddleback Leather', 'Fossil'],
              },
              {
                platform: 'Google Gemini',
                color: '#F59E0B',
                query: 'Best leather accessories brands 2026?',
                results: ['Coach', 'Bellroy', 'Fossil', 'Herschel Supply Co.'],
              },
            ].map((card) => (
              <div
                key={card.platform}
                className="rounded-[8px] overflow-hidden"
                style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div
                  className="px-4 py-3 flex items-center gap-2 text-[12px] font-medium"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    color: card.color,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: card.color }} />
                  {card.platform}
                </div>
                <div className="p-4">
                  <div
                    className="rounded-[6px] p-3 mb-3 text-[13px]"
                    style={{ background: '#1a1a1f', color: '#94a3b8' }}
                  >
                    "{card.query}"
                  </div>
                  {card.results.map((r) => (
                    <div
                      key={r}
                      className="flex items-center gap-2 py-1.5 text-[13px] text-white"
                    >
                      <span style={{ color: '#00D4FF' }}>✓</span> {r}
                    </div>
                  ))}
                  <div
                    className="flex items-center gap-2 py-1.5 mt-2 rounded px-2"
                    style={{ background: '#1a0000', color: '#64748B', fontSize: 13 }}
                  >
                    <span style={{ color: '#EF4444' }}>✗</span>
                    <span className="line-through">Oakwood Leather Co.</span>
                    <span
                      className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: '#EF444422', color: '#EF4444' }}
                    >
                      Not mentioned
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-8" style={{ background: '#0D0D0F' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center font-semibold mb-16" style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}>
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {[
              {
                num: '01',
                title: 'Connect your store',
                desc: 'One-click Shopify OAuth. No manual setup. Takes 60 seconds.',
              },
              {
                num: '02',
                title: 'We scan all AI platforms',
                desc: 'Daily monitoring across ChatGPT, Perplexity, and Gemini. We run hundreds of buyer queries to find where you appear.',
              },
              {
                num: '03',
                title: 'Fix with one click',
                desc: 'AI-generated fixes, reviewed by you, applied directly to your Shopify store.',
              },
            ].map((step, i) => (
              <div key={step.num} className="relative">
                {i < 2 && (
                  <div
                    className="hidden md:block absolute top-5 left-full w-full h-px"
                    style={{ background: 'linear-gradient(90deg, #00D4FF44, transparent)' }}
                  />
                )}
                <p className="font-mono font-bold text-[28px] mb-3" style={{ color: '#00D4FF' }}>
                  {step.num}
                </p>
                <p className="font-medium text-white text-[16px] mb-2">{step.title}</p>
                <p className="text-[14px]" style={{ color: '#64748B' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics strip */}
      <section className="py-16 px-8" style={{ background: '#111113', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '527%', label: 'AI referral traffic growth YoY' },
            { value: '14.2%', label: 'AI visitor conversion rate vs 2.8% Google' },
            { value: '3', label: 'AI platforms monitored daily' },
            { value: '< 60s', label: 'Time to connect your store' },
          ].map((m) => (
            <div key={m.value} className="text-center">
              <p className="font-mono font-bold text-[36px] text-white mb-2">{m.value}</p>
              <p className="text-[13px]" style={{ color: '#64748B' }}>{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-8" style={{ background: '#0A0A0B' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center font-semibold mb-12" style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}>
            Simple, transparent pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className="rounded-[8px] p-6 relative"
                style={{
                  background: '#111113',
                  border: plan.popular ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {plan.popular && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] px-3 py-0.5 font-medium rounded-full"
                    style={{ background: '#00D4FF', color: '#0A0A0B' }}
                  >
                    Most popular
                  </span>
                )}
                <p className="font-medium text-white text-[16px] mb-1">{plan.name}</p>
                <p className="font-mono font-bold text-[36px] text-white mb-6">
                  ${plan.price}
                  <span className="text-[14px] font-normal text-[#64748B]">/mo</span>
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[14px] text-[#94a3b8]">
                      <Check size={14} style={{ color: '#00D4FF', marginTop: 2, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <ConnectButton
                  label="Get started"
                  className="block w-full text-center py-2 text-[14px] font-medium rounded transition-all hover:opacity-90"
                  style={{
                    background: plan.popular ? '#00D4FF' : 'transparent',
                    color: plan.popular ? '#0A0A0B' : '#00D4FF',
                    border: plan.popular ? 'none' : '1px solid #00D4FF',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-10 px-8 flex flex-col md:flex-row items-center justify-between gap-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="flex items-baseline gap-0">
          <span className="font-bold font-mono text-[16px]" style={{ color: '#00D4FF' }}>GEO</span>
          <span className="text-[14px]" style={{ color: '#64748B' }}>.visibility</span>
        </span>
        <p className="text-[13px]" style={{ color: '#64748B' }}>
          GeoVisibility — AI search analytics for Shopify merchants
        </p>
        <div className="flex gap-6 text-[13px]" style={{ color: '#64748B' }}>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
}
