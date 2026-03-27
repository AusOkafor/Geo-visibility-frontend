import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

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

export function LandingPage() {
  const scrolled = useScrolled();
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ background: '#0A0A0B', color: '#ffffff', fontFamily: 'DM Sans, sans-serif' }}>
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
        <Link
          to="/dashboard"
          className="text-[13px] font-medium px-4 py-1.5 rounded transition-all hover:bg-[#00D4FF22]"
          style={{
            border: '1px solid #00D4FF',
            color: '#00D4FF',
            borderRadius: 6,
          }}
        >
          Connect Store
        </Link>
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
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 font-medium text-[16px] px-6 py-3 transition-all hover:scale-[1.02] hover:brightness-110"
              style={{
                background: '#00D4FF',
                color: '#0A0A0B',
                borderRadius: 6,
                height: 48,
              }}
            >
              Connect My Shopify Store →
            </Link>
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
                <Link
                  to="/dashboard"
                  className="block text-center py-2 text-[14px] font-medium rounded transition-all hover:opacity-90"
                  style={{
                    background: plan.popular ? '#00D4FF' : 'transparent',
                    color: plan.popular ? '#0A0A0B' : '#00D4FF',
                    border: plan.popular ? 'none' : '1px solid #00D4FF',
                    borderRadius: 6,
                  }}
                >
                  Get started
                </Link>
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
