import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, CheckCircle, Users, ChevronRight, BarChart2 } from 'lucide-react';
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
import { useMerchant, useVisibilityScores, useDailyScores, useFixes, useCompetitors } from '../../hooks/useApi';
import { formatDate } from '../../lib/utils';


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

export function DashboardHome() {
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem('welcome_dismissed') === 'true'
  );

  const { data: merchant } = useMerchant();
  const { data: scores, isLoading: scoresLoading } = useVisibilityScores(30);
  const { data: daily, isLoading: dailyLoading } = useDailyScores(30);
  const { data: fixes, isLoading: fixesLoading } = useFixes('pending');
  const { data: competitors, isLoading: compLoading } = useCompetitors();

  const chatgpt = scores?.find((s) => s.platform === 'chatgpt');
  const perplexity = scores?.find((s) => s.platform === 'perplexity');
  const gemini = scores?.find((s) => s.platform === 'gemini');

  const chartData = daily ?? [];
  const pendingFixes = fixes ?? [];
  const compList = competitors ?? [];

  function dismissWelcome() {
    localStorage.setItem('welcome_dismissed', 'true');
    setWelcomeDismissed(true);
  }

  return (
    <div className="pb-20 md:pb-0">
      <PageHeader
        title="Dashboard"
        subtitle="AI visibility overview — last 30 days"
      />

      {/* Welcome banner */}
      {!welcomeDismissed && (
        <div
          className="flex items-start justify-between rounded-[6px] p-4 mb-6"
          style={{
            background: '#111113',
            borderLeft: '3px solid #00D4FF',
            border: '1px solid rgba(0,212,255,0.2)',
            borderLeftWidth: 3,
          }}
        >
          <div>
            <p className="font-medium text-white text-[14px] mb-1">
              Welcome to GeoVisibility, {merchant?.brand_name ?? 'Oakwood Leather Co.'}
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
            <MetricCard
              label="ChatGPT Visibility"
              value={chatgpt?.score ?? 0}
              suffix="%"
            />
            <MetricCard
              label="Perplexity Visibility"
              value={perplexity?.score ?? 0}
              suffix="%"
            />
            <MetricCard
              label="Gemini Visibility"
              value={gemini?.score ?? 0}
              suffix="%"
            />
            <MetricCard
              label="Pending Fixes"
              value={pendingFixes.length}
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
          <EmptyState icon={BarChart2} title="Scanning in progress..." description="Chart will appear once your first scan completes." />
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
            <p className="font-medium text-white text-[15px]">Fixes to improve visibility</p>
            <Link to="/dashboard/fixes" className="text-[13px]" style={{ color: '#00D4FF' }}>
              View all →
            </Link>
          </div>
          {fixesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} height="44px" />)}
            </div>
          ) : pendingFixes.length === 0 ? (
            <EmptyState icon={CheckCircle} title="All caught up" description="No pending fixes. Your store is well-optimized." />
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
          <p className="font-medium text-white text-[15px] mb-4">Who's being cited instead of you</p>
          {compLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} height="36px" />)}
            </div>
          ) : compList.length === 0 ? (
            <EmptyState icon={Users} title="Scanning for competitors" description="We'll detect who's beating you in AI results." />
          ) : (
            <div className="space-y-2">
              {compList.slice(0, 5).map((comp, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <span className="flex-1 text-[13px] text-white">{comp.name}</span>
                  {comp.platforms[0] && <PlatformBadge platform={comp.platforms[0] as any} />}
                  <span className="text-[11px]" style={{ color: '#64748B' }}>
                    Cited {comp.total_frequency}× this week
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


