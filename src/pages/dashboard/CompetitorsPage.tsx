import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { PlatformBadge } from '../../components/ui/PlatformBadge';
import { ChevronDown, ChevronUp } from 'lucide-react';

type Platform = 'chatgpt' | 'perplexity' | 'gemini';

const COMPETITORS = [
  {
    name: 'Bellroy',
    platforms: ['chatgpt', 'perplexity', 'gemini'],
    position: '1st',
    frequency: 89,
    vsDiff: '+72 citations',
    trend: '↑ gaining',
    trendUp: true,
    queries: ['Best leather wallets under $100', 'Top wallet brands 2026', 'Minimalist wallets for men'],
    insights: [
      '884-word product descriptions (yours avg 210)',
      'Active on Wirecutter, GQ, and 4 niche directories',
      '94 Google reviews with specific product keywords',
    ],
  },
  {
    name: 'Fossil',
    platforms: ['chatgpt', 'gemini'],
    position: '2nd',
    frequency: 54,
    vsDiff: '+37 citations',
    trend: '→ stable',
    trendUp: null,
    queries: ['Leather accessories under $150', 'Best gift wallets 2026'],
    insights: [
      'Complete brand presence on Google Shopping',
      'Regular editorial coverage in men\'s lifestyle press',
      'Strong FAQ content on all product pages',
    ],
  },
  {
    name: 'Herschel',
    platforms: ['perplexity'],
    position: '3rd',
    frequency: 31,
    vsDiff: '+14 citations',
    trend: '↓ losing',
    trendUp: false,
    queries: ['Handmade leather wallet recommendations'],
    insights: [
      'Strong on Perplexity via niche blog citations',
      'Product schema markup on all pages',
      'Detailed material specifications listed prominently',
    ],
  },
  {
    name: 'Travelsmith',
    platforms: ['chatgpt'],
    position: '2nd',
    frequency: 28,
    vsDiff: '+11 citations',
    trend: '↑ gaining',
    trendUp: true,
    queries: ['Travel accessories leather', 'Durable leather wallets'],
    insights: [
      'Long-form travel-focused product descriptions',
      'Featured in travel gear review roundups',
      'High review count with keyword-rich content',
    ],
  },
  {
    name: 'MVMT',
    platforms: ['perplexity', 'gemini'],
    position: '1st',
    frequency: 22,
    vsDiff: '+5 citations',
    trend: '→ stable',
    trendUp: null,
    queries: ['Modern leather accessories brands'],
    insights: [
      'Well-structured product catalog with rich metadata',
      'Strong social proof with featured reviews',
      'Active on multiple lifestyle directories',
    ],
  },
];

const PLATFORM_DATA: Record<Platform, { name: string; value: number }[]> = {
  chatgpt: [
    { name: 'Bellroy', value: 89 },
    { name: 'Fossil', value: 54 },
    { name: 'Travelsmith', value: 28 },
    { name: 'You', value: 17 },
  ],
  perplexity: [
    { name: 'Bellroy', value: 72 },
    { name: 'Herschel', value: 31 },
    { name: 'MVMT', value: 22 },
    { name: 'You', value: 17 },
  ],
  gemini: [
    { name: 'Bellroy', value: 60 },
    { name: 'Fossil', value: 40 },
    { name: 'MVMT', value: 18 },
    { name: 'You', value: 5 },
  ],
};

export function CompetitorsPage() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Platform>('chatgpt');

  return (
    <div className="pb-20 md:pb-0">
      <PageHeader
        title="Competitors dominating AI results"
        subtitle="Brands that appear when buyers ask for your products — but you don't"
      />

      {/* Stat strip */}
      <div
        className="flex items-center gap-0 mb-6 text-[13px] rounded-[6px] px-5 py-3 overflow-x-auto"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-white whitespace-nowrap">
          <span className="font-mono font-bold">14</span>{' '}
          <span style={{ color: '#64748B' }}>competitors detected</span>
        </span>
        <span className="mx-4" style={{ color: '#334155' }}>|</span>
        <span className="whitespace-nowrap">
          <span className="font-mono font-bold text-white">Bellroy</span>{' '}
          <span style={{ color: '#64748B' }}>appears 3× more often</span>
        </span>
        <span className="mx-4" style={{ color: '#334155' }}>|</span>
        <span className="whitespace-nowrap" style={{ color: '#64748B' }}>
          You rank below all of them
        </span>
      </div>

      {/* Competitor table */}
      <div
        className="rounded-[6px] overflow-hidden mb-6"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Header */}
        <div
          className="grid text-[11px] uppercase tracking-wider px-5 py-3"
          style={{
            color: '#64748B',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            gridTemplateColumns: '2fr 2fr 80px 130px 140px 100px 32px',
          }}
        >
          <span>Competitor</span>
          <span>Platforms</span>
          <span>Position</span>
          <span>Frequency</span>
          <span>vs. You</span>
          <span>Trend</span>
          <span />
        </div>

        {COMPETITORS.map((comp, i) => (
          <div key={comp.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <button
              className="w-full text-left transition-colors hover:bg-white/[0.02]"
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            >
              <div
                className="grid items-center px-5"
                style={{
                  height: 56,
                  gridTemplateColumns: '2fr 2fr 80px 130px 140px 100px 32px',
                }}
              >
                <span className="font-medium text-white text-[13px]">{comp.name}</span>
                <span className="flex gap-2 flex-wrap">
                  {comp.platforms.map((p) => (
                    <PlatformBadge key={p} platform={p as Platform} />
                  ))}
                </span>
                <span className="font-mono text-[13px] text-white">{comp.position}</span>
                <span className="text-[13px] text-white">{comp.frequency} times this week</span>
                <span className="text-[13px] font-mono" style={{ color: '#EF4444' }}>
                  {comp.vsDiff} vs. you
                </span>
                <span
                  className="text-[12px]"
                  style={{
                    color: comp.trendUp === true ? '#00D4FF' : comp.trendUp === false ? '#EF4444' : '#64748B',
                  }}
                >
                  {comp.trend}
                </span>
                {expandedIdx === i ? (
                  <ChevronUp size={14} style={{ color: '#64748B' }} />
                ) : (
                  <ChevronDown size={14} style={{ color: '#64748B' }} />
                )}
              </div>
            </button>

            {/* Accordion expand */}
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: expandedIdx === i ? 300 : 0,
                opacity: expandedIdx === i ? 1 : 0,
              }}
            >
              <div
                className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5"
                style={{
                  background: '#0d0d10',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                    Queries they win
                  </p>
                  <ul className="space-y-1">
                    {comp.queries.map((q) => (
                      <li key={q} className="text-[13px] text-white flex items-start gap-1.5">
                        <span style={{ color: '#EF4444' }}>✗</span> {q}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                    What they do differently
                  </p>
                  <ul className="space-y-1.5">
                    {comp.insights.map((ins) => (
                      <li key={ins} className="text-[13px]" style={{ color: '#94a3b8' }}>
                        • {ins}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                    Recommendation
                  </p>
                  <p className="text-[13px] mb-3" style={{ color: '#94a3b8' }}>
                    Add an FAQ page + expand descriptions to close this gap
                  </p>
                  <Link
                    to="/dashboard/fixes"
                    className="text-[13px]"
                    style={{ color: '#00D4FF' }}
                  >
                    See relevant fixes →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Your row */}
        <div
          className="grid items-center px-5"
          style={{
            height: 56,
            gridTemplateColumns: '2fr 2fr 80px 130px 140px 100px 32px',
            background: 'rgba(0,212,255,0.03)',
            borderTop: '1px solid rgba(0,212,255,0.1)',
          }}
        >
          <span className="font-medium text-[13px]" style={{ color: '#00D4FF' }}>
            Oakwood Leather Co. (You)
          </span>
          <span className="flex gap-2">
            {(['chatgpt', 'perplexity', 'gemini'] as Platform[]).map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
          </span>
          <span className="font-mono text-[13px]" style={{ color: '#64748B' }}>Rarely</span>
          <span className="text-[13px]" style={{ color: '#64748B' }}>17 times this week</span>
          <span className="text-[13px]" style={{ color: '#64748B' }}>—</span>
          <span className="text-[12px]" style={{ color: '#00D4FF' }}>↑ improving (with fixes)</span>
          <span />
        </div>
      </div>

      {/* Platform breakdown tabs */}
      <div
        className="rounded-[6px] p-5"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-0 mb-5">
          {(['chatgpt', 'perplexity', 'gemini'] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className="px-4 py-1.5 text-[13px] capitalize transition-colors"
              style={{
                borderBottom: activeTab === p ? `2px solid #00D4FF` : '2px solid transparent',
                color: activeTab === p ? '#ffffff' : '#64748B',
                marginBottom: -1,
              }}
            >
              {p === 'chatgpt' ? 'ChatGPT' : p === 'perplexity' ? 'Perplexity' : 'Gemini'}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={PLATFORM_DATA[activeTab]} margin={{ top: 4, right: 16, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}
              labelStyle={{ color: '#94a3b8', fontSize: 12 }}
              itemStyle={{ color: '#ffffff', fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {PLATFORM_DATA[activeTab].map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.name === 'You' ? '#00D4FF' : '#64748B'}
                  fillOpacity={entry.name === 'You' ? 0.9 : 0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
