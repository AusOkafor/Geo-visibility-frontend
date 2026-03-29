import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, CheckCircle, Users, ChevronRight, BarChart2, RefreshCw, CheckCircle2 } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { PlatformBadge } from '../../components/ui/PlatformBadge';
import { PriorityDot } from '../../components/ui/PriorityDot';
import {
  useMerchant,
  useVisibilityScores,
  useDailyScores,
  useFixes,
  useCompetitors,
  useTriggerScan,
  usePlatformSources,
} from '../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import type { VisibilityScore, DailyScore, Competitor, Fix } from '../../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function getPlatformDelta(daily: DailyScore[], key: 'chatgpt' | 'perplexity' | 'gemini'): number | undefined {
  if (!daily || daily.length < 2) return undefined;
  const last = daily[daily.length - 1][key];
  const prev = daily[Math.max(0, daily.length - 8)][key];
  return last - prev;
}

function scoreStatus(score: number): { label: string; color: string } {
  if (score < 20) return { label: 'Below average', color: '#EF4444' };
  if (score < 50) return { label: 'Needs work', color: '#F59E0B' };
  if (score < 75) return { label: 'Competitive', color: '#64748B' };
  return { label: 'Strong', color: '#00D4FF' };
}

function computeInsight(
  scores: VisibilityScore[] | undefined,
  daily: DailyScore[] | undefined,
  competitors: Competitor[] | undefined,
  pendingFixes: Fix[]
): { type: 'warning' | 'positive' | 'neutral'; text: string } | null {
  if (!scores || scores.length === 0) return null;
  const avg = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
  const topComp = competitors?.[0];
  const highFixes = pendingFixes.filter((f) => f.priority === 'high').length;

  let weekDelta: number | undefined;
  if (daily && daily.length >= 2) {
    const last = daily[daily.length - 1];
    const prev = daily[Math.max(0, daily.length - 8)];
    weekDelta = Math.round(
      ((last.chatgpt + last.perplexity + last.gemini) - (prev.chatgpt + prev.perplexity + prev.gemini)) / 3
    );
  }

  if (weekDelta !== undefined && weekDelta <= -5) {
    return {
      type: 'warning',
      text: `Visibility dropped ${Math.abs(weekDelta)} points this week${topComp ? ` — ${topComp.name} is gaining ground` : ''}. Check your competitors tab.`,
    };
  }
  if (avg < 20) {
    if (topComp && topComp.total_scans > 0) {
      const compPct = Math.round((topComp.total_frequency / topComp.total_scans) * 100);
      return {
        type: 'warning',
        text: `${topComp.name} appears in ${compPct}% of AI responses — you're at ${avg}%. ${
          highFixes > 0 ? `Apply your ${highFixes} high-priority fix${highFixes > 1 ? 'es' : ''} to close the gap.` : 'Run a scan to generate improvement suggestions.'
        }`,
      };
    }
    return {
      type: 'warning',
      text: `Average visibility is ${avg}% — AI models aren't citing you reliably yet. ${highFixes > 0 ? 'Apply pending fixes to improve.' : ''}`,
    };
  }
  if (weekDelta !== undefined && weekDelta >= 5) {
    return {
      type: 'positive',
      text: `Up ${weekDelta} points this week — your recent changes are working. Keep applying fixes to maintain momentum.`,
    };
  }
  return {
    type: 'neutral',
    text: `Holding at ${avg}% average${topComp ? ` — ${topComp.name} still outranks you` : ''}. ${
      highFixes > 0 ? `${highFixes} fix${highFixes > 1 ? 'es' : ''} ready to apply.` : "You're well-optimized across all platforms."
    }`,
  };
}

// ─── scan progress stages ────────────────────────────────────────────────────

const SCAN_STAGES = [
  { label: 'Queuing scan…',          minMs: 0 },
  { label: 'Scanning ChatGPT…',      minMs: 8000 },
  { label: 'Scanning Perplexity…',   minMs: 35000 },
  { label: 'Scanning Gemini…',       minMs: 65000 },
  { label: 'Aggregating results…',   minMs: 95000 },
];

function useScanProgress(active: boolean) {
  const [stageIdx, setStageIdx] = useState(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { setStageIdx(0); return; }
    startRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      let next = 0;
      for (let i = SCAN_STAGES.length - 1; i >= 0; i--) {
        if (elapsed >= SCAN_STAGES[i].minMs) { next = i; break; }
      }
      setStageIdx(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  return SCAN_STAGES[stageIdx]?.label ?? 'Scanning…';
}

// ─── chart tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[6px] p-3 text-[12px]" style={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[#94a3b8] mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white capitalize">{p.name}</span>
          <span className="ml-auto font-mono text-white">{p.value}%</span>
        </p>
      ))}
    </div>
  );
};

// ─── component ───────────────────────────────────────────────────────────────

export function DashboardHome() {
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem('welcome_dismissed') === 'true'
  );
  const [scanActive, setScanActive] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const scanStageLabel = useScanProgress(scanActive);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qc = useQueryClient();

  const { data: merchant } = useMerchant();
  const { data: scores, isLoading: scoresLoading } = useVisibilityScores(30);
  const { data: daily, isLoading: dailyLoading } = useDailyScores(30);
  const { data: fixes, isLoading: fixesLoading } = useFixes('pending');
  const { data: competitors, isLoading: compLoading } = useCompetitors();
  const { data: platformSources } = usePlatformSources();
  const triggerScan = useTriggerScan();

  const chatgpt = scores?.find((s) => s.platform === 'chatgpt');
  const perplexity = scores?.find((s) => s.platform === 'perplexity');
  const gemini = scores?.find((s) => s.platform === 'gemini');
  const chartData = daily ?? [];
  const pendingFixes = fixes ?? [];
  const compList = competitors ?? [];
  const dailyArr = daily ?? [];
  const cgDelta = getPlatformDelta(dailyArr, 'chatgpt');
  const pxDelta = getPlatformDelta(dailyArr, 'perplexity');
  const gmDelta = getPlatformDelta(dailyArr, 'gemini');
  const insight = computeInsight(scores, daily, competitors, pendingFixes);

  const sourceTag = (platform: string): 'web' | 'simulated' | undefined => {
    if (!platformSources || platformSources.length === 0) return undefined;
    const src = platformSources.find((s) => s.platform === platform);
    return src ? (src.grounded ? 'web' : 'simulated') : undefined;
  };

  // Poll River job status while scan is active; refresh all data when done
  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getScanStatus();
        if (status.state === 'completed' || status.state === 'none') {
          stopPolling();
          setScanActive(false);
          setScanDone(true);
          // Refresh all dashboard data
          await Promise.all([
            qc.invalidateQueries({ queryKey: ['visibility-scores'] }),
            qc.invalidateQueries({ queryKey: ['daily-scores'] }),
            qc.invalidateQueries({ queryKey: ['competitors'] }),
            qc.invalidateQueries({ queryKey: ['fixes'] }),
            qc.invalidateQueries({ queryKey: ['platform-sources'] }),
          ]);
          // Hide the "done" banner after 8s
          setTimeout(() => setScanDone(false), 8000);
        }
      } catch {
        // ignore transient errors
      }
    }, 5000);
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  useEffect(() => () => stopPolling(), []);

  function handleRunScan() {
    triggerScan.mutate(undefined, {
      onSuccess: () => {
        setScanActive(true);
        setScanDone(false);
        // Wait a few seconds for the job to be picked up before polling
        setTimeout(startPolling, 4000);
      },
    });
  }

  function dismissWelcome() {
    localStorage.setItem('welcome_dismissed', 'true');
    setWelcomeDismissed(true);
  }

  return (
    <div className="pb-20 md:pb-0">
      <PageHeader
        title="Dashboard"
        subtitle="AI visibility overview — last 30 days"
        action={
          <button
            onClick={handleRunScan}
            disabled={triggerScan.isPending || scanActive}
            className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-[13px] font-medium transition-all"
            style={{
              background: scanActive ? 'rgba(0,212,255,0.08)' : 'rgba(0,212,255,0.12)',
              border: '1px solid rgba(0,212,255,0.25)',
              color: scanActive ? '#64748B' : '#00D4FF',
              cursor: triggerScan.isPending || scanActive ? 'not-allowed' : 'pointer',
              opacity: triggerScan.isPending || scanActive ? 0.7 : 1,
            }}
          >
            <RefreshCw size={13} className={scanActive ? 'animate-spin' : ''} />
            {triggerScan.isPending ? 'Queuing…' : scanActive ? 'Scanning…' : 'Run Scan'}
          </button>
        }
      />

      {/* Scan progress banner */}
      {scanActive && (
        <div
          className="flex items-center gap-3 rounded-[6px] px-4 py-3 mb-4"
          style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}
        >
          <RefreshCw size={14} className="animate-spin flex-shrink-0" style={{ color: '#00D4FF' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-white font-medium">{scanStageLabel}</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#64748B' }}>
              This takes 2–4 minutes. Results will load automatically when done.
            </p>
          </div>
          {/* Animated progress bar */}
          <div className="w-32 h-1 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-1 rounded-full transition-all duration-1000"
              style={{
                background: '#00D4FF',
                width: `${Math.min(95, (SCAN_STAGES.findIndex(s => s.label === scanStageLabel) / (SCAN_STAGES.length - 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Scan complete banner */}
      {scanDone && !scanActive && (
        <div
          className="flex items-center gap-3 rounded-[6px] px-4 py-3 mb-4"
          style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}
        >
          <CheckCircle2 size={14} style={{ color: '#00D4FF' }} className="flex-shrink-0" />
          <p className="text-[13px] text-white flex-1">
            Scan complete — visibility scores and competitors updated.
          </p>
          <button onClick={() => setScanDone(false)}>
            <X size={14} style={{ color: '#64748B' }} />
          </button>
        </div>
      )}

      {/* Welcome banner */}
      {!welcomeDismissed && !scanActive && !scanDone && (
        <div
          className="flex items-start justify-between rounded-[6px] p-4 mb-4"
          style={{ background: '#111113', border: '1px solid rgba(0,212,255,0.2)', borderLeftWidth: 3, borderLeftColor: '#00D4FF' }}
        >
          <div>
            <p className="font-medium text-white text-[14px] mb-1">
              Welcome to GeoVisibility, {localStorage.getItem('settings_brand_name') || merchant?.brand_name || 'your store'}
            </p>
            <p className="text-[13px]" style={{ color: '#64748B' }}>
              Run your first scan to see how AI models cite your brand.
            </p>
          </div>
          <button onClick={dismissWelcome} className="ml-4 flex-shrink-0">
            <X size={16} style={{ color: '#64748B' }} />
          </button>
        </div>
      )}

      {/* Insight banner */}
      {insight && !scoresLoading && !scanActive && (
        <div
          className="flex items-start gap-3 rounded-[6px] px-4 py-3 mb-6"
          style={{
            background: insight.type === 'warning' ? 'rgba(239,68,68,0.06)' : insight.type === 'positive' ? 'rgba(0,212,255,0.06)' : '#111113',
            border: `1px solid ${insight.type === 'warning' ? 'rgba(239,68,68,0.2)' : insight.type === 'positive' ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
            borderLeftWidth: 3,
            borderLeftColor: insight.type === 'warning' ? '#EF4444' : insight.type === 'positive' ? '#00D4FF' : '#334155',
          }}
        >
          <span className="text-[18px] leading-none mt-0.5 flex-shrink-0">
            {insight.type === 'warning' ? '⚠' : insight.type === 'positive' ? '↑' : '·'}
          </span>
          <p className="text-[13px] leading-relaxed" style={{ color: '#94a3b8' }}>{insight.text}</p>
        </div>
      )}

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {scoresLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[6px] p-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
              <LoadingSkeleton height="12px" className="mb-3 w-20" />
              <LoadingSkeleton height="32px" className="w-16" />
            </div>
          ))
        ) : (
          <>
            <MetricCard label="ChatGPT Visibility" value={chatgpt?.score ?? 0} suffix="%" trend={cgDelta} status={chatgpt ? scoreStatus(chatgpt.score) : undefined} sourceTag={sourceTag('chatgpt')} />
            <MetricCard label="Perplexity Visibility" value={perplexity?.score ?? 0} suffix="%" trend={pxDelta} status={perplexity ? scoreStatus(perplexity.score) : undefined} sourceTag={sourceTag('perplexity')} />
            <MetricCard label="Gemini Visibility" value={gemini?.score ?? 0} suffix="%" trend={gmDelta} status={gemini ? scoreStatus(gemini.score) : undefined} sourceTag={sourceTag('gemini')} />
            <MetricCard
              label="Pending Fixes"
              value={pendingFixes.length}
              status={
                pendingFixes.length === 0
                  ? { label: 'All caught up', color: '#00D4FF' }
                  : pendingFixes.filter((f) => f.priority === 'high').length > 0
                  ? { label: `${pendingFixes.filter((f) => f.priority === 'high').length} high priority`, color: '#EF4444' }
                  : { label: 'Ready to apply', color: '#F59E0B' }
              }
            />
          </>
        )}
      </div>

      {/* Trend chart — AreaChart for more visual weight */}
      <div
        className="rounded-[6px] p-5 mb-6"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="mb-4">
          <p className="font-medium text-white text-[15px]">Visibility trend</p>
          <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
            How often AI cites you vs competitors — last 30 days
          </p>
        </div>
        {dailyLoading ? (
          <LoadingSkeleton height="260px" />
        ) : chartData.length === 0 ? (
          <EmptyState icon={BarChart2} title="Scanning in progress…" description="Chart will appear once your first scan completes." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="cgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="0" />
              <XAxis dataKey="date" tickFormatter={(d, i) => (i % 5 === 0 ? formatDate(d) : '')} tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, fontFamily: 'DM Sans' }} iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="chatgpt" name="ChatGPT" stroke="#00D4FF" strokeWidth={2} fill="url(#cgGrad)" dot={false} activeDot={{ r: 4, fill: '#00D4FF' }} />
              <Area type="monotone" dataKey="perplexity" name="Perplexity" stroke="#A78BFA" strokeWidth={2} fill="url(#pxGrad)" dot={false} activeDot={{ r: 4, fill: '#A78BFA' }} />
              <Area type="monotone" dataKey="gemini" name="Gemini" stroke="#F59E0B" strokeWidth={2} fill="url(#gmGrad)" dot={false} activeDot={{ r: 4, fill: '#F59E0B' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Fixes preview */}
        <div className="rounded-[6px] p-5 flex-[58]" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium text-white text-[15px]">
                {pendingFixes.length > 0 ? 'Gaps competitors are exploiting' : 'Fixes to improve visibility'}
              </p>
              {pendingFixes.length > 0 && (
                <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
                  {pendingFixes.filter((f) => f.priority === 'high').length} critical — apply to stop losing citations
                </p>
              )}
            </div>
            <Link to="/dashboard/fixes" className="text-[13px]" style={{ color: '#00D4FF' }}>View all →</Link>
          </div>
          {fixesLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} height="44px" />)}</div>
          ) : pendingFixes.length === 0 ? (
            <EmptyState icon={CheckCircle} title="All caught up" description="No pending fixes. Your store is well-optimized." />
          ) : (
            <div className="space-y-2">
              {pendingFixes.slice(0, 3).map((fix) => (
                <Link key={fix.id} to={`/dashboard/fixes/${fix.id}`} className="flex items-center gap-3 py-2.5 px-3 rounded-[6px] hover:bg-white/[0.02] transition-colors">
                  <PriorityDot priority={fix.priority} />
                  <span className="flex-1 text-[13px] text-white font-medium truncate">{fix.title}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: '#1a1a1f', color: '#64748B' }}>{fix.fix_type}</span>
                  <span className="font-mono text-[13px] ml-2" style={{ color: '#00D4FF' }}>+{fix.est_impact}%</span>
                  <ChevronRight size={14} style={{ color: '#64748B' }} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Competitors preview */}
        <div className="rounded-[6px] p-5 flex-[42]" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="mb-4">
            <p className="font-medium text-white text-[15px]">
              {compList.length > 0 ? 'Brands stealing your citations' : "Who's being cited instead of you"}
            </p>
            {compList.length > 0 && (
              <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
                {compList.length} competitor{compList.length > 1 ? 's' : ''} outranking you in AI results
              </p>
            )}
          </div>
          {compLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} height="36px" />)}</div>
          ) : compList.length === 0 ? (
            <EmptyState icon={Users} title="Scanning for competitors" description="We'll detect who's beating you in AI results." />
          ) : (
            <div className="space-y-2">
              {compList.slice(0, 5).map((comp, i) => {
                const citePct = comp.total_scans > 0 ? Math.round((comp.total_frequency / comp.total_scans) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="w-4 text-[11px] font-mono text-right flex-shrink-0" style={{ color: '#334155' }}>#{i + 1}</span>
                    <span className="flex-1 text-[13px] text-white">{comp.name}</span>
                    {comp.platforms[0] && <PlatformBadge platform={comp.platforms[0] as any} />}
                    <span className="text-[11px] font-mono flex-shrink-0" style={{ color: '#64748B' }}>{citePct}%</span>
                  </div>
                );
              })}
              <Link to="/dashboard/competitors" className="block text-[12px] mt-3 pt-3 transition-colors hover:opacity-80" style={{ color: '#00D4FF', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                See full breakdown →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
