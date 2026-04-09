import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck, RefreshCw, AlertTriangle, CheckCircle2,
  Package, Layers, FileText, ChevronDown, ChevronUp,
  ExternalLink, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAuditProgress,
  useAuditProducts,
  useAuditCollections,
  useAuditPages,
  useRefreshAudit,
  useMerchant,
} from '../../hooks/useApi';
import type { ProductAudit, CollectionAudit, PageAudit } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract numeric ID from a Shopify GID, e.g. "gid://shopify/Product/12345" → "12345" */
function gidToId(gid: string): string {
  return gid?.split('/').pop() ?? gid;
}

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
        cx={48} cy={48} r={radius}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={48} y={48} textAnchor="middle" fill="white" fontSize={17} fontWeight={700}
        fontFamily="DM Sans, sans-serif" dy="0.35em">
        {Math.round(score)}%
      </text>
    </svg>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const good = total - value;
  const pct = total > 0 ? Math.round((good / total) * 100) : 100;
  return (
    <div
      className="flex flex-col gap-1 rounded-lg px-4 py-3"
      style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span style={{ color: '#64748B', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span style={{ color: 'white', fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{good}</span>
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
      <span style={{ color: '#64748B', fontSize: 11, minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
    </div>
  );
}

// ── Word-count cell ───────────────────────────────────────────────────────────
// Monospace font prevents DM Sans rendering "0" as "O" at small sizes

function Wc({ value, warn }: { value: number; warn: boolean }) {
  return (
    <span style={{
      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      color: warn ? '#EF4444' : '#94A3B8',
    }}>
      {value}w
    </span>
  );
}

// ── Products table ────────────────────────────────────────────────────────────

function ProductsTable({ items, shopDomain }: { items: ProductAudit[]; shopDomain?: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 5);

  if (items.length === 0) {
    return <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>All products look good.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Product', 'Words', 'Completeness', 'Missing', ''].map((h) => (
                <th key={h} className="pb-2 pr-4 text-[11px] font-medium" style={{ color: '#64748B' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const editUrl = shopDomain
                ? `https://${shopDomain}/admin/products/${gidToId(p.product_id)}`
                : undefined;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="py-2.5 pr-4">
                    <span className="text-[13px] font-medium text-white line-clamp-1">{p.product_title}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <Wc value={p.current_description_words} warn={p.current_description_words < 50} />
                  </td>
                  <td className="py-2.5 pr-4" style={{ minWidth: 120 }}>
                    <CompletenessBar score={p.completeness_score} />
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {p.missing_material_info && <Flag label="Material" />}
                      {p.missing_sizing_info && <Flag label="Sizing" />}
                      {p.missing_care_instructions && <Flag label="Care" />}
                      {p.current_description_words === 0 && <Flag label="No desc" />}
                    </div>
                  </td>
                  <td className="py-2.5">
                    {editUrl && (
                      <a
                        href={editUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px]"
                        style={{ color: '#64748B' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#00D4FF')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                      >
                        Edit <ExternalLink size={10} />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {items.length > 5 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 flex items-center gap-1 text-[12px]"
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

function CollectionsTable({ items, shopDomain }: { items: CollectionAudit[]; shopDomain?: string }) {
  if (items.length === 0) {
    return <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>All collections have descriptions.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Collection', 'Products', 'Words', 'Status', ''].map((h) => (
              <th key={h} className="pb-2 pr-4 text-[11px] font-medium" style={{ color: '#64748B' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const editUrl = shopDomain
              ? `https://${shopDomain}/admin/collections/${gidToId(c.collection_id)}`
              : undefined;
            return (
              <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="py-2.5 pr-4">
                  <span className="text-[13px] font-medium text-white">{c.collection_title}</span>
                </td>
                <td className="py-2.5 pr-4">
                  <span className="text-[12px]" style={{ color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>{c.product_count}</span>
                </td>
                <td className="py-2.5 pr-4">
                  <Wc value={c.current_description_words} warn={c.current_description_words < 50} />
                </td>
                <td className="py-2.5 pr-4">
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
                <td className="py-2.5">
                  <div className="flex items-center gap-3">
                    {c.ai_description_eligible && !c.fix_applied && (
                      <Link
                        to="/dashboard/fixes"
                        className="inline-flex items-center gap-1 text-[11px]"
                        style={{ color: '#A78BFA' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#C4B5FD')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#A78BFA')}
                      >
                        <Zap size={10} /> View Fix
                      </Link>
                    )}
                    {editUrl && (
                      <a
                        href={editUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px]"
                        style={{ color: '#64748B' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#00D4FF')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                      >
                        Edit <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
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

function PagesTable({ items, shopDomain }: { items: PageAudit[]; shopDomain?: string }) {
  if (items.length === 0) {
    return <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>No pages need attention.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Page', 'Type', 'Words', 'Status', ''].map((h) => (
              <th key={h} className="pb-2 pr-4 text-[11px] font-medium" style={{ color: '#64748B' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((p) => {
            const editUrl = shopDomain && p.page_id
              ? `https://${shopDomain}/admin/pages/${gidToId(p.page_id)}`
              : undefined;
            return (
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
                  {p.is_placeholder
                    ? <span style={{ color: '#64748B', fontSize: 12 }}>—</span>
                    : <Wc value={p.word_count} warn={p.word_count < 100} />
                  }
                </td>
                <td className="py-2.5 pr-4">
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
                <td className="py-2.5">
                  <div className="flex items-center gap-3">
                    {p.ai_content_eligible && !p.fix_applied && (
                      <Link
                        to="/dashboard/fixes"
                        className="inline-flex items-center gap-1 text-[11px]"
                        style={{ color: '#A78BFA' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#C4B5FD')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#A78BFA')}
                      >
                        <Zap size={10} /> View Fix
                      </Link>
                    )}
                    {editUrl && (
                      <a
                        href={editUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px]"
                        style={{ color: '#64748B' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#00D4FF')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                      >
                        Edit <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
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
    <div className="rounded-xl p-5" style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}>
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

  const { data: merchant } = useMerchant();
  const shopDomain = merchant?.shop_domain;

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

  useEffect(() => {
    if (!polling) return;
    pollStop.current = setTimeout(() => setPolling(false), POLL_TIMEOUT_MS);
    return () => { if (pollStop.current) clearTimeout(pollStop.current); };
  }, [polling]);

  const isLoading = loadingProgress || loadingProducts || loadingCollections || loadingPages;

  function handleRefresh() {
    refresh.mutate(undefined, {
      onSuccess: () => { toast.success('Audit queued — refreshing results every 5s'); setPolling(true); },
      onError: () => toast.error('Failed to queue audit'),
    });
  }

  const score = progress?.overall_completeness_score ?? 0;

  const productsNeedingAttention = products?.filter((p) => p.needs_attention && !p.fix_applied) ?? [];
  const collectionsNeedingAttention = collections?.filter((c) => c.needs_attention && !c.fix_applied) ?? [];
  const pagesNeedingAttention = pages?.filter((p) => p.needs_attention && !p.fix_applied) ?? [];

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
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium"
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full border-2 border-transparent"
            style={{ width: 28, height: 28, borderTopColor: '#00D4FF' }} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !progress && (
        <div className="rounded-xl p-10 flex flex-col items-center gap-4 text-center"
          style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}>
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
              <StatPill label="Products" value={progress.products_needing_attention} total={progress.total_products} color="#00D4FF" />
              <StatPill label="Collections" value={progress.collections_needing_attention} total={progress.total_collections} color="#A78BFA" />
              <StatPill label="Pages" value={progress.pages_needing_attention} total={progress.total_pages_audited} color="#F59E0B" />
            </div>
          </div>

          {/* Products */}
          <SectionCard icon={Package} title="Products" count={productBadgeCount}>
            {products == null && productBadgeCount > 0 ? (
              <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>
                {productBadgeCount} products need attention — re-run audit to load details.
              </p>
            ) : (
              <ProductsTable items={productsNeedingAttention} shopDomain={shopDomain} />
            )}
          </SectionCard>

          {/* Collections */}
          <SectionCard icon={Layers} title="Collections" count={collectionBadgeCount}>
            {collections == null && collectionBadgeCount > 0 ? (
              <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>
                {collectionBadgeCount} collections need attention — re-run audit to load details.
              </p>
            ) : (
              <CollectionsTable items={collectionsNeedingAttention} shopDomain={shopDomain} />
            )}
          </SectionCard>

          {/* Pages */}
          <SectionCard icon={FileText} title="Pages" count={pageBadgeCount}>
            {pages == null && pageBadgeCount > 0 ? (
              <p className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>
                {pageBadgeCount} pages need attention — re-run audit to load details.
              </p>
            ) : (
              <PagesTable items={pagesNeedingAttention} shopDomain={shopDomain} />
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
