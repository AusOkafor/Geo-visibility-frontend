import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFixes, useRejectFix, useQueryGaps, useVisibilityScores } from '../../hooks/useApi';
import type { Fix, QueryGap } from '../../types';

// Maps fix_layer → the 3-bucket problem frame shown on Visibility page
const LAYER_META: Record<string, { label: string; sublabel: string; color: string }> = {
  structure: {
    label: 'Layer 1 — Get Understood',
    sublabel: 'AI can\'t parse your catalog structure yet',
    color: '#A78BFA',
  },
  content: {
    label: 'Layer 2 — Get Found',
    sublabel: 'AI doesn\'t know your answers to buyer queries',
    color: '#00D4FF',
  },
  authority: {
    label: 'Layer 3 — Get Trusted',
    sublabel: 'AI needs external citations before recommending you',
    color: '#F59E0B',
  },
};
const LAYER_ORDER = ['structure', 'content', 'authority'] as const;

// Post-apply message per layer — shows what to do next
const NEXT_STEP: Record<string, string> = {
  structure: 'Structure indexed — apply content fixes next to target your query gaps',
  content: 'Content updated — earn 1 external mention to become citable across all platforms',
  authority: 'Authority signal added — AI is more likely to cite you now',
};

function FixCard({
  fix,
  onDismiss,
  topGaps,
  currentCitations,
  queriesPerPlatform,
}: {
  fix: Fix;
  onDismiss: (id: string) => void;
  topGaps: QueryGap[];
  currentCitations: number;
  queriesPerPlatform: number;
}) {
  const navigate = useNavigate();
  const layer = fix.fix_layer ?? 'content';
  const layerColor = LAYER_META[layer]?.color ?? '#64748B';
  const typeLabel =
    fix.fix_type === 'faq' ? 'FAQ Page' : fix.fix_type.charAt(0).toUpperCase() + fix.fix_type.slice(1);

  // Projected new citations: est_impact applied to per-platform query count
  const projectedGain =
    queriesPerPlatform > 0 ? Math.round(queriesPerPlatform * fix.est_impact / 100) : null;
  const projectedTotal =
    projectedGain !== null ? Math.min(currentCitations + projectedGain, queriesPerPlatform * 3) : null;

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
            {fix.priority === 'high' && fix.status === 'pending' && (
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
              {projectedTotal !== null && queriesPerPlatform > 0 && (
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
                Review & Apply
              </button>
              <button
                onClick={() => onDismiss(fix.id)}
                className="text-[12px] transition-colors"
                style={{ color: '#64748B' }}
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

// Static authority guidance card — shown when no authority fixes have been generated yet.
// Authority can't be fully automated (it requires external mentions), so we give actionable steps.
function AuthorityGuidanceCard() {
  return (
    <div
      className="rounded-[6px] p-5"
      style={{ background: '#111113', border: '1px solid rgba(245,158,11,0.2)' }}
    >
      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
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
          <p className="text-[13px] leading-relaxed mb-3" style={{ color: '#64748B' }}>
            Structure fixes alone won't get you recommended. AI platforms need to see your brand mentioned
            externally — in directories, editorial lists, and community discussions — before they'll cite you.
          </p>

          <div className="space-y-2">
            {[
              {
                action: 'Submit to category directories & roundups',
                example: 'Who What Wear, Refinery29, The Strategist "best of" lists',
                effort: '1–2 hrs',
              },
              {
                action: 'Reach out to authors of existing "best under $X" posts',
                example: 'Find articles already ranking for your top query gaps and ask to be included',
                effort: '2–4 hrs',
              },
              {
                action: 'Build a Reddit presence in your category',
                example: 'r/jewelry, r/frugalfemalefashion — answer questions, don\'t pitch',
                effort: 'Ongoing',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2 rounded"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <span
                  className="text-[12px] font-mono mt-0.5 flex-shrink-0"
                  style={{ color: '#F59E0B' }}
                >
                  0{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white">{item.action}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>
                    {item.example}
                  </p>
                </div>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#64748B' }}
                >
                  {item.effort}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end justify-start gap-2 flex-shrink-0 min-w-[130px]">
          <div className="text-right">
            <p className="font-mono font-bold text-[20px]" style={{ color: '#F59E0B' }}>
              +15%
            </p>
            <p className="text-[10px]" style={{ color: '#64748B' }}>
              estimated visibility gain
            </p>
          </div>
          <span
            className="text-[11px] px-2 py-1 rounded w-full text-center"
            style={{
              background: 'rgba(245,158,11,0.08)',
              color: '#F59E0B',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            Manual steps
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
  const rejectFix = useRejectFix();

  const allFixes = (fixes ?? []).filter((f) => f.status !== 'rejected');

  // Sum citations found and derive a per-platform query count for Before/After display
  const currentCitations = scores?.reduce((s, sc) => s + (sc.queries_hit ?? 0), 0) ?? 0;
  const queriesPerPlatform = scores?.reduce((max, sc) => Math.max(max, sc.queries_run ?? 0), 0) ?? 0;

  // Top query gaps to attach to content/structure cards
  const topGaps = (queryGaps ?? []).slice(0, 5);

  const hasAuthorityFix = allFixes.some((f) => (f.fix_layer ?? 'content') === 'authority');
  const pendingFixes = allFixes.filter((f) => f.status === 'pending');
  const totalImpact = pendingFixes.reduce((sum, f) => sum + f.est_impact, 0);
  const appliedCount = allFixes.filter((f) => f.status === 'applied' || f.status === 'manual').length;

  function handleDismiss(id: string) {
    rejectFix.mutate(id);
  }

  return (
    <div className="pb-20 md:pb-0">
      <PageHeader
        title="AI Visibility Fixes"
        subtitle={
          pendingFixes.filter((f) => f.priority === 'high').length > 0
            ? `${pendingFixes.filter((f) => f.priority === 'high').length} critical gap${pendingFixes.filter((f) => f.priority === 'high').length > 1 ? 's' : ''} — competitors are being cited instead of you`
            : 'AI-generated improvements to get you cited more — review and apply in one click'
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
                  {group.length > 0 && (
                    <span className="text-[10px] font-mono ml-auto" style={{ color: '#475569' }}>
                      {group.length} fix{group.length > 1 ? 'es' : ''}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {group.map((fix) => (
                    <FixCard
                      key={fix.id}
                      fix={fix}
                      onDismiss={handleDismiss}
                      topGaps={topGaps}
                      currentCitations={currentCitations}
                      queriesPerPlatform={queriesPerPlatform}
                    />
                  ))}

                  {/* Authority guidance card when no authority fixes exist */}
                  {isAuthorityLayer && !hasAuthorityFix && (
                    <AuthorityGuidanceCard />
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
