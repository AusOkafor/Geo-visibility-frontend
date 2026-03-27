import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFixes, useRejectFix } from '../../hooks/useApi';
import type { Fix } from '../../types';

const FIX_TYPE_COLORS: Record<string, string> = {
  description: '#00D4FF',
  faq: '#A78BFA',
  schema: '#F59E0B',
  listing: '#64748B',
};


function FixCard({ fix, onDismiss }: { fix: Fix; onDismiss: (id: string) => void }) {
  const navigate = useNavigate();
  const typeColor = FIX_TYPE_COLORS[fix.fix_type] ?? '#64748B';

  return (
    <div
      className="rounded-[6px] p-5 flex gap-5 transition-all duration-200 hover:border-white/10"
      style={{
        background: '#111113',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Left */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[11px] px-2 py-0.5 rounded capitalize"
            style={{
              border: `1px solid ${typeColor}44`,
              color: typeColor,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {fix.fix_type === 'faq' ? 'FAQ Page' : fix.fix_type.charAt(0).toUpperCase() + fix.fix_type.slice(1)}
          </span>
        </div>
        <p className="font-medium text-white text-[15px] mb-1.5">{fix.title}</p>
        <p
          className="text-[13px] leading-relaxed line-clamp-2"
          style={{ color: '#64748B' }}
        >
          {fix.explanation}
        </p>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end justify-center gap-2 flex-shrink-0 min-w-[120px]">
        {fix.status === 'pending' ? (
          <>
            <p className="font-mono font-bold text-[20px]" style={{ color: '#00D4FF' }}>
              +{fix.est_impact}%
            </p>
            <p className="text-[10px] text-right" style={{ color: '#64748B' }}>
              estimated visibility gain
            </p>
            <button
              onClick={() => navigate(`/dashboard/fixes/${fix.id}`)}
              className="text-[13px] font-medium px-3 py-1.5 rounded transition-all hover:brightness-110"
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
          <div className="text-right">
            <span className="text-[12px]" style={{ color: '#64748B' }}>Dismissed</span>
            <br />
            <button className="text-[11px]" style={{ color: '#00D4FF' }}>Restore</button>
          </div>
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
  );
}

const PRIORITY_LABELS = { high: 'HIGH PRIORITY', medium: 'MEDIUM PRIORITY', low: 'LOW PRIORITY' };
const PRIORITY_ORDER: Fix['priority'][] = ['high', 'medium', 'low'];

export function FixesPage() {
  const [filter, setFilter] = useState<'all' | 'high'>('all');
  const { data: fixes, isLoading } = useFixes('pending');
  const rejectFix = useRejectFix();

  const allFixes = fixes ?? [];
  const filtered = filter === 'high' ? allFixes.filter((f) => f.priority === 'high') : allFixes;

  function handleDismiss(id: string) {
    rejectFix.mutate(id);
  }
  const totalImpact = allFixes.reduce((sum, f) => sum + f.est_impact, 0);

  return (
    <div className="pb-20 md:pb-0">
      <PageHeader
        title="AI Visibility Fixes"
        subtitle="AI-generated improvements to get you cited more — review and apply in one click"
        action={
          <div className="flex gap-2">
            {(['all', 'high'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-[12px] font-medium px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: filter === f ? '#00D4FF' : 'rgba(255,255,255,0.05)',
                  color: filter === f ? '#0A0A0B' : '#64748B',
                }}
              >
                {f === 'all' ? 'All fixes' : 'High priority'}
              </button>
            ))}
          </div>
        }
      />

      {/* Impact summary bar */}
      <div
        className="flex flex-wrap items-center gap-0 rounded-[6px] px-5 py-3 mb-6 text-[13px]"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-white whitespace-nowrap">
          <span className="font-mono font-bold">{allFixes.length}</span>{' '}
          <span style={{ color: '#64748B' }}>fixes available</span>
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
          <span className="font-mono font-bold text-white">0</span>{' '}
          <span style={{ color: '#64748B' }}>applied</span>
        </span>
        <span className="mx-4" style={{ color: '#334155' }}>|</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
          <span className="font-mono font-bold text-white">
            {allFixes.filter((f) => f.priority === 'high').length}
          </span>{' '}
          <span style={{ color: '#64748B' }}>high priority</span>
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
      ) : filtered.length === 0 ? (
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
        <div className="space-y-6">
          {PRIORITY_ORDER.filter((p) => filtered.some((f) => f.priority === p)).map((priority) => {
            const group = filtered.filter((f) => f.priority === priority);
            if (!group.length) return null;
            const dotColor = priority === 'high' ? '#EF4444' : priority === 'medium' ? '#F59E0B' : '#00D4FF';
            return (
              <div key={priority}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
                  <span
                    className="text-[11px] font-mono uppercase tracking-widest"
                    style={{ color: dotColor }}
                  >
                    {PRIORITY_LABELS[priority]} ({group.length})
                  </span>
                </div>
                <div className="space-y-3">
                  {group.map((fix) => (
                    <FixCard key={fix.id} fix={fix} onDismiss={handleDismiss} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
