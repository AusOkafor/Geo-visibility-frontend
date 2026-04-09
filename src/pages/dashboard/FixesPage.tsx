import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFixes, useRejectFix, useQueryGaps } from '../../hooks/useApi';
import type { Fix, QueryGap } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Human-readable label for each fix type */
const FIX_TYPE_LABEL: Record<string, string> = {
  collection_description: 'Collection Description',
  description:            'Product Description',
  faq:                    'FAQ Page',
  schema:                 'Schema',
  about_page:             'About Page',
  size_guide:             'Size Guide',
  listing:                'Directory Listing',
  merchant_center_setup:  'Google Merchant Center',
};

function fixLabel(type: string) {
  return FIX_TYPE_LABEL[type] ?? type.replace(/_/g, ' ');
}

// ── Individual fix card ───────────────────────────────────────────────────────

function FixCard({
  fix,
  topGaps,
  onDismiss,
  isStartHere,
  compact = false,
}: {
  fix: Fix;
  topGaps: QueryGap[];
  onDismiss: (id: string) => void;
  isStartHere?: boolean;
  compact?: boolean;
}) {
  const navigate = useNavigate();

  const isPending = fix.status === 'pending';
  const isApplied = fix.status === 'applied' || fix.status === 'manual';
  const isApplying = fix.status === 'applying' || fix.status === 'approved';

  return (
    <div
      className="rounded-[6px] p-4 transition-all"
      style={{ background: compact ? '#0D0D0F' : '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex gap-4">
        {/* Left: content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[11px] px-2 py-0.5 rounded capitalize"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
            >
              {fixLabel(fix.fix_type)}
            </span>
            {isStartHere && isPending && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.25)' }}
              >
                ⚡ Start here
              </span>
            )}
          </div>

          <p className="font-medium text-white text-[14px] mb-1">{fix.title}</p>

          {!compact && (
            <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: '#64748B' }}>
              {fix.explanation}
            </p>
          )}

          {/* Top query gaps — only show on pending, non-compact */}
          {!compact && isPending && topGaps.length > 0 && (
            <div className="mt-2.5">
              <p className="text-[11px] mb-1.5" style={{ color: '#475569' }}>
                Targets queries you're missing:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topGaps.slice(0, 3).map((gap, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded"
                    style={{ background: 'rgba(239,68,68,0.07)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}
                  >
                    "{gap.query}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Applied notice */}
          {isApplied && !compact && (
            <p className="mt-2 text-[12px]" style={{ color: '#10B981' }}>
              ✓ Applied — run a new scan to measure citation changes
            </p>
          )}
        </div>

        {/* Right: impact + actions */}
        <div className="flex flex-col items-end justify-start gap-2 flex-shrink-0">
          {isPending && (
            <>
              <div className="text-right">
                <p className="font-mono font-bold text-[18px]" style={{ color: '#00D4FF' }}>
                  +{fix.est_impact}%
                </p>
                <p className="text-[10px]" style={{ color: '#64748B' }}>est. visibility</p>
              </div>
              <button
                onClick={() => navigate(`/dashboard/fixes/${fix.id}`)}
                className="text-[12px] font-medium px-3 py-1.5 rounded text-center transition-all hover:brightness-110 whitespace-nowrap"
                style={{ background: '#00D4FF', color: '#0A0A0B', minWidth: 90 }}
              >
                Apply Fix
              </button>
              <button
                onClick={() => onDismiss(fix.id)}
                className="text-[11px]"
                style={{ color: '#334155' }}
              >
                Dismiss
              </button>
            </>
          )}
          {isApplied && (
            <span
              className="text-[12px] flex items-center gap-1.5 px-2 py-1 rounded"
              style={{ color: '#10B981', background: 'rgba(16,185,129,0.08)' }}
            >
              <CheckCircle2 size={12} /> Applied
            </span>
          )}
          {isApplying && (
            <span className="text-[12px] px-2 py-1 rounded" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.08)' }}>
              ⟳ Applying…
            </span>
          )}
          {fix.status === 'rejected' && (
            <span className="text-[11px]" style={{ color: '#475569' }}>Dismissed</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Grouped collection card ───────────────────────────────────────────────────

function CollectionGroupCard({
  fixes,
  topGaps,
  onDismiss,
  isStartHere,
}: {
  fixes: Fix[];
  topGaps: QueryGap[];
  onDismiss: (id: string) => void;
  isStartHere?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const pending = fixes.filter((f) => f.status === 'pending');
  const applied = fixes.filter((f) => f.status === 'applied' || f.status === 'manual');

  // Extract collection name from title ("Add description to X collection" → "X")
  function collectionName(title: string) {
    return title.replace(/^Add description to /i, '').replace(/ collection$/i, '').trim();
  }

  if (pending.length === 0 && applied.length === 0) return null;

  return (
    <div
      className="rounded-[6px] overflow-hidden"
      style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[11px] px-2 py-0.5 rounded"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
              >
                Collection Descriptions
              </span>
              {isStartHere && pending.length > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                  style={{ background: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.25)' }}
                >
                  ⚡ Start here
                </span>
              )}
            </div>

            <p className="font-medium text-white text-[14px] mb-1">
              {pending.length > 0
                ? `Add descriptions to ${pending.length} collection${pending.length > 1 ? 's' : ''}`
                : `${applied.length} collection description${applied.length > 1 ? 's' : ''} applied`}
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: '#64748B' }}>
              Collection descriptions are ChatGPT's #1 signal for category queries — AI reads them to understand what products you sell.
            </p>

            {/* Collection name pills */}
            {pending.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {pending.slice(0, 5).map((f) => (
                  <span
                    key={f.id}
                    className="text-[11px] px-2 py-0.5 rounded"
                    style={{ background: 'rgba(167,139,250,0.08)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.15)' }}
                  >
                    {collectionName(f.title)}
                  </span>
                ))}
                {pending.length > 5 && (
                  <span className="text-[11px] px-2 py-0.5 rounded" style={{ color: '#64748B' }}>
                    +{pending.length - 5} more
                  </span>
                )}
              </div>
            )}

            {/* Query gaps */}
            {topGaps.length > 0 && pending.length > 0 && (
              <div className="mt-2.5">
                <p className="text-[11px] mb-1.5" style={{ color: '#475569' }}>Targets queries you're missing:</p>
                <div className="flex flex-wrap gap-1.5">
                  {topGaps.slice(0, 3).map((gap, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded"
                      style={{ background: 'rgba(239,68,68,0.07)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      "{gap.query}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: impact + expand */}
          <div className="flex flex-col items-end justify-start gap-2 flex-shrink-0">
            {pending.length > 0 && (
              <>
                <div className="text-right">
                  <p className="font-mono font-bold text-[18px]" style={{ color: '#00D4FF' }}>
                    +{pending[0]?.est_impact ?? 25}%
                  </p>
                  <p className="text-[10px]" style={{ color: '#64748B' }}>est. per fix</p>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/fixes/${pending[0].id}`)}
                  className="text-[12px] font-medium px-3 py-1.5 rounded text-center transition-all hover:brightness-110 whitespace-nowrap"
                  style={{ background: '#00D4FF', color: '#0A0A0B', minWidth: 90 }}
                >
                  Apply First
                </button>
              </>
            )}
            {applied.length > 0 && pending.length === 0 && (
              <span className="text-[12px] flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: '#10B981', background: 'rgba(16,185,129,0.08)' }}>
                <CheckCircle2 size={12} /> All applied
              </span>
            )}
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-[11px]"
              style={{ color: '#475569' }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Collapse' : `See all ${fixes.length}`}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded individual cards */}
      {expanded && (
        <div className="border-t space-y-px" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {fixes.map((f) => (
            <FixCard
              key={f.id}
              fix={f}
              topGaps={[]}
              onDismiss={onDismiss}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function FixesPage() {
  const { data: fixes, isLoading } = useFixes('');
  const { data: queryGaps } = useQueryGaps();
  const rejectFix = useRejectFix();

  // Exclude rejected and authority-layer fixes
  const allFixes = (fixes ?? []).filter(
    (f) => f.status !== 'rejected' && (f.fix_layer ?? 'content') !== 'authority'
  );

  const topGaps = (queryGaps ?? []).slice(0, 5);

  const pendingFixes = allFixes.filter((f) => f.status === 'pending');
  const appliedFixes = allFixes.filter((f) => f.status === 'applied' || f.status === 'manual' || f.status === 'applying' || f.status === 'approved');

  // Split out collection fixes to group them
  const collectionFixes = pendingFixes.filter((f) => f.fix_type === 'collection_description');
  const appliedCollectionFixes = appliedFixes.filter((f) => f.fix_type === 'collection_description');
  const allCollectionFixes = [...collectionFixes, ...appliedCollectionFixes];

  // Other pending fixes sorted by est_impact desc
  const otherPending = pendingFixes
    .filter((f) => f.fix_type !== 'collection_description')
    .sort((a, b) => b.est_impact - a.est_impact);

  // Other applied fixes
  const otherApplied = appliedFixes.filter((f) => f.fix_type !== 'collection_description');

  const startHereId = collectionFixes.length > 0
    ? '__collections__'
    : otherPending[0]?.id ?? null;

  function handleDismiss(id: string) {
    rejectFix.mutate(id);
  }

  const missingQueryCount = (queryGaps ?? []).length;

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
          <span className="font-mono font-bold text-white">{appliedFixes.length}</span>{' '}
          <span style={{ color: '#64748B' }}>applied</span>
        </span>
        {pendingFixes.filter((f) => f.priority === 'high').length > 0 && (
          <>
            <span className="mx-4" style={{ color: '#334155' }}>|</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
              <span className="font-mono font-bold text-white">
                {pendingFixes.filter((f) => f.priority === 'high').length}
              </span>{' '}
              <span style={{ color: '#64748B' }}>high priority</span>
            </span>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[6px] p-5" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="space-y-2">
                <LoadingSkeleton height="12px" className="w-20" />
                <LoadingSkeleton height="18px" className="w-64" />
                <LoadingSkeleton height="12px" lines={2} />
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
        <div className="space-y-3">
          {/* Grouped collection card */}
          {allCollectionFixes.length > 0 && (
            <CollectionGroupCard
              fixes={allCollectionFixes}
              topGaps={topGaps}
              onDismiss={handleDismiss}
              isStartHere={startHereId === '__collections__'}
            />
          )}

          {/* Other pending fixes — sorted by impact */}
          {otherPending.map((fix) => (
            <FixCard
              key={fix.id}
              fix={fix}
              topGaps={topGaps}
              onDismiss={handleDismiss}
              isStartHere={fix.id === startHereId}
            />
          ))}

          {/* Applied section */}
          {otherApplied.length > 0 && (
            <div className="pt-4">
              <p className="text-[11px] mb-2 font-medium" style={{ color: '#475569' }}>Applied</p>
              <div className="space-y-2">
                {otherApplied.map((fix) => (
                  <FixCard key={fix.id} fix={fix} topGaps={[]} onDismiss={handleDismiss} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
