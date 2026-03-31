import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useVisibilityScores, useDailyScores, useQueryGaps, useAIReadiness, useLiveAnswers } from '../../hooks/useApi';
import { formatDate } from '../../lib/utils';

type Range = '7d' | '30d' | '90d';
const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };
type Platform = 'chatgpt' | 'perplexity' | 'gemini';
const PLATFORM_COLORS: Record<Platform, string> = {
  chatgpt: '#00D4FF',
  perplexity: '#A78BFA',
  gemini: '#F59E0B',
};


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
  const days = RANGE_DAYS[range];

  const { data: scores, isLoading: scoresLoading } = useVisibilityScores(days);
  const { data: daily, isLoading: dailyLoading } = useDailyScores(days);
  const { data: queryGaps } = useQueryGaps();
  const { data: aiReadiness } = useAIReadiness();
  const { data: liveAnswers } = useLiveAnswers(10);

  const chartData = daily ?? [];
  const isRealChart = (daily?.length ?? 0) >= 2;

  // Calculate per-platform delta: last entry score minus first entry score
  const platformDeltas: Record<Platform, number | null> = {
    chatgpt: null,
    perplexity: null,
    gemini: null,
  };
  if (isRealChart && daily) {
    const first = daily[0];
    const last = daily[daily.length - 1];
    (['chatgpt', 'perplexity', 'gemini'] as Platform[]).forEach((p) => {
      platformDeltas[p] = (last[p] ?? 0) - (first[p] ?? 0);
    });
  }

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
              const score = s?.score ?? null;
              const hit = s?.queries_hit ?? null;
              const run = s?.queries_run ?? null;
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
                    {score !== null ? `${score}%` : '—'}
                  </p>
                  <p className="text-[12px] mb-3" style={{ color: '#64748B' }}>
                    {hit !== null && run !== null ? `Cited in ${hit} of ${run} daily queries` : 'No scan data yet'}
                  </p>
                  <div className="rounded-full overflow-hidden mb-2" style={{ height: 4, background: '#1a1a1f' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: score !== null ? `${score}%` : '0%', background: `linear-gradient(90deg, ${color}44, ${color})` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    {isRealChart && platformDeltas[platform] !== null ? (
                      <span
                        className="text-[11px]"
                        style={{ color: platformDeltas[platform]! >= 0 ? '#00D4FF' : '#EF4444' }}
                      >
                        {platformDeltas[platform]! >= 0 ? '↑' : '↓'} {Math.abs(platformDeltas[platform]!)}% vs {range} ago
                      </span>
                    ) : (
                      <span className="text-[11px]" style={{ color: '#64748B' }}>First scan</span>
                    )}
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
        <div className="flex items-center justify-between mb-4">
          <p className="font-medium text-white text-[15px]">
            Visibility over time — {range}
          </p>
          {!isRealChart && !dailyLoading && (
            <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}>
              preview — run more scans to build history
            </span>
          )}
        </div>
        {dailyLoading ? (
          <LoadingSkeleton height="260px" />
        ) : (
          <div className="relative">
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
            {!isRealChart && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,10,11,0.6)', backdropFilter: 'blur(2px)' }}>
                <p className="text-[13px] text-center px-4" style={{ color: '#64748B' }}>
                  Trend data builds after multiple scans.<br />
                  <span style={{ color: '#475569' }}>Check back after your next scan runs.</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Query gaps */}
      {queryGaps && queryGaps.length > 0 && (
        <div
          className="rounded-[6px] overflow-hidden mb-6"
          style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <p className="font-medium text-white text-[15px]">Query gaps — where you're invisible</p>
              <p className="text-[13px] mt-0.5" style={{ color: '#64748B' }}>Queries where competitors appear but you don't</p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>{queryGaps.length} gaps</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
            {queryGaps.slice(0, 10).map((gap, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.01]">
                <span className="text-[11px] flex-shrink-0" style={{ color: '#EF4444' }}>✕</span>
                <span className="flex-1 text-[13px]" style={{ color: '#94a3b8' }}>{gap.query}</span>
                <div className="flex gap-1.5 items-center flex-shrink-0">
                  {gap.competitor_count !== undefined && gap.competitor_count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>{gap.competitor_count} comp</span>
                  )}
                  {gap.impact && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded capitalize font-medium" style={{ background: gap.impact === 'high' ? 'rgba(239,68,68,0.12)' : gap.impact === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)', color: gap.impact === 'high' ? '#EF4444' : gap.impact === 'medium' ? '#F59E0B' : '#64748B' }}>{gap.impact} impact</span>
                  )}
                  {gap.difficulty && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(255,255,255,0.04)', color: '#64748B' }}>{gap.difficulty} fix</span>
                  )}
                  {(gap.platforms ?? []).map(p => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: '#0d0d10', color: '#475569' }}>{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Readiness — 3-bucket diagnosis */}
      {aiReadiness && (
        <div className="rounded-[6px] p-5 mb-6 mt-6" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="font-medium text-white text-[15px]">Why you're not appearing in AI results</p>
              <p className="text-[13px] mt-0.5" style={{ color: '#64748B' }}>Every invisible brand fails for one of three reasons</p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <p className="font-mono font-bold text-[32px] leading-none" style={{ color: aiReadiness.overall >= 70 ? '#00D4FF' : aiReadiness.overall >= 40 ? '#F59E0B' : '#EF4444' }}>
                {aiReadiness.overall}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>/ 100</p>
            </div>
          </div>
          <div className="space-y-3">
            {(aiReadiness.dimensions ?? []).map((dim) => {
              const pct = Math.round((dim.score / 10) * 100);
              const color = dim.score >= 7 ? '#00D4FF' : dim.score >= 4 ? '#F59E0B' : '#EF4444';
              const icon = dim.score >= 7 ? '✓' : dim.score >= 4 ? '⚠' : '✕';
              return (
                <div key={dim.name} className="rounded-[6px] p-4" style={{ background: dim.score < 4 ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${dim.score < 4 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)'}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold" style={{ color }}>{icon}</span>
                      <span className="text-[13px] font-semibold text-white">{dim.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${color}18`, color }}>{dim.label}</span>
                    </div>
                    <span className="text-[12px] font-mono font-bold" style={{ color }}>{dim.score}/10</span>
                  </div>
                  <div className="rounded-full overflow-hidden mb-2" style={{ height: 3, background: '#1a1a1f' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <p className="text-[12px]" style={{ color: '#94a3b8' }}>{dim.detail}</p>
                </div>
              );
            })}
          </div>
          {aiReadiness.top_action && (
            <div className="mt-4 p-3 rounded-[6px]" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}>
              <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#00D4FF' }}>Fix this first</p>
              <p className="text-[13px]" style={{ color: '#e2e8f0' }}>{aiReadiness.top_action}</p>
            </div>
          )}
        </div>
      )}

      {/* Live AI Answers */}
      {liveAnswers && liveAnswers.length > 0 && (
        <div className="rounded-[6px] p-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-medium text-white text-[15px] mb-1">What AI actually says about your category</p>
          <p className="text-[13px] mb-4" style={{ color: '#64748B' }}>Verbatim answers from recent scans — see how AI frames recommendations</p>
          <div className="space-y-3">
            {liveAnswers.map((answer, i) => (
              <div key={i} className="rounded-[6px] p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: answer.platform === 'chatgpt' ? 'rgba(0,212,255,0.1)' : answer.platform === 'perplexity' ? 'rgba(167,139,250,0.1)' : 'rgba(245,158,11,0.1)', color: answer.platform === 'chatgpt' ? '#00D4FF' : answer.platform === 'perplexity' ? '#A78BFA' : '#F59E0B' }}>{answer.platform}</span>
                  <span className="text-[11px]" style={{ color: '#475569' }}>{answer.query}</span>
                </div>
                <p className="text-[12px] leading-relaxed line-clamp-3" style={{ color: '#94a3b8' }}>{answer.answer_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
