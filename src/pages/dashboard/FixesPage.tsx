import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFixes, useRejectFix, useQueryGaps, useVisibilityScores, useMerchant, useCompetitors, useAuthorityScore } from '../../hooks/useApi';
import type { Fix, QueryGap } from '../../types';

// Maps fix_layer → the 3-bucket problem frame shown on Visibility page
// Order: content first (Get Found = FAQ + Description), then structure (Get Understood = Schema)
const LAYER_META: Record<string, { label: string; sublabel: string; color: string }> = {
  content: {
    label: 'Layer 1 — Get Found',
    sublabel: 'AI can\'t find answers for buyer queries on your site yet',
    color: '#00D4FF',
  },
  structure: {
    label: 'Layer 2 — Get Understood',
    sublabel: 'AI can\'t properly parse your brand and catalog',
    color: '#A78BFA',
  },
  authority: {
    label: 'Layer 3 — Get Trusted',
    sublabel: 'AI needs external citations before recommending you',
    color: '#F59E0B',
  },
};
const LAYER_ORDER = ['content', 'structure', 'authority'] as const;

// Post-apply message per layer — shows what to do next
const NEXT_STEP: Record<string, string> = {
  content: 'Content live — apply the schema fix next so AI can parse your brand correctly',
  structure: 'Schema applied — earn 1 external mention to become citable across all platforms',
  authority: 'Authority signal added — AI is more likely to cite you now',
};

function FixCard({
  fix,
  onDismiss,
  topGaps,
  currentCitations,
  totalQueriesRun,
  isStartHere,
}: {
  fix: Fix;
  onDismiss: (id: string) => void;
  topGaps: QueryGap[];
  currentCitations: number;
  totalQueriesRun: number;
  isStartHere?: boolean;
}) {
  const navigate = useNavigate();
  const layer = fix.fix_layer ?? 'content';
  const layerColor = LAYER_META[layer]?.color ?? '#64748B';
  const typeLabel =
    fix.fix_type === 'faq' ? 'FAQ Page' : fix.fix_type.charAt(0).toUpperCase() + fix.fix_type.slice(1);

  // Project gain using the same total-queries denominator as currentCitations.
  // Cap at totalQueriesRun — you can't be cited more times than queries were run.
  const projectedGain =
    totalQueriesRun > 0 ? Math.round(totalQueriesRun * fix.est_impact / 100) : null;
  const projectedTotal =
    projectedGain !== null ? Math.min(currentCitations + projectedGain, totalQueriesRun) : null;

  // Only show query gaps on content/structure fixes (not authority)
  const showGaps = layer !== 'authority' && topGaps.length > 0 && fix.status === 'pending';

  return (
    <div
      className="rounded-[6px] p-5 transition-all duration-200 hover:border-white/10"
      style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex gap-5">
        {/* Left: content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[11px] px-2 py-0.5 rounded capitalize"
              style={{ border: `1px solid ${layerColor}44`, color: layerColor }}
            >
              {typeLabel}
            </span>
            {isStartHere && fix.status === 'pending' && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.25)' }}
              >
                ⚡ Start here
              </span>
            )}
            {fix.priority === 'high' && fix.status === 'pending' && !isStartHere && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
              >
                Competitors cited here
              </span>
            )}
          </div>

          <p className="font-medium text-white text-[15px] mb-1.5">{fix.title}</p>
          <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: '#64748B' }}>
            {fix.explanation}
          </p>

          {/* Query gaps this fix directly targets */}
          {showGaps && (
            <div className="mt-3">
              <p className="text-[11px] mb-1.5" style={{ color: '#475569' }}>
                Targets queries you're missing:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topGaps.slice(0, 3).map((gap, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(239,68,68,0.07)',
                      color: '#fca5a5',
                      border: '1px solid rgba(239,68,68,0.15)',
                    }}
                  >
                    "{gap.query}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Post-apply journey message */}
          {(fix.status === 'applied' || fix.status === 'manual') && (
            <div
              className="mt-3 px-3 py-2 rounded text-[12px]"
              style={{
                background: fix.status === 'applied'
                  ? 'rgba(0,212,255,0.06)'
                  : 'rgba(245,158,11,0.06)',
                border: fix.status === 'applied'
                  ? '1px solid rgba(0,212,255,0.12)'
                  : '1px solid rgba(245,158,11,0.12)',
                color: fix.status === 'applied' ? '#67e8f9' : '#fcd34d',
              }}
            >
              {fix.status === 'applied'
                ? `✓ ${NEXT_STEP[layer]}`
                : 'Apply the generated content to your store — copy from the review screen above'}
            </div>
          )}
        </div>

        {/* Right: impact + actions */}
        <div className="flex flex-col items-end justify-start gap-2 flex-shrink-0 min-w-[130px]">
          {fix.status === 'pending' ? (
            <>
              <div className="text-right">
                <p className="font-mono font-bold text-[20px]" style={{ color: '#00D4FF' }}>
                  +{fix.est_impact}%
                </p>
                <p className="text-[10px]" style={{ color: '#64748B' }}>
                  estimated visibility gain
                </p>
              </div>

              {/* Before → After in concrete citation counts */}
              {projectedTotal !== null && totalQueriesRun > 0 && (
                <div
                  className="text-[11px] px-2.5 py-1.5 rounded w-full"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <p className="mb-0.5" style={{ color: '#64748B' }}>
                    Now:{' '}
                    <span className="font-mono text-white">
                      {currentCitations} citations
                    </span>
                  </p>
                  <p style={{ color: '#00D4FF' }}>
                    After:{' '}
                    <span className="font-mono">
                      ~{projectedTotal} citations
                    </span>
                  </p>
                </div>
              )}

              <button
                onClick={() => navigate(`/dashboard/fixes/${fix.id}`)}
                className="text-[13px] font-medium px-3 py-1.5 rounded w-full text-center transition-all hover:brightness-110"
                style={{ background: '#00D4FF', color: '#0A0A0B', borderRadius: 6 }}
              >
                Apply Fix
              </button>
              <button
                onClick={() => navigate(`/dashboard/fixes/${fix.id}`)}
                className="text-[11px] transition-colors w-full text-center"
                style={{ color: '#475569' }}
              >
                Preview
              </button>
              <button
                onClick={() => onDismiss(fix.id)}
                className="text-[11px] transition-colors"
                style={{ color: '#334155' }}
              >
                Dismiss
              </button>
            </>
          ) : fix.status === 'applied' ? (
            <span
              className="text-[12px] flex items-center gap-1.5 px-2 py-1 rounded"
              style={{ color: '#00D4FF', background: 'rgba(0,212,255,0.08)' }}
            >
              ✓ Applied
            </span>
          ) : fix.status === 'manual' ? (
            <span
              className="text-[12px] px-2 py-1 rounded text-center"
              style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.08)' }}
            >
              Manual action needed
            </span>
          ) : fix.status === 'rejected' ? (
            <span className="text-[12px]" style={{ color: '#64748B' }}>
              Dismissed
            </span>
          ) : (
            <span
              className="text-[12px] px-2 py-1 rounded"
              style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.08)' }}
            >
              ⟳ Applying...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Authority guidance card — shown when no authority fixes have been generated yet.
// Turns manual guidance into copy-ready execution tools so users can act immediately.
function AuthorityGuidanceCard({
  brandName,
  topCompetitor,
  topQuery,
}: {
  brandName: string;
  topCompetitor: string;
  topQuery: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const redditPost = `Hey r/jewelry!\n\nLooking for ${topQuery || 'fine jewelry'} recommendations — has anyone tried ${brandName}? They do 14K/18K gold pieces and I'm comparing them vs ${topCompetitor || 'other boutique brands'}. Curious about quality for the price point.\n\nAny experience with them?`;

  const outreachEmail = `Subject: Quick addition for your "${topQuery || 'fine jewelry'}" article\n\nHi,\n\nI came across your piece on ${topQuery || 'fine jewelry brands'} and noticed ${brandName} wasn't included.\n\nWe offer fine jewelry in 14K/18K gold starting at $85 — specifically positioned for buyers searching for affordable luxury. Happy to share more details if you're ever updating the article.\n\nBest,\n[Your Name]\n${brandName}`;

  return (
    <div
      className="rounded-[6px] p-5"
      style={{ background: '#111113', border: '1px solid rgba(245,158,11,0.2)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[11px] px-2 py-0.5 rounded"
          style={{ border: '1px solid rgba(245,158,11,0.35)', color: '#F59E0B' }}
        >
          Citation Builder
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
        >
          Required to become citable
        </span>
      </div>

      <p className="font-medium text-white text-[15px] mb-1.5">
        Get your brand cited in sources AI actually reads
      </p>
      <p className="text-[13px] mb-4" style={{ color: '#64748B' }}>
        Structure fixes alone won't get you recommended. AI platforms need to see {brandName} mentioned
        externally before they'll cite you. Use these to get your first mention today.
      </p>

      <div className="space-y-3">
        {/* Tool 1: Reddit post */}
        <div
          className="rounded-[6px] p-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-[13px] font-medium text-white">Post in r/jewelry</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>
                Perplexity indexes Reddit fast — a single post can appear in AI answers within days
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(redditPost, 'reddit')}
              className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded transition-all"
              style={{
                background: copied === 'reddit' ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.06)',
                color: copied === 'reddit' ? '#00D4FF' : '#94a3b8',
                border: `1px solid ${copied === 'reddit' ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {copied === 'reddit' ? '✓ Copied' : 'Copy post'}
            </button>
          </div>
          <p className="text-[11px] px-2 py-1.5 rounded font-mono leading-relaxed line-clamp-2" style={{ background: 'rgba(0,0,0,0.3)', color: '#475569' }}>
            {redditPost.split('\n')[0]}
          </p>
        </div>

        {/* Tool 2: Outreach email */}
        <div
          className="rounded-[6px] p-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-[13px] font-medium text-white">Email authors of "best under $X" posts</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>
                Find articles ranking for your top query gaps and ask to be included
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(outreachEmail, 'email')}
              className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded transition-all"
              style={{
                background: copied === 'email' ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.06)',
                color: copied === 'email' ? '#00D4FF' : '#94a3b8',
                border: `1px solid ${copied === 'email' ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {copied === 'email' ? '✓ Copied' : 'Copy email'}
            </button>
          </div>
          <p className="text-[11px] px-2 py-1.5 rounded font-mono leading-relaxed line-clamp-2" style={{ background: 'rgba(0,0,0,0.3)', color: '#475569' }}>
            Subject: Quick addition for your "{topQuery || 'fine jewelry'}" article
          </p>
        </div>

        {/* Tool 3: Directory targets */}
        <div
          className="flex items-start gap-3 px-3 py-2.5 rounded"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <span className="text-[12px] font-mono mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }}>03</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-white">Submit to Who What Wear, Refinery29, The Strategist</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>
              "Best of" list placements — these are cited directly in AI recommendations
            </p>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5" style={{ background: 'rgba(255,255,255,0.04)', color: '#64748B' }}>
            1–2 hrs
          </span>
        </div>
      </div>
    </div>
  );
}

export function FixesPage() {
  const { data: fixes, isLoading } = useFixes('');
  const { data: queryGaps } = useQueryGaps();
  const { data: scores } = useVisibilityScores(30);
  const { data: merchant } = useMerchant();
  const { data: competitors } = useCompetitors();
  const { data: authorityScore } = useAuthorityScore();
  const rejectFix = useRejectFix();

  const allFixes = (fixes ?? []).filter((f) => f.status !== 'rejected');

  // Sum citations and total queries across all platforms — use the same denominator
  // for both "Now" and "After" so the projection is internally consistent.
  const currentCitations = scores?.reduce((s, sc) => s + (sc.queries_hit ?? 0), 0) ?? 0;
  const totalQueriesRun = scores?.reduce((s, sc) => s + (sc.queries_run ?? 0), 0) ?? 0;

  // Top query gaps to attach to content/structure cards
  const topGaps = (queryGaps ?? []).slice(0, 5);

  const hasAuthorityFix = allFixes.some((f) => (f.fix_layer ?? 'content') === 'authority');
  const pendingFixes = allFixes.filter((f) => f.status === 'pending');
  const totalImpact = pendingFixes.reduce((sum, f) => sum + f.est_impact, 0);
  const appliedCount = allFixes.filter((f) => f.status === 'applied' || f.status === 'manual').length;

  // First pending fix in first non-empty layer — gets the "Start here" badge
  const startHereId = (() => {
    for (const layer of LAYER_ORDER) {
      const first = pendingFixes.find((f) => (f.fix_layer ?? 'content') === layer);
      if (first) return first.id;
    }
    return null;
  })();

  // Authority card data
  const brandName = merchant?.brand_name ?? '';
  const topCompetitor = competitors?.[0]?.name ?? '';
  const topQuery = (queryGaps ?? [])[0]?.query ?? '';

  // Missing query count for header urgency
  const missingQueryCount = (queryGaps ?? []).length;

  function handleDismiss(id: string) {
    rejectFix.mutate(id);
  }

  return (
    <div className="pb-20 md:pb-0">
      <PageHeader
        title="AI Visibility Fixes"
        subtitle={
          missingQueryCount > 0
            ? `You're missing ${missingQueryCount} buyer quer${missingQueryCount !== 1 ? 'ies' : 'y'} where competitors are being recommended instead of you`
            : pendingFixes.length > 0
            ? 'Apply these fixes to start appearing in AI recommendations'
            : 'AI-generated improvements to get you cited more'
        }
      />

      {/* Summary bar */}
      <div
        className="flex flex-wrap items-center gap-0 rounded-[6px] px-5 py-3 mb-6 text-[13px]"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-white whitespace-nowrap">
          <span className="font-mono font-bold">{pendingFixes.length}</span>{' '}
          <span style={{ color: '#64748B' }}>pending fixes</span>
        </span>
        <span className="mx-4" style={{ color: '#334155' }}>|</span>
        <span className="whitespace-nowrap">
          <span className="font-mono font-bold" style={{ color: '#00D4FF' }}>
            +{totalImpact}%
          </span>{' '}
          <span style={{ color: '#64748B' }}>estimated visibility gain</span>
        </span>
        <span className="mx-4" style={{ color: '#334155' }}>|</span>
        <span className="whitespace-nowrap">
          <span className="font-mono font-bold text-white">{appliedCount}</span>{' '}
          <span style={{ color: '#64748B' }}>applied</span>
        </span>
        <span className="mx-4" style={{ color: '#334155' }}>|</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
          <span className="font-mono font-bold text-white">
            {pendingFixes.filter((f) => f.priority === 'high').length}
          </span>{' '}
          <span style={{ color: '#64748B' }}>high priority</span>
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[6px] p-5 flex gap-5"
              style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex-1 space-y-2">
                <LoadingSkeleton height="12px" className="w-20" />
                <LoadingSkeleton height="18px" className="w-64" />
                <LoadingSkeleton height="12px" lines={2} />
              </div>
              <div className="flex flex-col gap-2 items-end">
                <LoadingSkeleton height="28px" className="w-16" />
                <LoadingSkeleton height="32px" className="w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : allFixes.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No pending fixes"
          description="You've reviewed all available fixes. We'll generate new ones after the next weekly scan."
          action={
            <button
              className="text-[13px] px-4 py-2 rounded"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
            >
              Check again
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          {LAYER_ORDER.map((layer) => {
            const meta = LAYER_META[layer];
            const group = allFixes.filter((f) => (f.fix_layer ?? 'content') === layer);
            const isAuthorityLayer = layer === 'authority';

            // Skip layers with no fixes unless it's authority (which always shows guidance)
            if (group.length === 0 && !isAuthorityLayer) return null;

            return (
              <div key={layer}>
                {/* Layer header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                  <span className="text-[13px] font-medium" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="text-[11px]" style={{ color: '#334155' }}>
                    — {meta.sublabel}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {isAuthorityLayer && authorityScore !== undefined && (
                      <span className="text-[10px] font-mono" style={{ color: '#F59E0B' }}>
                        {authorityScore.grounded_rate}% cited
                      </span>
                    )}
                    {group.length > 0 && (
                      <span className="text-[10px] font-mono" style={{ color: '#475569' }}>
                        {group.length} fix{group.length > 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {group.map((fix) => (
                    <FixCard
                      key={fix.id}
                      fix={fix}
                      onDismiss={handleDismiss}
                      topGaps={topGaps}
                      currentCitations={currentCitations}
                      totalQueriesRun={totalQueriesRun}
                      isStartHere={fix.id === startHereId}
                    />
                  ))}

                  {/* Authority guidance card when no authority fixes exist */}
                  {isAuthorityLayer && !hasAuthorityFix && (
                    <AuthorityGuidanceCard
                      brandName={brandName}
                      topCompetitor={topCompetitor}
                      topQuery={topQuery}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
