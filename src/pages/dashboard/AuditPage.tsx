import { useState, useEffect, useRef } from 'react';
import { ClipboardCheck, RefreshCw, AlertTriangle, CheckCircle2, Package, Layers, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAuditProgress,
  useAuditProducts,
  useAuditCollections,
  useAuditPages,
  useRefreshAudit,
} from '../../hooks/useApi';
import type { ProductAudit, CollectionAudit, PageAudit } from '../../types';

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <svg width={96} height={96} viewBox="0 0 96 96">
      <circle cx={48} cy={48} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
      <circle
        cx={48}
        cy={48}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={48} y={53} textAnchor="middle" fill="white" fontSize={18} fontWeight={700} fontFamily="DM Sans, sans-serif">
        {Math.round(score)}
      </text>
    </svg>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round(((total - value) / total) * 100) : 100;
  return (
    <div
      className="flex flex-col gap-1 rounded-lg px-4 py-3"
      style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span style={{ color: '#64748B', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{total - value}</span>
        <span style={{ color: '#64748B', fontSize: 12 }}>/ {total} good</span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

// ── Flag badge ────────────────────────────────────────────────────────────────

function Flag({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: '#F59E0B22', color: '#F59E0B', border: '1px solid #F59E0B44' }}
    >
      {label}
    </span>
  );
}

// ── Completeness bar ──────────────────────────────────────────────────────────

function CompletenessBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span style={{ color: '#64748B', fontSize: 11, minWidth: 28 }}>{pct}%</span>
    </div>
  );
}

// ── Products table ────────────────────────────────────────────────────────────

function ProductsTable({ items }: { items: ProductAudit[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 5);

  if (items.length === 0) {
    return (
      <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>
        All products look good.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Product', 'Words', 'Completeness', 'Missing'].map((h) => (
                <th key={h} className="pb-2 pr-4 text-[11px] font-medium" style={{ color: '#64748B' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr
                key={p.id}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <td className="py-2.5 pr-4">
                  <span className="text-[13px] font-medium text-white line-clamp-1">{p.product_title}</span>
                </td>
                <td className="py-2.5 pr-4">
                  <span
                    className="text-[12px]"
                    style={{ color: p.current_description_words < 50 ? '#EF4444' : '#94A3B8' }}
                  >
                    {p.current_description_words}w
                  </span>
                </td>
                <td className="py-2.5 pr-4" style={{ minWidth: 120 }}>
                  <CompletenessBar score={p.completeness_score} />
                </td>
                <td className="py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {p.missing_material_info && <Flag label="Material" />}
                    {p.missing_sizing_info && <Flag label="Sizing" />}
                    {p.missing_care_instructions && <Flag label="Care" />}
                    {p.current_description_words === 0 && <Flag label="No desc" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length > 5 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 flex items-center gap-1 text-[12px] transition-colors"
          style={{ color: '#64748B' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#00D4FF')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Show less' : `Show ${items.length - 5} more`}
        </button>
      )}
    </div>
  );
}

// ── Collections table ─────────────────────────────────────────────────────────

function CollectionsTable({ items }: { items: CollectionAudit[] }) {
  if (items.length === 0) {
    return (
      <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>
        All collections have descriptions.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Collection', 'Products', 'Words', 'Status'].map((h) => (
              <th key={h} className="pb-2 pr-4 text-[11px] font-medium" style={{ color: '#64748B' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td className="py-2.5 pr-4">
                <span className="text-[13px] font-medium text-white">{c.collection_title}</span>
              </td>
              <td className="py-2.5 pr-4">
                <span className="text-[12px]" style={{ color: '#94A3B8' }}>{c.product_count}</span>
              </td>
              <td className="py-2.5 pr-4">
                <span
                  className="text-[12px]"
                  style={{ color: c.current_description_words < 50 ? '#EF4444' : '#94A3B8' }}
                >
                  {c.current_description_words}w
                </span>
              </td>
              <td className="py-2.5">
                {c.fix_applied ? (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: '#10B981' }}>
                    <CheckCircle2 size={12} /> Fixed
                  </span>
                ) : c.ai_description_eligible ? (
                  <Flag label="Needs description" />
                ) : (
                  <span className="text-[11px]" style={{ color: '#64748B' }}>OK</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pages table ───────────────────────────────────────────────────────────────

const PAGE_TYPE_LABELS: Record<string, string> = {
  faq: 'FAQ',
  about: 'About Us',
  size_guide: 'Size Guide',
  shipping: 'Shipping',
  returns: 'Returns',
  contact: 'Contact',
};

function PagesTable({ items }: { items: PageAudit[] }) {
  if (items.length === 0) {
    return (
      <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>
        No pages need attention.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Page', 'Type', 'Words', 'Status'].map((h) => (
              <th key={h} className="pb-2 pr-4 text-[11px] font-medium" style={{ color: '#64748B' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  {p.is_placeholder && (
                    <span
                      className="text-[10px] px-1 py-0.5 rounded"
                      style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444' }}
                    >
                      Missing
                    </span>
                  )}
                  <span className="text-[13px] font-medium text-white">{p.page_title}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4">
                <span className="text-[12px]" style={{ color: '#94A3B8' }}>
                  {PAGE_TYPE_LABELS[p.page_type] ?? p.page_type}
                </span>
              </td>
              <td className="py-2.5 pr-4">
                <span
                  className="text-[12px]"
                  style={{ color: p.word_count < 100 ? '#EF4444' : '#94A3B8' }}
                >
                  {p.is_placeholder ? '—' : `${p.word_count}w`}
                </span>
              </td>
              <td className="py-2.5">
                {p.fix_applied ? (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: '#10B981' }}>
                    <CheckCircle2 size={12} /> Fixed
                  </span>
                ) : p.needs_attention ? (
                  <Flag label={p.is_placeholder ? 'Page missing' : 'Needs content'} />
                ) : (
                  <span className="text-[11px]" style={{ color: '#64748B' }}>OK</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: '#0D0D0F',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: '#00D4FF' }} />
          <span className="text-[14px] font-semibold text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {title}
          </span>
        </div>
        {count !== undefined && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{
              background: count > 0 ? '#F59E0B22' : '#10B98122',
              color: count > 0 ? '#F59E0B' : '#10B981',
              border: `1px solid ${count > 0 ? '#F59E0B44' : '#10B98144'}`,
            }}
          >
            {count > 0 ? `${count} need attention` : 'All good'}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AuditPage() {
  const [polling, setPolling] = useState(false);
  const pollStop = useRef<ReturnType<typeof setTimeout> | null>(null);

  const POLL_MS = 5_000;
  const POLL_TIMEOUT_MS = 90_000;

  const { data: progress, isLoading: loadingProgress } = useAuditProgress({
    refetchInterval: polling ? POLL_MS : false,
  });
  const { data: products, isLoading: loadingProducts } = useAuditProducts({
    refetchInterval: polling ? POLL_MS : false,
  });
  const { data: collections, isLoading: loadingCollections } = useAuditCollections({
    refetchInterval: polling ? POLL_MS : false,
  });
  const { data: pages, isLoading: loadingPages } = useAuditPages({
    refetchInterval: polling ? POLL_MS : false,
  });
  const refresh = useRefreshAudit();

  // Stop polling once we hit the timeout ceiling
  useEffect(() => {
    if (!polling) return;
    pollStop.current = setTimeout(() => setPolling(false), POLL_TIMEOUT_MS);
    return () => {
      if (pollStop.current) clearTimeout(pollStop.current);
    };
  }, [polling]);

  const isLoading = loadingProgress || loadingProducts || loadingCollections || loadingPages;

  function handleRefresh() {
    refresh.mutate(undefined, {
      onSuccess: () => {
        toast.success('Audit queued — refreshing results every 5s');
        setPolling(true);
      },
      onError: () => toast.error('Failed to queue audit'),
    });
  }

  const score = progress?.overall_completeness_score ?? 0;

  // Use detail rows when available, fall back to progress snapshot counts for badges
  const productsNeedingAttention = products?.filter((p) => p.needs_attention && !p.fix_applied) ?? [];
  const collectionsNeedingAttention = collections?.filter((c) => c.needs_attention && !c.fix_applied) ?? [];
  const pagesNeedingAttention = pages?.filter((p) => p.needs_attention && !p.fix_applied) ?? [];

  // Badge counts: prefer real detail rows; fall back to snapshot when detail query hasn't loaded yet
  const productBadgeCount = products != null ? productsNeedingAttention.length : (progress?.products_needing_attention ?? 0);
  const collectionBadgeCount = collections != null ? collectionsNeedingAttention.length : (progress?.collections_needing_attention ?? 0);
  const pageBadgeCount = pages != null ? pagesNeedingAttention.length : (progress?.pages_needing_attention ?? 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClipboardCheck size={20} style={{ color: '#00D4FF' }} />
          <div>
            <h1 className="text-[18px] font-semibold text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Content Audit
            </h1>
            <p className="text-[12px]" style={{ color: '#64748B' }}>
              AI-readiness of your products, collections, and pages
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refresh.isPending}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors"
          style={{
            background: refresh.isPending ? '#1A1A1E' : '#00D4FF18',
            border: '1px solid rgba(0,212,255,0.3)',
            color: refresh.isPending ? '#64748B' : '#00D4FF',
            cursor: refresh.isPending ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} className={refresh.isPending ? 'animate-spin' : ''} />
          {refresh.isPending ? 'Queuing…' : 'Re-run Audit'}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div
            className="animate-spin rounded-full border-2 border-transparent"
            style={{ width: 28, height: 28, borderTopColor: '#00D4FF' }}
          />
        </div>
      )}

      {/* Empty state — no audit run yet */}
      {!isLoading && !progress && (
        <div
          className="rounded-xl p-10 flex flex-col items-center gap-4 text-center"
          style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <AlertTriangle size={32} style={{ color: '#F59E0B' }} />
          <div>
            <p className="text-[15px] font-semibold text-white mb-1">No audit data yet</p>
            <p className="text-[13px]" style={{ color: '#64748B' }}>
              Click Re-run Audit to analyse your store for the first time.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && progress && (
        <>
          {/* Score overview */}
          <div
            className="rounded-xl p-5 flex flex-col sm:flex-row gap-6 items-center sm:items-start"
            style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <ScoreRing score={score} />
              <span className="text-[11px]" style={{ color: '#64748B' }}>Overall</span>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <StatPill
                label="Products"
                value={progress.products_needing_attention}
                total={progress.total_products}
                color="#00D4FF"
              />
              <StatPill
                label="Collections"
                value={progress.collections_needing_attention}
                total={progress.total_collections}
                color="#A78BFA"
              />
              <StatPill
                label="Pages"
                value={progress.pages_needing_attention}
                total={progress.total_pages_audited + progress.pages_needing_attention}
                color="#F59E0B"
              />
            </div>
          </div>

          {/* Products */}
          <SectionCard icon={Package} title="Products" count={productBadgeCount}>
            {products == null && (progress?.products_needing_attention ?? 0) > 0 ? (
              <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>
                {progress!.products_needing_attention} products need attention — re-run audit to load details.
              </p>
            ) : (
              <ProductsTable items={productsNeedingAttention} />
            )}
          </SectionCard>

          {/* Collections */}
          <SectionCard icon={Layers} title="Collections" count={collectionBadgeCount}>
            {collections == null && (progress?.collections_needing_attention ?? 0) > 0 ? (
              <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>
                {progress!.collections_needing_attention} collections need attention — re-run audit to load details.
              </p>
            ) : (
              <CollectionsTable items={collectionsNeedingAttention} />
            )}
          </SectionCard>

          {/* Pages */}
          <SectionCard icon={FileText} title="Pages" count={pageBadgeCount}>
            {pages == null && (progress?.pages_needing_attention ?? 0) > 0 ? (
              <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>
                {progress!.pages_needing_attention} pages need attention — re-run audit to load details.
              </p>
            ) : (
              <PagesTable items={pagesNeedingAttention} />
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
