import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, CheckCircle, Users, RefreshCw, CheckCircle2 } from 'lucide-react';
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
  useBrandRecognition,
  useNextActions,
  useVisibilityPipeline,
  useQuickWins,
  useScanProgress as useScanProgressQuery,
} from '../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import type { DailyScore } from '../../types';

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
  const { data: brandRecognition } = useBrandRecognition();
  const { data: nextActions } = useNextActions();
  const { data: pipeline } = useVisibilityPipeline();
  const { data: quickWins } = useQuickWins();
  const { data: scanProgressData } = useScanProgressQuery();
  const triggerScan = useTriggerScan();

  const chatgpt = scores?.find((s) => s.platform === 'chatgpt');
  const perplexity = scores?.find((s) => s.platform === 'perplexity');
  const gemini = scores?.find((s) => s.platform === 'gemini');
  // isMockChart = true only when there is zero real scan data at all
  const isMockChart = !daily?.length;
  // Blend mock data for past days with real scan data so the chart always
  // has shape. Once there are 7+ real days, switch to real data only.
  const chartData: DailyScore[] = (() => {
    if (!daily?.length) return MOCK_DAILY;
    if (daily.length >= 7) return daily;
    // Prepend mock days that come before the first real scan date
    const firstReal = daily[0].date;
    const mockPrefix = MOCK_DAILY.filter((d) => d.date < firstReal);
    return [...mockPrefix, ...daily];
  })();
  const pendingFixes = fixes ?? [];
  const compList = competitors ?? [];
  const dailyArr = daily ?? [];
  const cgDelta = getPlatformDelta(dailyArr, 'chatgpt');
  const pxDelta = getPlatformDelta(dailyArr, 'perplexity');
  const gmDelta = getPlatformDelta(dailyArr, 'gemini');
  const gapList = queryGaps ?? [];

  // Per-platform sub-labels: raw query counts take priority (humans trust counts more than %)
  const platformSubLabel = (
    score: number | undefined,
    platformName: string,
    queriesHit?: number,
    queriesRun?: number,
  ): string | undefined => {
    if (score === undefined) return undefined;
    if (score === 0) return `Not being recommended on ${platformName}`;
    // Raw count — most useful context when data exists
    if (queriesHit !== undefined && queriesRun) {
      return `${queriesHit} of ${queriesRun} queries`;
    }
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

  // Poll River job status while scan is active; refresh all data when done.
  // Max 84 polls × 5 s = 7 minutes failsafe.
  const pollCountRef = useRef(0);
  const MAX_POLLS = 84;

  async function refreshAllData() {
    // Core visibility data — fetch immediately
    await Promise.all([
      qc.refetchQueries({ queryKey: ['visibility-scores'] }),
      qc.refetchQueries({ queryKey: ['daily-scores'] }),
      qc.refetchQueries({ queryKey: ['competitors'] }),
      qc.refetchQueries({ queryKey: ['platform-sources'] }),
      qc.refetchQueries({ queryKey: ['brand-recognition'] }),
      qc.refetchQueries({ queryKey: ['next-actions'] }),
      qc.refetchQueries({ queryKey: ['visibility-pipeline'] }),
      qc.refetchQueries({ queryKey: ['quick-wins'] }),
      qc.refetchQueries({ queryKey: ['scan-progress'] }),
      qc.refetchQueries({ queryKey: ['live-answers'] }),
      qc.refetchQueries({ queryKey: ['ai-readiness'] }),
    ]);
    // Fix-generation job runs ~45 s after the scan job completes — wait before fetching
    setTimeout(async () => {
      await qc.refetchQueries({ queryKey: ['fixes'] });
      await qc.refetchQueries({ queryKey: ['query-gaps'] });
    }, 50000);
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      const timedOut = pollCountRef.current >= MAX_POLLS;
      try {
        const status = await api.getScanStatus();
        const finished = status.state === 'completed' || status.state === 'failed';
        if (finished || timedOut) {
          stopPolling();
          setScanActive(false);
          setScanDone(true);
          await refreshAllData();
          setTimeout(() => setScanDone(false), 8000);
        }
      } catch {
        if (timedOut) {
          stopPolling();
          setScanActive(false);
        }
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

  // ─── derived values for WHY section ────────────────────────────────────────
  const topComp = compList[0];
  const topCompPct = topComp && topComp.total_scans > 0
    ? Math.round((topComp.total_frequency / topComp.total_scans) * 100)
    : 0;
  const avgScore = scores?.length
    ? Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length)
    : 0;
  const groundedCount = platformSources?.filter(s => s.grounded).length ?? 0;

  const whyReasons: { icon: string; text: string; severity: 'high' | 'mid' | 'low' }[] = [];
  if (brandRecognition && brandRecognition.tier === 'not_recognized') {
    whyReasons.push({ icon: '📭', text: 'Your brand name does not appear in any LLM training-aligned web sources', severity: 'high' });
  }
  if (topComp && topCompPct > avgScore * 1.5) {
    whyReasons.push({ icon: '📈', text: `${topComp.name} has ${topComp.why_points?.[0]?.toLowerCase() ?? 'stronger citation frequency'} — built over years of indexed content`, severity: 'high' });
  }
  if (groundedCount < 2) {
    whyReasons.push({ icon: '🔍', text: `Only ${groundedCount} of 3 platforms use live web search — the others rely on training memory where you don't exist yet`, severity: 'mid' });
  }
  if (gapList.length >= 10) {
    whyReasons.push({ icon: '🕳️', text: `You're missing from ${gapList.length} queries competitors answer — no indexed content for AI to surface`, severity: 'high' });
  }
  if (whyReasons.length < 3) {
    whyReasons.push({ icon: '🏛️', text: 'Established brands carry years of press mentions, reviews, and backlinks that AI models weight heavily', severity: 'low' });
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

      {/* ── Scan banners ─────────────────────────────────────────────────────── */}
      {scanActive && (
        <div className="flex items-center gap-3 rounded-[6px] px-4 py-3 mb-4" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}>
          <RefreshCw size={14} className="animate-spin flex-shrink-0" style={{ color: '#00D4FF' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-white font-medium">{scanStageLabel}</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#64748B' }}>This takes 2–4 minutes. Results load automatically when done.</p>
          </div>
          <div className="w-32 h-1 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-1 rounded-full transition-all duration-1000" style={{ background: '#00D4FF', width: `${Math.min(95, (SCAN_STAGES.findIndex(s => s.label === scanStageLabel) / (SCAN_STAGES.length - 1)) * 100)}%` }} />
          </div>
        </div>
      )}
      {scanDone && !scanActive && (
        <div className="flex items-center gap-3 rounded-[6px] px-4 py-3 mb-4" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}>
          <CheckCircle2 size={14} style={{ color: '#00D4FF' }} className="flex-shrink-0" />
          <p className="text-[13px] text-white flex-1">Scan complete — visibility scores and competitors updated.</p>
          <button onClick={() => setScanDone(false)}><X size={14} style={{ color: '#64748B' }} /></button>
        </div>
      )}
      {!welcomeDismissed && !scanActive && !scanDone && (
        <div className="flex items-start justify-between rounded-[6px] p-4 mb-4" style={{ background: '#111113', border: '1px solid rgba(0,212,255,0.2)', borderLeftWidth: 3, borderLeftColor: '#00D4FF' }}>
          <div>
            <p className="font-medium text-white text-[14px] mb-1">Welcome to GeoVisibility, {localStorage.getItem('settings_brand_name') || merchant?.brand_name || 'your store'}</p>
            <p className="text-[13px]" style={{ color: '#64748B' }}>Run your first scan to see how AI models cite your brand.</p>
          </div>
          <button onClick={dismissWelcome} className="ml-4 flex-shrink-0"><X size={16} style={{ color: '#64748B' }} /></button>
        </div>
      )}

      {/* ── SECTION 1: Recognition status — impossible to miss ────────────────── */}
      {brandRecognition && brandRecognition.total_queries > 0 && !scanActive && (() => {
        const tier = brandRecognition.tier;
        const isNone = tier === 'not_recognized';
        const isWeak = tier === 'weak';
        const isGood = tier === 'recognized';
        const accentColor = isGood ? '#00D4FF' : isWeak ? '#F59E0B' : '#EF4444';
        const bgColor = isGood ? 'rgba(0,212,255,0.05)' : isWeak ? 'rgba(245,158,11,0.07)' : 'rgba(239,68,68,0.08)';
        const headline = isGood
          ? 'Brand recognized across AI platforms'
          : isWeak
          ? 'Weak signal — AI has inconsistent awareness of your brand'
          : 'AI models do not know your brand exists';
        const subline = isGood
          ? `Mentioned in ${brandRecognition.mentioned_queries} of ${brandRecognition.total_queries} grounded queries`
          : isNone
          ? `Not found in any of ${brandRecognition.total_queries} web-grounded AI search queries — your brand has no footprint AI can cite`
          : `Mentioned in only ${brandRecognition.mentioned_queries} of ${brandRecognition.total_queries} queries — fragile, unreliable signal`;
        return (
          <div className="rounded-[8px] p-5 mb-5" style={{ background: bgColor, border: `1px solid ${accentColor}33` }}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-[16px] font-bold text-white leading-snug">
                  {isGood ? '✓' : isWeak ? '⚠' : '✕'}&nbsp; {headline}
                </p>
                <p className="text-[13px] mt-1" style={{ color: '#94a3b8' }}>{subline}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider" style={{ background: `${accentColor}18`, color: accentColor }}>
                  {brandRecognition.confidence} confidence
                </span>
                <span className="text-[11px]" style={{ color: '#475569' }}>{brandRecognition.total_queries} queries</span>
              </div>
            </div>
            {!isGood && (
              <div className="mt-3 space-y-1.5">
                {brandRecognition.reasons.slice(0, 3).map((r, i) => (
                  <p key={i} className="text-[12px] flex items-start gap-2" style={{ color: '#94a3b8' }}>
                    <span className="flex-shrink-0 mt-0.5" style={{ color: accentColor }}>→</span> {r}
                  </p>
                ))}
                <Link to="/dashboard/fixes" className="inline-block mt-1 text-[12px] font-semibold" style={{ color: accentColor }}>
                  See fixes to build AI presence →
                </Link>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── SECTION 2: Platform scores ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {scoresLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[6px] p-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
              <LoadingSkeleton height="12px" className="mb-3 w-20" />
              <LoadingSkeleton height="32px" className="w-16" />
            </div>
          ))
        ) : (
          <>
            <MetricCard label="ChatGPT Visibility" value={chatgpt?.score ?? 0} suffix="%" trend={cgDelta} status={chatgpt ? scoreStatus(chatgpt.score) : undefined} subLabel={platformSubLabel(chatgpt?.score, 'ChatGPT', chatgpt?.queries_hit, chatgpt?.queries_run)} sourceTag={sourceTag('chatgpt')} />
            <MetricCard label="Perplexity Visibility" value={perplexity?.score ?? 0} suffix="%" trend={pxDelta} status={perplexity ? scoreStatus(perplexity.score) : undefined} subLabel={platformSubLabel(perplexity?.score, 'Perplexity', perplexity?.queries_hit, perplexity?.queries_run)} sourceTag={sourceTag('perplexity')} />
            <MetricCard label="Gemini Visibility" value={gemini?.score ?? 0} suffix="%" trend={gmDelta} status={gemini ? scoreStatus(gemini.score) : undefined} subLabel={platformSubLabel(gemini?.score, 'Gemini', gemini?.queries_hit, gemini?.queries_run)} sourceTag={sourceTag('gemini')} />
            <MetricCard
              label="Pending Fixes"
              value={pendingFixes.length}
              status={pendingFixes.length === 0 ? { label: 'All caught up', color: '#00D4FF' } : pendingFixes.filter(f => f.priority === 'high').length > 0 ? { label: `${pendingFixes.filter(f => f.priority === 'high').length} high priority`, color: '#EF4444' } : { label: 'Ready to apply', color: '#F59E0B' }}
              subLabel={pendingFixes.filter(f => f.priority === 'high').length > 0 ? 'Blocking visibility — apply now' : pendingFixes.length > 0 ? 'Apply to improve citations' : undefined}
            />
          </>
        )}
      </div>

      {/* ── SECTION 3: Why AI models choose others ───────────────────────────── */}
      {whyReasons.length > 0 && scores && scores.length > 0 && !scanActive && (
        <div className="rounded-[8px] p-5 mb-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[14px] font-semibold text-white mb-1">Why AI models choose competitors over you</p>
          <p className="text-[12px] mb-4" style={{ color: '#64748B' }}>These are the structural gaps — not opinions — based on your scan data</p>
          <div className="space-y-3">
            {whyReasons.slice(0, 4).map((r, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 px-3 rounded-[6px]" style={{ background: r.severity === 'high' ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${r.severity === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)'}` }}>
                <span className="text-[16px] leading-none flex-shrink-0 mt-0.5">{r.icon}</span>
                <p className="text-[13px]" style={{ color: r.severity === 'high' ? '#fca5a5' : '#94a3b8' }}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 3b: Visibility Pipeline ─────────────────────────────────── */}
      {pipeline && pipeline.steps?.length > 0 && !scanActive && !isMockChart && (
        <div className="rounded-[8px] p-5 mb-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[14px] font-semibold text-white mb-1">Your visibility pipeline</p>
          <p className="text-[12px] mb-4" style={{ color: '#64748B' }}>{pipeline.message}</p>
          <div className="flex items-center gap-0">
            {pipeline.steps.map((step, i) => {
              const isLast = i === pipeline.steps.length - 1;
              return (
                <div key={step.stage} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{
                        background: step.done ? '#00D4FF18' : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${step.done ? '#00D4FF' : 'rgba(255,255,255,0.1)'}`,
                        color: step.done ? '#00D4FF' : '#475569',
                      }}
                    >
                      {step.done ? '✓' : step.stage}
                    </div>
                    <p className="text-[10px] mt-1.5 text-center leading-tight max-w-[72px]" style={{ color: step.done ? '#94a3b8' : '#475569', wordBreak: 'break-word' }}>{step.name}</p>
                  </div>
                  {!isLast && (
                    <div className="flex-1 h-px mx-1 mb-4" style={{ background: step.done ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.06)' }} />
                  )}
                </div>
              );
            })}
          </div>
          {pipeline.steps.find(s => !s.done) && (
            <p className="text-[12px] mt-3 pt-3 flex items-start gap-2" style={{ color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#F59E0B' }}>→</span>
              {pipeline.steps.find(s => !s.done)!.message}
            </p>
          )}
        </div>
      )}

      {/* ── SECTION 3c: Scan Progress (before/after delta) ───────────────────── */}
      {scanProgressData && scanProgressData.last_scan_date !== scanProgressData.first_scan_date && !scanActive && (
        <div className="rounded-[8px] p-5 mb-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[14px] font-semibold text-white mb-1">Progress since you started</p>
          <p className="text-[12px] mb-4" style={{ color: '#64748B' }}>
            {new Date(scanProgressData.first_scan_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(scanProgressData.last_scan_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Overall Score', before: `${scanProgressData.first_score}%`, after: `${scanProgressData.last_score}%`, delta: scanProgressData.delta_score },
              { label: 'Mentions', before: String(scanProgressData.total_mentions - scanProgressData.delta_mentions), after: String(scanProgressData.total_mentions), delta: scanProgressData.delta_mentions },
              { label: 'Queries Covered', before: String(scanProgressData.total_queries - scanProgressData.delta_queries), after: String(scanProgressData.total_queries), delta: scanProgressData.delta_queries },
            ].map((item) => (
              <div key={item.label} className="rounded-[6px] p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>{item.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] line-through" style={{ color: '#334155' }}>{item.before}</span>
                  <span className="text-[15px] font-bold text-white">{item.after}</span>
                </div>
                <span className="text-[11px] font-mono mt-1 inline-block" style={{ color: item.delta > 0 ? '#00D4FF' : item.delta < 0 ? '#EF4444' : '#64748B' }}>
                  {item.delta > 0 ? '+' : ''}{item.delta}{item.label === 'Overall Score' ? '%' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 3d: Next 3 Moves ─────────────────────────────────────────── */}
      {nextActions && nextActions.length > 0 && !scanActive && !isMockChart && (
        <div className="rounded-[8px] p-5 mb-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[14px] font-semibold text-white mb-1">Your next 3 moves</p>
          <p className="text-[12px] mb-4" style={{ color: '#64748B' }}>Highest-impact actions based on your current scan data</p>
          <div className="space-y-2">
            {nextActions.slice(0, 3).map((action, i) => (
              <div key={i} className="flex items-start gap-3 py-3 px-3 rounded-[6px]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                  style={{
                    background: action.priority === 'high' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                    color: action.priority === 'high' ? '#EF4444' : '#F59E0B',
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white">{action.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#64748B' }}>{action.description}</p>
                </div>
                <span className="flex-shrink-0 text-[11px] font-mono font-bold" style={{ color: '#00D4FF' }}>+{action.impact_score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 3e: Quick Wins ────────────────────────────────────────────── */}
      {quickWins && quickWins.length > 0 && !scanActive && !isMockChart && (
        <div className="rounded-[8px] p-5 mb-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[14px] font-semibold text-white mb-1">Quick wins — 24–72 hours</p>
          <p className="text-[12px] mb-4" style={{ color: '#64748B' }}>Actions you can take today without waiting for scans</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickWins.slice(0, 4).map((win) => (
              <div key={win.id} className="rounded-[6px] p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[13px] font-medium text-white leading-snug">{win.title}</p>
                  <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.08)', color: '#00D4FF' }}>{win.effort}</span>
                </div>
                <p className="text-[12px] leading-relaxed mb-2" style={{ color: '#94a3b8' }}>{win.copy}</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {(win.tags ?? []).map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 4: Fixes + Competitors ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 mb-5">
        {/* Fixes */}
        <div className="rounded-[8px] p-5 flex-[58]" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-white text-[15px]">What to fix right now</p>
              {pendingFixes.length > 0 && (
                <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
                  {pendingFixes.filter(f => f.priority === 'high').length} action{pendingFixes.filter(f => f.priority === 'high').length !== 1 ? 's' : ''} blocking your AI visibility
                </p>
              )}
            </div>
            <Link to="/dashboard/fixes" className="text-[13px]" style={{ color: '#00D4FF' }}>View all →</Link>
          </div>
          {fixesLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} height="56px" />)}</div>
          ) : pendingFixes.length === 0 ? (
            <EmptyState icon={CheckCircle} title="All caught up" description="No pending fixes. Run a scan to find new opportunities." />
          ) : (
            <>
              <div className="space-y-2">
                {pendingFixes.slice(0, 3).map((fix) => (
                  <Link key={fix.id} to={`/dashboard/fixes/${fix.id}`} className="flex items-start gap-3 py-3 px-3 rounded-[6px] hover:bg-white/[0.02] transition-colors" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                    <PriorityDot priority={fix.priority} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white font-medium">{fix.title}</p>
                      <p className="text-[11px] mt-1 line-clamp-2" style={{ color: '#64748B' }}>{fix.explanation}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="font-mono text-[12px] font-bold" style={{ color: '#00D4FF' }}>+{fix.est_impact}%</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: fix.fix_layer === 'structure' ? 'rgba(167,139,250,0.1)' : fix.fix_layer === 'authority' ? 'rgba(245,158,11,0.1)' : 'rgba(0,212,255,0.08)', color: fix.fix_layer === 'structure' ? '#A78BFA' : fix.fix_layer === 'authority' ? '#F59E0B' : '#00D4FF' }}>{fix.fix_layer ?? fix.fix_type}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                to="/dashboard/fixes"
                className="flex items-center justify-center gap-2 w-full mt-4 py-3 rounded-[6px] text-[13px] font-bold transition-all hover:opacity-90"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}
              >
                Fix My Visibility — {pendingFixes.filter(f => f.priority === 'high').length} high-impact action{pendingFixes.filter(f => f.priority === 'high').length !== 1 ? 's' : ''}
              </Link>
            </>
          )}
        </div>

        {/* Competitors — tiered */}
        <div className="rounded-[8px] p-5 flex-[42]" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="mb-4">
            <p className="font-semibold text-white text-[15px]">Who's winning your citations</p>
            {compList.length > 0 && (
              <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
                Ranked by how often AI recommends them instead of you
              </p>
            )}
          </div>
          {compLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} height="44px" />)}</div>
          ) : compList.length === 0 ? (
            <EmptyState icon={Users} title="No competitors detected" description="Run a scan to see who's outranking you in AI results." />
          ) : (() => {
            const tier1 = compList.filter(c => c.tier === 1);
            const tier2 = compList.filter(c => (c.tier ?? 2) === 2);
            const renderComp = (comp: typeof compList[0], i: number, dimmed = false) => {
              const citePct = comp.total_scans > 0 ? Math.round((comp.total_frequency / comp.total_scans) * 100) : 0;
              return (
                <div key={i} className="py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-[11px] font-mono text-right flex-shrink-0" style={{ color: '#334155' }}>#{i + 1}</span>
                    <span className="flex-1 text-[13px] font-medium" style={{ color: dimmed ? '#475569' : '#e2e8f0' }}>{comp.name}</span>
                    {comp.class === 'retailer' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Retailer</span>
                    )}
                    {comp.platforms[0] && <PlatformBadge platform={comp.platforms[0] as any} />}
                    <span className="text-[11px] font-mono font-bold flex-shrink-0" style={{ color: dimmed ? '#334155' : '#EF4444' }}>{citePct}%</span>
                  </div>
                  <p className="text-[11px] ml-6 mt-0.5 line-clamp-1" style={{ color: '#475569' }}>
                    {comp.why_points?.[0]}
                  </p>
                </div>
              );
            };
            return (
              <div>
                {tier1.length > 0 && (
                  <>
                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#64748B' }}>High confidence</p>
                    {tier1.slice(0, 3).map((c, i) => renderComp(c, i))}
                  </>
                )}
                {tier2.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-widest mb-2 mt-1" style={{ color: '#334155' }}>Also cited</p>
                    {tier2.slice(0, 2).map((c, i) => renderComp(c, tier1.length + i, true))}
                  </div>
                )}
                <Link to="/dashboard/competitors" className="block text-[12px] mt-3 pt-2 transition-colors hover:opacity-80" style={{ color: '#00D4FF', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  See full breakdown →
                </Link>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── SECTION 5: Visibility trend (raw breakdown) ───────────────────────── */}
      <div className="rounded-[8px] p-5 mb-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="mb-4">
          <p className="font-medium text-white text-[15px]">Visibility trend</p>
          <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>Citation rate per platform — last 30 days</p>
        </div>
        {dailyLoading ? (
          <LoadingSkeleton height="220px" />
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
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
                <XAxis dataKey="date" tickFormatter={(d: string, i: number) => (i % 5 === 0 ? formatDate(d) : '')} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="chatgpt" name="ChatGPT" stroke="#00D4FF" strokeWidth={2} fill="url(#cgGrad)" dot={false} activeDot={{ r: 4, fill: '#00D4FF' }} />
                <Area type="monotone" dataKey="perplexity" name="Perplexity" stroke="#A78BFA" strokeWidth={2} fill="url(#pxGrad)" dot={false} activeDot={{ r: 4, fill: '#A78BFA' }} />
                <Area type="monotone" dataKey="gemini" name="Gemini" stroke="#F59E0B" strokeWidth={2} fill="url(#gmGrad)" dot={false} activeDot={{ r: 4, fill: '#F59E0B' }} />
              </AreaChart>
            </ResponsiveContainer>
            {isMockChart && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(10,10,11,0.55)', backdropFilter: 'blur(1px)' }}>
                <div className="text-center px-5 py-3 rounded-[8px]" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-white text-[13px] font-medium mb-1">No scan data yet</p>
                  <p className="text-[12px]" style={{ color: '#64748B' }}>Run your first scan to see real visibility trends</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 6: Blind spots ────────────────────────────────────────────── */}
      {(gapsLoading || gapList.length > 0) && (
        <div className="rounded-[8px] p-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1">
              <p className="font-medium text-white text-[15px]">Queries where you're completely invisible</p>
              <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>Every query below is a buyer asking AI for help — and you're not there</p>
            </div>
            {gapList.length > 0 && (
              <span className="flex-shrink-0 text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                {gapList.length} gap{gapList.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {gapList.length > 0 && (
            <p className="text-[12px] mb-4 px-3 py-2 rounded-[4px]" style={{ background: 'rgba(239,68,68,0.06)', color: '#fca5a5' }}>
              Fixing top {Math.min(5, gapList.length)} gaps could increase visibility by ~{Math.min(5, gapList.length) * 4}%
            </p>
          )}
          {gapsLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} height="36px" />)}</div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#EF4444' }}>High-value — fix these first</p>
                <div className="space-y-1.5">
                  {gapList.slice(0, 5).map((gap, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-[6px]" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
                      <span className="text-[11px] flex-shrink-0" style={{ color: '#EF4444' }}>✕</span>
                      <span className="flex-1 text-[13px]" style={{ color: '#cbd5e1' }}>{gap.query}</span>
                      <div className="flex gap-1 flex-shrink-0 items-center">
                        {gap.competitor_count !== undefined && gap.competitor_count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>{gap.competitor_count} comp</span>
                        )}
                        {gap.impact && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: gap.impact === 'high' ? 'rgba(239,68,68,0.1)' : gap.impact === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)', color: gap.impact === 'high' ? '#EF4444' : gap.impact === 'medium' ? '#F59E0B' : '#64748B' }}>{gap.impact}</span>
                        )}
                        {gap.platforms.map(p => <span key={p} className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: '#1a1a1f', color: '#64748B' }}>{p}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {gapList.length > 5 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#334155' }}>Secondary opportunities ({gapList.length - 5})</p>
                  <div className="space-y-1">
                    {gapList.slice(5).map((gap, i) => (
                      <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-[6px]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <span className="text-[11px] flex-shrink-0" style={{ color: '#334155' }}>–</span>
                        <span className="flex-1 text-[12px]" style={{ color: '#64748B' }}>{gap.query}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
