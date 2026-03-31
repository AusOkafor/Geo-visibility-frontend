import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { PlatformBadge } from '../../components/ui/PlatformBadge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCompetitors, useMerchant, useBrandRecognition } from '../../hooks/useApi';
import type { Competitor } from '../../types';

type Platform = 'chatgpt' | 'perplexity' | 'gemini';

function positionLabel(pos: number): string {
  if (pos === 1) return '1st';
  if (pos === 2) return '2nd';
  if (pos === 3) return '3rd';
  if (pos > 3) return `${pos}th`;
  return '—';
}

// Threat level: how aggressively this competitor outranks you
function threatColor(score: number): string {
  if (score >= 0.7) return '#EF4444'; // high threat
  if (score >= 0.4) return '#F59E0B'; // medium threat
  return '#64748B';                    // low threat
}

function threatLabel(score: number): string {
  if (score >= 0.7) return 'High threat';
  if (score >= 0.4) return 'Medium';
  return 'Low';
}

export function CompetitorsPage() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Platform>('chatgpt');

  const { data: competitors, isLoading } = useCompetitors();
  const { data: merchant } = useMerchant();
  const { data: brandRecognition } = useBrandRecognition();

  const list: Competitor[] = competitors ?? [];
  const top = list[0];
  const brandName = merchant?.brand_name || merchant?.shop_domain || 'You';
  const emptyState = !isLoading && list.length === 0;

  const topPct = top && top.total_scans > 0
    ? Math.round((top.total_frequency / top.total_scans) * 100)
    : 0;

  // Chart: top competitors on selected platform
  const chartData = list
    .filter(c => c.platforms.includes(activeTab))
    .slice(0, 6)
    .map(c => ({ name: c.name, value: c.total_frequency, score: c.score }));

  return (
    <div className="pb-20 md:pb-0">
      <PageHeader
        title="Competitors dominating AI results"
        subtitle="Brands consistently cited ahead of you — scored by frequency, platform reach, and position quality"
      />

      {/* Stat strip */}
      <div
        className="flex items-center gap-0 mb-6 text-[13px] rounded-[6px] px-5 py-3 overflow-x-auto"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {isLoading ? (
          <LoadingSkeleton height="16px" className="w-72" />
        ) : emptyState ? (
          <span style={{ color: '#64748B' }}>
            No competitor data yet — run a scan to see results
          </span>
        ) : (
          <>
            <span className="text-white whitespace-nowrap">
              <span className="font-mono font-bold">{list.length}</span>{' '}
              <span style={{ color: '#64748B' }}>competitors tracked</span>
            </span>
            {top && (
              <>
                <span className="mx-4" style={{ color: '#334155' }}>|</span>
                <span className="whitespace-nowrap">
                  <span className="font-mono font-bold text-white">{top.name}</span>{' '}
                  <span style={{ color: '#64748B' }}>appears in {topPct}% of AI responses</span>
                </span>
                <span className="mx-4" style={{ color: '#334155' }}>|</span>
                <span className="whitespace-nowrap" style={{ color: '#64748B' }}>
                  You rank below all of them
                </span>
              </>
            )}
            {brandRecognition && brandRecognition.total_queries > 0 && (
              <>
                <span className="mx-4" style={{ color: '#334155' }}>|</span>
                <span
                  className="whitespace-nowrap text-[11px] px-2 py-0.5 rounded font-medium uppercase tracking-wider"
                  style={{
                    background: brandRecognition.confidence === 'high'
                      ? 'rgba(0,212,255,0.1)' : brandRecognition.confidence === 'medium'
                      ? 'rgba(245,158,11,0.1)' : 'rgba(100,116,139,0.15)',
                    color: brandRecognition.confidence === 'high'
                      ? '#00D4FF' : brandRecognition.confidence === 'medium'
                      ? '#F59E0B' : '#64748B',
                  }}
                >
                  {brandRecognition.confidence} confidence
                </span>
              </>
            )}
          </>
        )}
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
            gridTemplateColumns: '2fr 2fr 90px 120px 110px 32px',
          }}
        >
          <span>Competitor</span>
          <span>Platforms</span>
          <span>Position</span>
          <span>Citations</span>
          <span>Threat</span>
          <span />
        </div>

        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <LoadingSkeleton height="20px" />
            </div>
          ))
        ) : emptyState ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[14px] text-white mb-2">No competitor data yet</p>
            <p className="text-[13px]" style={{ color: '#64748B' }}>
              Make sure your brand name and category are set in{' '}
              <Link to="/dashboard/settings" style={{ color: '#00D4FF' }}>Settings</Link>,
              then run a scan.
            </p>
          </div>
        ) : (
          list.map((comp, i) => (
            <div key={comp.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                className="w-full text-left transition-colors hover:bg-white/[0.02]"
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              >
                <div
                  className="grid items-center px-5"
                  style={{
                    minHeight: 56,
                    gridTemplateColumns: '2fr 2fr 90px 120px 110px 32px',
                  }}
                >
                  {/* Name + rank/class badges */}
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white text-[13px]">{comp.name}</span>
                    {i === 0 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
                      >
                        #1
                      </span>
                    )}
                    {comp.class === 'retailer' && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
                      >
                        Retailer
                      </span>
                    )}
                  </span>

                  {/* Platforms */}
                  <span className="flex gap-1.5 flex-wrap">
                    {comp.platforms.map(p => (
                      <PlatformBadge key={p} platform={p as Platform} />
                    ))}
                  </span>

                  {/* Position */}
                  <span className="font-mono text-[13px] text-white">
                    {positionLabel(comp.best_position)}
                  </span>

                  {/* Citations with context */}
                  <span className="text-[13px]" style={{ color: '#94a3b8' }}>
                    {comp.total_frequency}
                    {comp.total_scans > 0 && (
                      <span className="text-[11px] ml-1" style={{ color: '#64748B' }}>
                        /{comp.total_scans}
                      </span>
                    )}
                  </span>

                  {/* Threat level */}
                  <span className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: threatColor(comp.score) }}
                    >
                      {threatLabel(comp.score)}
                    </span>
                    {/* Score bar */}
                    <div
                      className="rounded-full overflow-hidden"
                      style={{ width: 36, height: 3, background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${comp.score * 100}%`,
                          background: threatColor(comp.score),
                        }}
                      />
                    </div>
                  </span>

                  {expandedIdx === i
                    ? <ChevronUp size={14} style={{ color: '#64748B' }} />
                    : <ChevronDown size={14} style={{ color: '#64748B' }} />}
                </div>
              </button>

              {/* Accordion */}
              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: expandedIdx === i ? 320 : 0,
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
                  {/* Why they rank higher */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: '#64748B' }}>
                      Why AI cites them
                    </p>
                    <ul className="space-y-2 mb-3">
                      {(comp.why_points ?? []).map((pt, j) => (
                        <li key={j} className="flex items-start gap-2 text-[13px]" style={{ color: '#94a3b8' }}>
                          <span style={{ color: '#EF4444', marginTop: 2, flexShrink: 0 }}>▸</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                    {comp.top_queries && comp.top_queries.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#475569' }}>Top queries they win</p>
                        <div className="space-y-1">
                          {comp.top_queries.slice(0, 3).map((q, j) => (
                            <p key={j} className="text-[11px] px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.06)', color: '#fca5a5' }}>"{q}"</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Platform breakdown */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: '#64748B' }}>
                      Platform presence
                    </p>
                    <div className="space-y-2">
                      {(['chatgpt', 'perplexity', 'gemini'] as Platform[]).map(p => {
                        const pos = comp.platform_positions?.[p];
                        const cited = comp.platforms.includes(p);
                        return (
                          <div key={p} className="flex items-center gap-2 text-[13px]">
                            <PlatformBadge platform={p} />
                            <span style={{ color: cited ? '#64748B' : '#334155' }}>
                              {cited && pos ? `Position ${positionLabel(pos)}` : cited ? 'Cited' : 'Not cited'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* What you can do */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: '#64748B' }}>
                      Close the gap
                    </p>
                    <p className="text-[13px] mb-3" style={{ color: '#94a3b8' }}>
                      {comp.best_position === 1
                        ? `${comp.name} is consistently the top recommendation. Build authority by expanding your product descriptions and adding structured FAQ content targeting the same buyer queries.`
                        : comp.best_position === 2
                        ? `${comp.name} ranks just ahead of you. Strengthen your schema markup and FAQ coverage to close the gap.`
                        : comp.platforms.length === 3
                        ? `${comp.name} has cross-platform presence on all 3 AI models. Improve content depth and schema markup to appear alongside them.`
                        : `${comp.name} appears in more AI responses than you. Adding FAQ content and detailed product descriptions can improve your citation rate.`}
                    </p>
                    <Link
                      to="/dashboard/fixes"
                      className="inline-flex items-center gap-1 text-[13px] font-medium transition-opacity hover:opacity-80"
                      style={{ color: '#00D4FF' }}
                    >
                      See your fixes →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Your row */}
        {!isLoading && !emptyState && (
          <div
            className="grid items-center px-5"
            style={{
              height: 56,
              gridTemplateColumns: '2fr 2fr 90px 120px 110px 32px',
              background: 'rgba(0,212,255,0.03)',
              borderTop: '1px solid rgba(0,212,255,0.1)',
            }}
          >
            <span className="font-medium text-[13px]" style={{ color: '#00D4FF' }}>
              {brandName} (You)
            </span>
            <span className="flex gap-1.5">
              {(['chatgpt', 'perplexity', 'gemini'] as Platform[]).map(p => (
                <PlatformBadge key={p} platform={p} />
              ))}
            </span>
            <span className="font-mono text-[13px]" style={{ color: '#64748B' }}>Rarely</span>
            <span className="text-[13px]" style={{ color: '#64748B' }}>—</span>
            <span className="text-[11px]" style={{ color: '#00D4FF' }}>↑ improving</span>
            <span />
          </div>
        )}
      </div>

      {/* Platform chart */}
      {!isLoading && !emptyState && (
        <div
          className="rounded-[6px] p-5"
          style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-medium text-white text-[15px]">Citation frequency by platform</p>
              <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
                How often each competitor is cited on this platform
              </p>
            </div>
            <div
              className="flex rounded-[6px] overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {(['chatgpt', 'perplexity', 'gemini'] as Platform[]).map(p => (
                <button
                  key={p}
                  onClick={() => setActiveTab(p)}
                  className="px-3 py-1.5 text-[12px] capitalize transition-colors"
                  style={{
                    background: activeTab === p ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: activeTab === p ? '#ffffff' : '#64748B',
                    borderRight: p !== 'gemini' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}
                >
                  {p === 'chatgpt' ? 'ChatGPT' : p === 'perplexity' ? 'Perplexity' : 'Gemini'}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <p className="text-[13px] py-8 text-center" style={{ color: '#64748B' }}>
              No citations on this platform yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Space Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a1a1f',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6,
                  }}
                  labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                  itemStyle={{ color: '#ffffff', fontSize: 12 }}
                  formatter={(val) => [`${val} citations`, 'Frequency']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={threatColor(entry.score)}
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Score legend */}
          <div className="flex items-center gap-5 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[11px]" style={{ color: '#64748B' }}>Threat level:</p>
            {([
              { color: '#EF4444', label: 'High (score ≥ 0.7)' },
              { color: '#F59E0B', label: 'Medium (0.4–0.7)' },
              { color: '#64748B', label: 'Low (< 0.4)' },
            ]).map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px]" style={{ color: '#64748B' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
