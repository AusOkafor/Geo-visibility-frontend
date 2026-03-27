import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useVisibilityScores, useDailyScores } from '../../hooks/useApi';
import { formatDate } from '../../lib/utils';

type Range = '7d' | '30d' | '90d';
const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };
type Platform = 'chatgpt' | 'perplexity' | 'gemini';
const PLATFORM_COLORS: Record<Platform, string> = {
  chatgpt: '#00D4FF',
  perplexity: '#A78BFA',
  gemini: '#F59E0B',
};

const MOCK_DAILY_DATA = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2026-02-25');
  d.setDate(d.getDate() + i);
  return {
    date: d.toISOString().slice(0, 10),
    chatgpt: Math.max(1, 8 + Math.round((Math.random() - 0.5) * 6)),
    perplexity: Math.max(1, 21 + Math.round((Math.random() - 0.5) * 8) + Math.floor(i / 5)),
    gemini: Math.max(1, 5 + Math.round((Math.random() - 0.5) * 4)),
  };
});

const QUERY_BREAKDOWN = [
  { query: 'Best [category] under $100', chatgpt: 4, perplexity: 12, gemini: 3, avg: 6, trend: '↓' },
  { query: 'Top [category] brands 2026', chatgpt: 11, perplexity: 28, gemini: 9, avg: 16, trend: '↑' },
  { query: 'Handmade [category] recommendations', chatgpt: 6, perplexity: 18, gemini: 4, avg: 9, trend: '→' },
  { query: '[Brand] reviews', chatgpt: 15, perplexity: 35, gemini: 12, avg: 21, trend: '↑' },
  { query: 'Where to buy [category] online', chatgpt: 3, perplexity: 8, gemini: 2, avg: 4, trend: '↓' },
];

const DIST_BUCKETS = [
  { label: '0–10%', count: 3 },
  { label: '11–25%', count: 1 },
  { label: '26–50%', count: 0 },
  { label: '51–75%', count: 0 },
  { label: '76–100%', count: 0 },
];

function scoreColor(v: number) {
  if (v > 15) return '#00D4FF';
  if (v < 5) return '#64748B';
  return '#ffffff';
}

function trendColor(t: string) {
  if (t === '↑') return '#00D4FF';
  if (t === '↓') return '#EF4444';
  return '#64748B';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[6px] p-3 text-[12px]" style={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[#94a3b8] mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white capitalize">{p.name}</span>
          <span className="ml-2 font-mono text-white">{p.value}%</span>
        </p>
      ))}
    </div>
  );
};

export function VisibilityPage() {
  const [range, setRange] = useState<Range>('30d');
  const [distPlatform, setDistPlatform] = useState<Platform>('chatgpt');
  const days = RANGE_DAYS[range];

  const { data: scores, isLoading: scoresLoading } = useVisibilityScores(days);
  const { data: daily, isLoading: dailyLoading } = useDailyScores(days);

  const chartData = daily?.length ? daily : MOCK_DAILY_DATA;

  return (
    <div className="pb-20 md:pb-0">
      <PageHeader
        title="AI Visibility Scores"
        subtitle="How often your store appears when buyers ask AI for recommendations"
        action={
          <div
            className="flex rounded-[6px] overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {(['7d', '30d', '90d'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3 py-1.5 text-[12px] font-mono transition-colors"
                style={{
                  background: range === r ? '#00D4FF' : 'transparent',
                  color: range === r ? '#0A0A0B' : '#64748B',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {/* Platform score cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {scoresLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-[6px] p-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
                <LoadingSkeleton height="12px" className="mb-3 w-24" />
                <LoadingSkeleton height="40px" className="w-20 mb-3" />
                <LoadingSkeleton height="60px" />
              </div>
            ))
          : (['chatgpt', 'perplexity', 'gemini'] as Platform[]).map((platform) => {
              const s = scores?.find((sc) => sc.platform === platform);
              const score = s?.score ?? (platform === 'chatgpt' ? 8 : platform === 'perplexity' ? 21 : 5);
              const hit = s?.queries_hit ?? (platform === 'perplexity' ? 21 : platform === 'chatgpt' ? 8 : 5);
              const run = s?.queries_run ?? 100;
              const color = PLATFORM_COLORS[platform];
              return (
                <div
                  key={platform}
                  className="rounded-[6px] p-5"
                  style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-[13px] font-medium capitalize" style={{ color: '#94a3b8' }}>
                      {platform === 'chatgpt' ? 'ChatGPT' : platform === 'perplexity' ? 'Perplexity' : 'Gemini'}
                    </span>
                  </div>
                  <p className="font-mono font-bold text-[40px] text-white leading-none mb-2">
                    {score}%
                  </p>
                  <p className="text-[12px] mb-3" style={{ color: '#64748B' }}>
                    Cited in {hit} of {run} daily queries
                  </p>
                  <div className="rounded-full overflow-hidden mb-2" style={{ height: 4, background: '#1a1a1f' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}44, ${color})` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: '#00D4FF' }}>
                      ↑ 4% vs last {range}
                    </span>
                    <span className="text-[11px]" style={{ color: '#64748B' }}>
                      Industry avg: 18%
                    </span>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Combined trend chart */}
      <div
        className="rounded-[6px] p-5 mb-6"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <p className="font-medium text-white text-[15px] mb-4">
          Visibility over time — {range}
        </p>
        {dailyLoading ? (
          <LoadingSkeleton height="260px" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={(d, i) => (i % 5 === 0 ? formatDate(d) : '')} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="chatgpt" name="ChatGPT" stroke="#00D4FF" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="perplexity" name="Perplexity" stroke="#A78BFA" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="gemini" name="Gemini" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Query breakdown table */}
      <div
        className="rounded-[6px] overflow-hidden mb-6"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-medium text-white text-[15px]">Query-level breakdown</p>
          <p className="text-[13px] mt-0.5" style={{ color: '#64748B' }}>
            Which question types you're winning and losing
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Query Type', 'ChatGPT', 'Perplexity', 'Gemini', 'Avg', 'Trend'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 font-normal text-[11px] uppercase tracking-wider"
                    style={{ color: '#64748B' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {QUERY_BREAKDOWN.map((row, i) => (
                <tr
                  key={i}
                  className="transition-colors hover:bg-white/[0.02]"
                  style={{
                    height: 48,
                    background: i % 2 === 1 ? '#0d0d10' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}
                >
                  <td className="px-5 text-[#94a3b8]">{row.query}</td>
                  <td className="px-5 font-mono" style={{ color: scoreColor(row.chatgpt) }}>{row.chatgpt}%</td>
                  <td className="px-5 font-mono" style={{ color: scoreColor(row.perplexity) }}>{row.perplexity}%</td>
                  <td className="px-5 font-mono" style={{ color: scoreColor(row.gemini) }}>{row.gemini}%</td>
                  <td className="px-5 font-mono text-white">{row.avg}%</td>
                  <td className="px-5 font-mono" style={{ color: trendColor(row.trend) }}>{row.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Distribution */}
      <div
        className="rounded-[6px] p-5"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-medium text-white text-[15px]">
            Score distribution — {distPlatform === 'chatgpt' ? 'ChatGPT' : distPlatform === 'perplexity' ? 'Perplexity' : 'Gemini'}
          </p>
          <div
            className="flex rounded-[6px] overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {(['chatgpt', 'perplexity', 'gemini'] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setDistPlatform(p)}
                className="px-3 py-1 text-[11px] capitalize transition-colors"
                style={{
                  background: distPlatform === p ? PLATFORM_COLORS[p] + '33' : 'transparent',
                  color: distPlatform === p ? PLATFORM_COLORS[p] : '#64748B',
                  borderRight: p !== 'gemini' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}
              >
                {p === 'chatgpt' ? 'ChatGPT' : p === 'perplexity' ? 'Perplexity' : 'Gemini'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={DIST_BUCKETS} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}
              labelStyle={{ color: '#94a3b8', fontSize: 12 }}
              itemStyle={{ color: PLATFORM_COLORS[distPlatform], fontSize: 12 }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {DIST_BUCKETS.map((_, i) => (
                <Cell key={i} fill={PLATFORM_COLORS[distPlatform]} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div
          className="mt-4 p-3 rounded-[6px] text-[13px]"
          style={{ borderLeft: '2px solid #00D4FF', background: '#001a2266', color: '#94a3b8' }}
        >
          Most of your queries score below 10% — focus on the 'description' fix to move into the 11–25% bucket.
        </div>
      </div>
    </div>
  );
}
