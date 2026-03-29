import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, CheckCircle, Users, ChevronRight, BarChart2, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
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
import { useMerchant, useVisibilityScores, useDailyScores, useFixes, useCompetitors, useTriggerScan, usePlatformSources } from '../../hooks/useApi';
import { formatDate } from '../../lib/utils';
import type { VisibilityScore, DailyScore, Competitor, Fix } from '../../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function getPlatformDelta(
  daily: DailyScore[],
  key: 'chatgpt' | 'perplexity' | 'gemini'
): number | undefined {
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
      ((last.chatgpt + last.perplexity + last.gemini) -
        (prev.chatgpt + prev.perplexity + prev.gemini)) / 3
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
          highFixes > 0
            ? `Apply your ${highFixes} high-priority fix${highFixes > 1 ? 'es' : ''} to close the gap.`
            : 'Run a scan to generate improvement suggestions.'
        }`,
      };
    }
    return {
      type: 'warning',
      text: `Average visibility is ${avg}% — AI models aren't citing you reliably yet. ${
        highFixes > 0 ? 'Apply pending fixes to improve.' : ''
      }`,
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
      highFixes > 0
        ? `${highFixes} fix${highFixes > 1 ? 'es' : ''} ready to apply.`
        : "You're well-optimized across all platforms."
    }`,
  };
}

// ─── chart tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-[6px] p-3 text-[12px]"
      style={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.08)' }}
    >
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
  const [scanQueued, setScanQueued] = useState(false);

  const { data: merchant } = useMerchant();
  const { data: scores, isLoading: scoresLoading } = useVisibilityScores(30);
  const { data: daily, isLoading: dailyLoading } = useDailyScores(30);
  const { data: fixes, isLoading: fixesLoading } = useFixes('pending');
  const { data: competitors, isLoading: compLoading } = useCompetitors();
  const { data: platformSources } = usePlatformSources();
  const triggerScan = useTriggerScan();

  // Build a lookup: platform → 'web' | 'simulated'
  const sourceTag = (platform: string): 'web' | 'simulated' | undefined => {
    if (!platformSources || platformSources.length === 0) return undefined;
    const src = platformSources.find((s) => s.platform === platform);
    if (!src) return undefined;
    return src.grounded ? 'web' : 'simulated';
  };

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

  function dismissWelcome() {
    localStorage.setItem('welcome_dismissed', 'true');
    setWelcomeDismissed(true);
  }

  function handleRunScan() {
    triggerScan.mutate(undefined, {
      onSuccess: () => {
        setScanQueued(true);
        setTimeout(() => setScanQueued(false), 60000);
      },
    });
  }

  return (
    <div className="pb-20 md:pb-0">
      <PageHeader
        title="Dashboard"
        subtitle="AI visibility overview — last 30 days"
        action={
          <button
            onClick={handleRunScan}
            disabled={triggerScan.isPending || scanQueued}
            className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-[13px] font-medium transition-all"
            style={{
              background: scanQueued ? 'rgba(0,212,255,0.08)' : 'rgba(0,212,255,0.12)',
              border: '1px solid rgba(0,212,255,0.25)',
              color: scanQueued ? '#64748B' : '#00D4FF',
              cursor: triggerScan.isPending || scanQueued ? 'not-allowed' : 'pointer',
              opacity: triggerScan.isPending || scanQueued ? 0.6 : 1,
            }}
          >
            <RefreshCw size={13} className={triggerScan.isPending ? 'animate-spin' : ''} />
            {triggerScan.isPending ? 'Queuing…' : scanQueued ? 'Scan queued' : 'Run Scan'}
          </button>
        }
      />

      {/* Welcome banner — shown only before first dismissal */}
      {!welcomeDismissed && (
        <div
          className="flex items-start justify-between rounded-[6px] p-4 mb-4"
          style={{
            background: '#111113',
            border: '1px solid rgba(0,212,255,0.2)',
            borderLeftWidth: 3,
            borderLeftColor: '#00D4FF',
          }}
        >
          <div>
            <p className="font-medium text-white text-[14px] mb-1">
              Welcome to GeoVisibility,{' '}
              {localStorage.getItem('settings_brand_name') || merchant?.brand_name || 'your store'}
            </p>
            <p className="text-[13px]" style={{ color: '#64748B' }}>
              Your first scan is running now. Results will appear within a few minutes.
            </p>
          </div>
          <button onClick={dismissWelcome} className="ml-4 flex-shrink-0">
            <X size={16} style={{ color: '#64748B' }} />
          </button>
        </div>
      )}

      {/* Insight banner — computed from real data, replaces welcome after first scan */}
      {insight && !scoresLoading && (
        <div
          className="flex items-start gap-3 rounded-[6px] px-4 py-3 mb-6"
          style={{
            background: insight.type === 'warning'
              ? 'rgba(239,68,68,0.06)'
              : insight.type === 'positive'
              ? 'rgba(0,212,255,0.06)'
              : '#111113',
            border: `1px solid ${
              insight.type === 'warning'
                ? 'rgba(239,68,68,0.2)'
                : insight.type === 'positive'
                ? 'rgba(0,212,255,0.2)'
                : 'rgba(255,255,255,0.06)'
            }`,
            borderLeftWidth: 3,
            borderLeftColor:
              insight.type === 'warning'
                ? '#EF4444'
                : insight.type === 'positive'
                ? '#00D4FF'
                : '#334155',
          }}
        >
          <span
            className="text-[18px] leading-none mt-0.5 flex-shrink-0"
          >
            {insight.type === 'warning' ? '⚠' : insight.type === 'positive' ? '↑' : '·'}
          </span>
          <p className="text-[13px] leading-relaxed" style={{ color: '#94a3b8' }}>
            {insight.text}
          </p>
        </div>
      )}

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {scoresLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[6px] p-5"
              style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <LoadingSkeleton height="12px" className="mb-3 w-20" />
              <LoadingSkeleton height="32px" className="w-16" />
            </div>
          ))
        ) : (
          <>
            <MetricCard
              label="ChatGPT Visibility"
              value={chatgpt?.score ?? 0}
              suffix="%"
              trend={cgDelta}
              status={chatgpt ? scoreStatus(chatgpt.score) : undefined}
              sourceTag={sourceTag('chatgpt')}
            />
            <MetricCard
              label="Perplexity Visibility"
              value={perplexity?.score ?? 0}
              suffix="%"
              trend={pxDelta}
              status={perplexity ? scoreStatus(perplexity.score) : undefined}
              sourceTag={sourceTag('perplexity')}
            />
            <MetricCard
              label="Gemini Visibility"
              value={gemini?.score ?? 0}
              suffix="%"
              trend={gmDelta}
              status={gemini ? scoreStatus(gemini.score) : undefined}
              sourceTag={sourceTag('gemini')}
            />
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

      {/* Trend chart */}
      <div
        className="rounded-[6px] p-5 mb-6"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <PageHeader title="Visibility score trend" />
        {dailyLoading ? (
          <LoadingSkeleton height="260px" />
        ) : chartData.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            title="Scanning in progress..."
            description="Chart will appear once your first scan completes."
          />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="0" />
              <XAxis
                dataKey="date"
                tickFormatter={(d, i) => (i % 5 === 0 ? formatDate(d) : '')}
                tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Space Mono' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 12, fontSize: 12, fontFamily: 'DM Sans' }}
                iconType="circle"
                iconSize={8}
              />
              <Line type="monotone" dataKey="chatgpt" name="ChatGPT" stroke="#00D4FF" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#00D4FF' }} />
              <Line type="monotone" dataKey="perplexity" name="Perplexity" stroke="#A78BFA" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#A78BFA' }} />
              <Line type="monotone" dataKey="gemini" name="Gemini" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#F59E0B' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Fixes preview */}
        <div
          className="rounded-[6px] p-5 flex-[58]"
          style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
        >
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
            <Link to="/dashboard/fixes" className="text-[13px]" style={{ color: '#00D4FF' }}>
              View all →
            </Link>
          </div>
          {fixesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} height="44px" />)}
            </div>
          ) : pendingFixes.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="All caught up"
              description="No pending fixes. Your store is well-optimized."
            />
          ) : (
            <div className="space-y-2">
              {pendingFixes.slice(0, 3).map((fix) => (
                <Link
                  key={fix.id}
                  to={`/dashboard/fixes/${fix.id}`}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-[6px] hover:bg-white/[0.02] transition-colors"
                >
                  <PriorityDot priority={fix.priority} />
                  <span className="flex-1 text-[13px] text-white font-medium truncate">
                    {fix.title}
                  </span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded"
                    style={{ background: '#1a1a1f', color: '#64748B' }}
                  >
                    {fix.fix_type}
                  </span>
                  <span className="font-mono text-[13px] ml-2" style={{ color: '#00D4FF' }}>
                    +{fix.est_impact}%
                  </span>
                  <ChevronRight size={14} style={{ color: '#64748B' }} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Competitors preview */}
        <div
          className="rounded-[6px] p-5 flex-[42]"
          style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="mb-4">
            <p className="font-medium text-white text-[15px]">
              {compList.length > 0 ? 'Brands stealing your citations' : 'Who\'s being cited instead of you'}
            </p>
            {compList.length > 0 && (
              <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
                {compList.length} competitor{compList.length > 1 ? 's' : ''} outranking you in AI results
              </p>
            )}
          </div>
          {compLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} height="36px" />)}
            </div>
          ) : compList.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Scanning for competitors"
              description="We'll detect who's beating you in AI results."
            />
          ) : (
            <div className="space-y-2">
              {compList.slice(0, 5).map((comp, i) => {
                const citePct = comp.total_scans > 0
                  ? Math.round((comp.total_frequency / comp.total_scans) * 100)
                  : 0;
                return (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="w-4 text-[11px] font-mono text-right flex-shrink-0" style={{ color: '#334155' }}>
                      #{i + 1}
                    </span>
                    <span className="flex-1 text-[13px] text-white">{comp.name}</span>
                    {comp.platforms[0] && <PlatformBadge platform={comp.platforms[0] as any} />}
                    <span className="text-[11px] font-mono flex-shrink-0" style={{ color: '#64748B' }}>
                      {citePct}% of responses
                    </span>
                  </div>
                );
              })}
              <Link
                to="/dashboard/competitors"
                className="block text-[12px] mt-3 pt-3 transition-colors hover:opacity-80"
                style={{ color: '#00D4FF', borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                See full breakdown →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
