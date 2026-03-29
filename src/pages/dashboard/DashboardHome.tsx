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
  useQueryGaps,
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

interface InsightVerdict {
  type: 'warning' | 'positive' | 'neutral';
  verdict: string;
  lines: string[];
}

function computeInsight(
  scores: VisibilityScore[] | undefined,
  daily: DailyScore[] | undefined,
  competitors: Competitor[] | undefined,
  pendingFixes: Fix[],
  gapCount: number
): InsightVerdict | null {
  if (!scores || scores.length === 0) return null;
  const avg = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
  const topComp = competitors?.[0];
  const highFixes = pendingFixes.filter((f) => f.priority === 'high').length;
  const topNames = competitors?.slice(0, 2).map((c) => c.name).join(' and ') ?? '';

  let weekDelta: number | undefined;
  if (daily && daily.length >= 2) {
    const last = daily[daily.length - 1];
    const prev = daily[Math.max(0, daily.length - 8)];
    weekDelta = Math.round(
      ((last.chatgpt + last.perplexity + last.gemini) - (prev.chatgpt + prev.perplexity + prev.gemini)) / 3
    );
  }

  // Competitor multiplier
  let multiplierLine = '';
  if (topComp && topComp.total_scans > 0 && avg > 0) {
    const compPct = Math.round((topComp.total_frequency / topComp.total_scans) * 100);
    const mult = (compPct / avg).toFixed(1);
    if (parseFloat(mult) > 1.2) {
      multiplierLine = `Competitors are cited ${mult}× more than you`;
    }
  }

  const gapLine = gapCount > 0 ? `You're invisible in ${gapCount} high-intent quer${gapCount === 1 ? 'y' : 'ies'}` : '';
  const fixLine = highFixes > 0 ? `Fixing ${highFixes} issue${highFixes > 1 ? 's' : ''} could increase visibility by ~${Math.min(highFixes * 8, 35)}%` : '';

  if (weekDelta !== undefined && weekDelta <= -5) {
    return {
      type: 'warning',
      verdict: 'Visibility is dropping — act now',
      lines: [
        `Down ${Math.abs(weekDelta)} points this week${topNames ? ` — ${topNames} are gaining ground` : ''}`,
        multiplierLine,
        fixLine,
      ].filter(Boolean),
    };
  }

  if (avg < 20) {
    return {
      type: 'warning',
      verdict: "You're losing visibility in AI search",
      lines: [
        topNames ? `${topNames} are being recommended instead of you` : 'Competitors are consistently cited over you',
        multiplierLine,
        gapLine,
        fixLine,
      ].filter(Boolean),
    };
  }

  if (weekDelta !== undefined && weekDelta >= 5) {
    return {
      type: 'positive',
      verdict: `Visibility up ${weekDelta} points — keep the momentum`,
      lines: [
        'Your recent changes are working across AI platforms',
        fixLine || 'Continue applying fixes to maintain your edge',
      ].filter(Boolean),
    };
  }

  return {
    type: 'neutral',
    verdict: avg >= 50 ? 'Solid presence — room to grow' : 'Moderate visibility — competitors have the edge',
    lines: [
      topComp ? `${topComp.name} still outranks you in most queries` : '',
      multiplierLine,
      fixLine || "You're holding steady — run a scan to find new opportunities",
    ].filter(Boolean),
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

// ─── mock data shown before first scan ───────────────────────────────────────
// Gives the chart a meaningful shape instead of an empty box.
const MOCK_DAILY: DailyScore[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2026-02-28');
  d.setDate(d.getDate() + i);
  return {
    date: d.toISOString().slice(0, 10),
    chatgpt: Math.max(0, 5 + Math.round((Math.random() - 0.5) * 8)),
    perplexity: Math.max(0, 18 + Math.round((Math.random() - 0.5) * 10) + Math.floor(i / 6)),
    gemini: Math.max(0, 4 + Math.round((Math.random() - 0.5) * 6)),
  };
});

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
  const { data: queryGaps, isLoading: gapsLoading } = useQueryGaps();
  const triggerScan = useTriggerScan();

  const chatgpt = scores?.find((s) => s.platform === 'chatgpt');
  const perplexity = scores?.find((s) => s.platform === 'perplexity');
  const gemini = scores?.find((s) => s.platform === 'gemini');
  const isMockChart = !daily?.length;
  const chartData: DailyScore[] = daily?.length ? daily : MOCK_DAILY;
  const pendingFixes = fixes ?? [];
  const compList = competitors ?? [];
  const dailyArr = daily ?? [];
  const cgDelta = getPlatformDelta(dailyArr, 'chatgpt');
  const pxDelta = getPlatformDelta(dailyArr, 'perplexity');
  const gmDelta = getPlatformDelta(dailyArr, 'gemini');
  const gapList = queryGaps ?? [];
  const insight = computeInsight(scores, daily, competitors, pendingFixes, gapList.length);

  // Per-platform sub-labels for metric cards
  const platformSubLabel = (score: number | undefined, platformName: string): string | undefined => {
    if (score === undefined) return undefined;
    if (score === 0) return `Not being recommended on ${platformName}`;
    const topComp = compList[0];
    if (score < 20 && topComp && topComp.total_scans > 0) {
      const compPct = Math.round((topComp.total_frequency / topComp.total_scans) * 100);
      if (compPct > score * 1.5) {
        const mult = (compPct / Math.max(score, 1)).toFixed(1);
        return `Competitors cited ${mult}× more often`;
      }
    }
    if (score < 40) return 'Weak presence — apply fixes to improve';
    if (score >= 75) return 'Strong AI presence';
    return undefined;
  };

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
            qc.invalidateQueries({ queryKey: ['query-gaps'] }),
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

      {/* Insight verdict banner */}
      {insight && !scoresLoading && !scanActive && (
        <div
          className="rounded-[6px] px-4 py-4 mb-6"
          style={{
            background: insight.type === 'warning' ? 'rgba(239,68,68,0.06)' : insight.type === 'positive' ? 'rgba(0,212,255,0.06)' : '#111113',
            border: `1px solid ${insight.type === 'warning' ? 'rgba(239,68,68,0.2)' : insight.type === 'positive' ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
            borderLeftWidth: 3,
            borderLeftColor: insight.type === 'warning' ? '#EF4444' : insight.type === 'positive' ? '#00D4FF' : '#334155',
          }}
        >
          <p className="text-[14px] font-semibold text-white mb-2">
            {insight.type === 'warning' ? '❌ ' : insight.type === 'positive' ? '↑ ' : '· '}
            {insight.verdict}
          </p>
          <ul className="space-y-1">
            {insight.lines.map((line, i) => (
              <li key={i} className="text-[12px] flex items-start gap-2" style={{ color: '#94a3b8' }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: insight.type === 'warning' ? '#EF4444' : insight.type === 'positive' ? '#00D4FF' : '#334155' }}>→</span>
                {line}
              </li>
            ))}
          </ul>
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
            <MetricCard label="ChatGPT Visibility" value={chatgpt?.score ?? 0} suffix="%" trend={cgDelta} status={chatgpt ? scoreStatus(chatgpt.score) : undefined} subLabel={platformSubLabel(chatgpt?.score, 'ChatGPT')} sourceTag={sourceTag('chatgpt')} />
            <MetricCard label="Perplexity Visibility" value={perplexity?.score ?? 0} suffix="%" trend={pxDelta} status={perplexity ? scoreStatus(perplexity.score) : undefined} subLabel={platformSubLabel(perplexity?.score, 'Perplexity')} sourceTag={sourceTag('perplexity')} />
            <MetricCard label="Gemini Visibility" value={gemini?.score ?? 0} suffix="%" trend={gmDelta} status={gemini ? scoreStatus(gemini.score) : undefined} subLabel={platformSubLabel(gemini?.score, 'Gemini')} sourceTag={sourceTag('gemini')} />
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
              subLabel={
                pendingFixes.filter((f) => f.priority === 'high').length > 0
                  ? 'Blocking visibility — apply now'
                  : pendingFixes.length > 0
                  ? 'Apply to improve AI citations'
                  : undefined
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
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="cgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="pxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#A78BFA" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="gmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="0" />
                <XAxis dataKey="date" tickFormatter={(d: string, i: number) => (i % 5 === 0 ? formatDate(d) : '')} tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, fontFamily: 'DM Sans' }} iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="chatgpt" name="ChatGPT" stroke="#00D4FF" strokeWidth={2} fill="url(#cgGrad)" dot={false} activeDot={{ r: 4, fill: '#00D4FF' }} />
                <Area type="monotone" dataKey="perplexity" name="Perplexity" stroke="#A78BFA" strokeWidth={2} fill="url(#pxGrad)" dot={false} activeDot={{ r: 4, fill: '#A78BFA' }} />
                <Area type="monotone" dataKey="gemini" name="Gemini" stroke="#F59E0B" strokeWidth={2} fill="url(#gmGrad)" dot={false} activeDot={{ r: 4, fill: '#F59E0B' }} />
              </AreaChart>
            </ResponsiveContainer>
            {/* Overlay when showing placeholder data */}
            {isMockChart && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ background: 'rgba(10,10,11,0.55)', backdropFilter: 'blur(1px)' }}
              >
                <div
                  className="text-center px-5 py-3 rounded-[8px]"
                  style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-white text-[13px] font-medium mb-1">No scan data yet</p>
                  <p className="text-[12px]" style={{ color: '#64748B' }}>Run your first scan to see real visibility trends</p>
                </div>
              </div>
            )}
          </div>
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
            <>
              <div className="space-y-2">
                {pendingFixes.slice(0, 3).map((fix) => (
                  <Link key={fix.id} to={`/dashboard/fixes/${fix.id}`} className="flex items-start gap-3 py-2.5 px-3 rounded-[6px] hover:bg-white/[0.02] transition-colors">
                    <PriorityDot priority={fix.priority} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white font-medium truncate">{fix.title}</p>
                      {fix.explanation && (
                        <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: '#64748B' }}>{fix.explanation}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: '#1a1a1f', color: '#64748B' }}>{fix.fix_type}</span>
                      <span className="font-mono text-[12px]" style={{ color: '#00D4FF' }}>+{fix.est_impact}%</span>
                      <ChevronRight size={14} style={{ color: '#64748B' }} />
                    </div>
                  </Link>
                ))}
              </div>
              {/* Dominant CTA */}
              <Link
                to="/dashboard/fixes"
                className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 rounded-[6px] text-[13px] font-semibold transition-all hover:opacity-90"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}
              >
                🔥 Fix My Visibility ({pendingFixes.filter(f => f.priority === 'high').length} high-impact actions)
              </Link>
            </>
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
            <div className="space-y-3">
              {compList.slice(0, 4).map((comp, i) => {
                const citePct = comp.total_scans > 0 ? Math.round((comp.total_frequency / comp.total_scans) * 100) : 0;
                // why_points[1] is the position insight (most useful for "why winning")
                const whyLine = comp.why_points?.[1] ?? comp.why_points?.[0];
                return (
                  <div key={i} className="py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-3">
                      <span className="w-4 text-[11px] font-mono text-right flex-shrink-0" style={{ color: '#334155' }}>#{i + 1}</span>
                      <span className="flex-1 text-[13px] text-white font-medium">{comp.name}</span>
                      {comp.platforms[0] && <PlatformBadge platform={comp.platforms[0] as any} />}
                      <span className="text-[11px] font-mono flex-shrink-0" style={{ color: '#EF4444' }}>{citePct}%</span>
                    </div>
                    {whyLine && (
                      <p className="text-[11px] ml-7 mt-0.5" style={{ color: '#64748B' }}>{whyLine}</p>
                    )}
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

      {/* Query visibility gaps */}
      {(gapsLoading || (queryGaps && queryGaps.length > 0)) && (
        <div
          className="rounded-[6px] p-5 mt-4"
          style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-1">
              <p className="font-medium text-white text-[15px]">Blind spots — queries where you're invisible</p>
              <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
                Exact AI search queries where you were not mentioned on any platform.
              </p>
            </div>
            {queryGaps && queryGaps.length > 0 && (
              <span
                className="flex-shrink-0 text-[11px] font-mono px-2 py-0.5 rounded"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {queryGaps.length} gap{queryGaps.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Impact estimate */}
          {!gapsLoading && queryGaps && queryGaps.length > 0 && (
            <p className="text-[12px] mb-4 px-3 py-2 rounded-[4px]" style={{ background: 'rgba(239,68,68,0.06)', color: '#fca5a5' }}>
              Fixing top {Math.min(5, queryGaps.length)} blind spots could increase visibility by ~{Math.min(5, queryGaps.length) * 4}%
            </p>
          )}

          {gapsLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} height="36px" />)}</div>
          ) : (() => {
            const highValue = gapList.slice(0, 5);
            const secondary = gapList.slice(5);
            return (
              <div className="space-y-4">
                {/* High-value */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: '#EF4444' }}>
                    🔴 High-value missed queries — fix these first
                  </p>
                  <div className="space-y-1.5">
                    {highValue.map((gap, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 py-2 px-3 rounded-[6px]"
                        style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}
                      >
                        <span className="text-[11px] flex-shrink-0" style={{ color: '#EF4444' }}>✕</span>
                        <span className="flex-1 text-[13px]" style={{ color: '#cbd5e1' }}>{gap.query}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          {gap.platforms.map((p) => (
                            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: '#1a1a1f', color: '#64748B' }}>{p}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Secondary */}
                {secondary.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#64748B' }}>
                      ⚪ Secondary opportunities ({secondary.length})
                    </p>
                    <div className="space-y-1">
                      {secondary.map((gap, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-[6px]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <span className="text-[11px] flex-shrink-0" style={{ color: '#334155' }}>–</span>
                          <span className="flex-1 text-[12px]" style={{ color: '#64748B' }}>{gap.query}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
