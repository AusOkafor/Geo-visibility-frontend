import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { PlatformBadge } from '../../components/ui/PlatformBadge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCompetitors, useMerchant } from '../../hooks/useApi';
import type { Competitor } from '../../types';

type Platform = 'chatgpt' | 'perplexity' | 'gemini';

interface GroupedCompetitor {
  name: string;
  platforms: Platform[];
  totalFrequency: number;
  bestPosition: number;
  byPlatform: Record<string, { position: number; frequency: number }>;
}

function groupCompetitors(rows: Competitor[]): GroupedCompetitor[] {
  const map = new Map<string, GroupedCompetitor>();
  for (const row of rows) {
    const existing = map.get(row.name);
    if (!existing) {
      map.set(row.name, {
        name: row.name,
        platforms: [row.platform as Platform],
        totalFrequency: row.frequency,
        bestPosition: row.position,
        byPlatform: { [row.platform]: { position: row.position, frequency: row.frequency } },
      });
    } else {
      if (!existing.platforms.includes(row.platform as Platform)) {
        existing.platforms.push(row.platform as Platform);
      }
      existing.totalFrequency += row.frequency;
      if (row.position > 0 && (existing.bestPosition === 0 || row.position < existing.bestPosition)) {
        existing.bestPosition = row.position;
      }
      existing.byPlatform[row.platform] = { position: row.position, frequency: row.frequency };
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalFrequency - a.totalFrequency);
}

function positionLabel(pos: number): string {
  if (pos === 1) return '1st';
  if (pos === 2) return '2nd';
  if (pos === 3) return '3rd';
  if (pos > 3) return `${pos}th`;
  return '—';
}

export function CompetitorsPage() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Platform>('chatgpt');

  const { data: rawCompetitors, isLoading } = useCompetitors();
  const { data: merchant } = useMerchant();

  const competitors = rawCompetitors ? groupCompetitors(rawCompetitors) : [];
  const topCompetitor = competitors[0];
  const brandName = merchant?.brand_name || merchant?.shop_domain || 'You';

  // Per-platform chart data: top competitors on that platform + "You"
  const platformChartData = (platform: Platform) => {
    if (!rawCompetitors) return [];
    const rows = rawCompetitors
      .filter((r) => r.platform === platform)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 4)
      .map((r) => ({ name: r.name, value: r.frequency }));
    return rows;
  };

  const chartData = platformChartData(activeTab);

  const emptyState = !isLoading && competitors.length === 0;

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
        {isLoading ? (
          <LoadingSkeleton height="16px" className="w-64" />
        ) : emptyState ? (
          <span style={{ color: '#64748B' }}>No competitor data yet — run a scan to see results</span>
        ) : (
          <>
            <span className="text-white whitespace-nowrap">
              <span className="font-mono font-bold">{competitors.length}</span>{' '}
              <span style={{ color: '#64748B' }}>competitors detected</span>
            </span>
            {topCompetitor && (
              <>
                <span className="mx-4" style={{ color: '#334155' }}>|</span>
                <span className="whitespace-nowrap">
                  <span className="font-mono font-bold text-white">{topCompetitor.name}</span>{' '}
                  <span style={{ color: '#64748B' }}>appears most often ({topCompetitor.totalFrequency} citations)</span>
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
            gridTemplateColumns: '2fr 2fr 80px 160px 32px',
          }}
        >
          <span>Competitor</span>
          <span>Platforms</span>
          <span>Position</span>
          <span>Frequency</span>
          <span />
        </div>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <LoadingSkeleton height="20px" />
            </div>
          ))
        ) : emptyState ? (
          <div className="px-5 py-8 text-center text-[13px]" style={{ color: '#64748B' }}>
            No competitor data yet. Scan results will appear here after your first scan completes.
          </div>
        ) : (
          competitors.map((comp, i) => (
            <div key={comp.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                className="w-full text-left transition-colors hover:bg-white/[0.02]"
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              >
                <div
                  className="grid items-center px-5"
                  style={{
                    height: 56,
                    gridTemplateColumns: '2fr 2fr 80px 160px 32px',
                  }}
                >
                  <span className="font-medium text-white text-[13px]">{comp.name}</span>
                  <span className="flex gap-2 flex-wrap">
                    {comp.platforms.map((p) => (
                      <PlatformBadge key={p} platform={p} />
                    ))}
                  </span>
                  <span className="font-mono text-[13px] text-white">
                    {positionLabel(comp.bestPosition)}
                  </span>
                  <span className="text-[13px] text-white">
                    {comp.totalFrequency}× in last 30d
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
                  maxHeight: expandedIdx === i ? 220 : 0,
                  opacity: expandedIdx === i ? 1 : 0,
                }}
              >
                <div
                  className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5"
                  style={{
                    background: '#0d0d10',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                      Per-platform breakdown
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(comp.byPlatform).map(([plat, data]) => (
                        <div key={plat} className="flex items-center gap-3 text-[13px]">
                          <PlatformBadge platform={plat as Platform} />
                          <span style={{ color: '#94a3b8' }}>
                            Position {positionLabel(data.position)} — {data.frequency}× cited
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                      Recommendation
                    </p>
                    <p className="text-[13px] mb-3" style={{ color: '#94a3b8' }}>
                      Improve your product descriptions and FAQ content to compete with {comp.name}
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
          ))
        )}

        {/* Your row */}
        {!isLoading && !emptyState && (
          <div
            className="grid items-center px-5"
            style={{
              height: 56,
              gridTemplateColumns: '2fr 2fr 80px 160px 32px',
              background: 'rgba(0,212,255,0.03)',
              borderTop: '1px solid rgba(0,212,255,0.1)',
            }}
          >
            <span className="font-medium text-[13px]" style={{ color: '#00D4FF' }}>
              {brandName} (You)
            </span>
            <span className="flex gap-2">
              {(['chatgpt', 'perplexity', 'gemini'] as Platform[]).map((p) => (
                <PlatformBadge key={p} platform={p} />
              ))}
            </span>
            <span className="font-mono text-[13px]" style={{ color: '#64748B' }}>Rarely</span>
            <span className="text-[13px]" style={{ color: '#64748B' }}>—</span>
            <span />
          </div>
        )}
      </div>

      {/* Platform breakdown tabs */}
      {!isLoading && !emptyState && (
        <div
          className="rounded-[6px] p-5"
          style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="font-medium text-white text-[15px] mb-4">Citation frequency by platform</p>
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
          {chartData.length === 0 ? (
            <p className="text-[13px] py-8 text-center" style={{ color: '#64748B' }}>
              No data for this platform yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}
                  labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                  itemStyle={{ color: '#ffffff', fontSize: 12 }}
                  formatter={(val: number) => [`${val} citations`, 'Frequency']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill="#64748B"
                      fillOpacity={0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
