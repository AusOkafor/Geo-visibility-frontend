import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, RefreshCw, Scan, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import * as adminApi from '../../lib/adminApi';
import type { MerchantReviewStatus } from '../../lib/adminApi';

// ─── helpers ──────────────────────────────────────────────────────────────────

const APP_LABELS: Record<string, string> = {
  judge_me: 'Judge.me',
  yotpo: 'Yotpo',
  stamped: 'Stamped.io',
  loox: 'Loox',
  okendo: 'Okendo',
  growave: 'Growave',
  fera: 'Fera',
  ryviu: 'Ryviu',
  none: 'None detected',
};

const APP_COLORS: Record<string, string> = {
  judge_me: '#10B981',
  yotpo: '#3B82F6',
  stamped: '#8B5CF6',
  loox: '#F59E0B',
  okendo: '#EC4899',
  growave: '#06B6D4',
  fera: '#EF4444',
  ryviu: '#F97316',
  none: '#475569',
};

function appLabel(app: string | null): string {
  if (!app) return 'Not scanned';
  return APP_LABELS[app] ?? app;
}

function appColor(app: string | null): string {
  if (!app) return '#475569';
  return APP_COLORS[app] ?? '#94A3B8';
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const partial = rating - full;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="relative" style={{ width: 12, height: 12 }}>
          <Star size={12} style={{ color: '#1E293B', position: 'absolute' }} fill="#1E293B" />
          {i <= full ? (
            <Star size={12} style={{ color: '#F59E0B', position: 'absolute' }} fill="#F59E0B" />
          ) : i === full + 1 && partial > 0 ? (
            <div style={{ overflow: 'hidden', width: `${partial * 100}%`, position: 'absolute' }}>
              <Star size={12} style={{ color: '#F59E0B' }} fill="#F59E0B" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ─── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ merchants }: { merchants: MerchantReviewStatus[] }) {
  const total = merchants.length;
  const withReviews = merchants.filter((m) => m.total_reviews > 0).length;
  const schemaInjected = merchants.filter((m) => m.review_schema_injected).length;
  const unscanned = merchants.filter((m) => !m.reviews_last_scanned_at).length;

  const cards = [
    { label: 'Total Merchants', value: total, color: '#94A3B8', icon: null },
    { label: 'Have Reviews', value: withReviews, color: '#4ADE80', sub: `${total - withReviews} missing` },
    { label: 'Schema Injected', value: schemaInjected, color: '#00D4FF', sub: `${withReviews - schemaInjected} pending` },
    { label: 'Not Yet Scanned', value: unscanned, color: '#F59E0B', sub: 'need first scan' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-7">
      {cards.map(({ label, value, color, sub }) => (
        <div
          key={label}
          className="rounded-lg p-4"
          style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>{label}</p>
          <p className="text-[26px] font-bold" style={{ color }}>{value}</p>
          {sub && <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>{sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AdminReviewDetectorPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'reviews' | 'none' | 'pending'>('all');

  const { data: merchants, isLoading, refetch } = useQuery<MerchantReviewStatus[]>({
    queryKey: ['admin-reviews'],
    queryFn: adminApi.listMerchantReviews,
    staleTime: 30_000,
  });

  const scanAll = useMutation({
    mutationFn: adminApi.scanAllReviews,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success(`Queued ${data.queued} of ${data.total} merchants for review scan`);
    },
    onError: (err: Error) => toast.error(err.message || 'Scan failed'),
  });

  const scanOne = useMutation({
    mutationFn: (merchantId: number) => adminApi.scanMerchantReviews(merchantId),
    onSuccess: (_, merchantId) => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success(`Review scan queued for merchant ${merchantId}`);
    },
    onError: (err: Error) => toast.error(err.message || 'Scan failed'),
  });

  const list = merchants ?? [];

  const filtered = list.filter((m) => {
    if (filter === 'reviews') return m.total_reviews > 0;
    if (filter === 'none') return m.total_reviews === 0 && m.reviews_last_scanned_at !== null;
    if (filter === 'pending') return m.total_reviews > 0 && !m.review_schema_injected;
    return true;
  });

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Star size={20} style={{ color: '#F59E0B' }} />
            <h1 className="text-white font-bold text-[20px]">Review Schema Detector</h1>
          </div>
          <p className="text-[13px]" style={{ color: '#64748B' }}>
            Detect review apps, aggregate ratings, and inject <code className="text-[11px] px-1 rounded" style={{ background: '#1E293B', color: '#94A3B8' }}>aggregateRating</code> into each merchant's JSON-LD schema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refetch(); toast.info('Refreshing…'); }}
            className="rounded px-3 py-2 text-[12px] flex items-center gap-1.5 transition-opacity hover:opacity-80"
            style={{ background: '#1E293B', color: '#94A3B8' }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            onClick={() => scanAll.mutate()}
            disabled={scanAll.isPending}
            className="rounded px-4 py-2 text-[13px] font-semibold flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: '#F59E0B', color: '#000' }}
          >
            <Scan size={14} className={scanAll.isPending ? 'animate-spin' : ''} />
            {scanAll.isPending ? 'Queuing…' : 'Scan All Merchants'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {list.length > 0 && <SummaryCards merchants={list} />}

      {/* Filter tabs */}
      <div
        className="flex gap-1 mb-5 p-1 rounded-lg w-fit"
        style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {([
          { id: 'all', label: `All (${list.length})` },
          { id: 'reviews', label: `Has Reviews (${list.filter(m => m.total_reviews > 0).length})` },
          { id: 'none', label: `No Reviews (${list.filter(m => m.total_reviews === 0 && m.reviews_last_scanned_at).length})` },
          { id: 'pending', label: `Schema Pending (${list.filter(m => m.total_reviews > 0 && !m.review_schema_injected).length})` },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className="rounded px-3 py-1.5 text-[12px] font-medium transition-all"
            style={{
              background: filter === id ? '#1E293B' : 'transparent',
              color: filter === id ? '#E2E8F0' : '#64748B',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw size={13} className="animate-spin" style={{ color: '#64748B' }} />
            <span className="text-[12px]" style={{ color: '#64748B' }}>Loading merchant review status…</span>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-lg animate-pulse" style={{ height: 52, background: '#1E293B' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-lg p-6 text-center"
          style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[13px]" style={{ color: '#64748B' }}>
            {list.length === 0
              ? 'No active merchants found.'
              : 'No merchants match this filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0D0D0F', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Merchant', 'Review App', 'Avg Rating', 'Reviews', 'Schema', 'Last Scanned', ''].map((h) => (
                  <th key={h} className="text-left py-3 px-4 font-medium" style={{ color: '#64748B' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.merchant_id}
                  className="transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  {/* Merchant */}
                  <td className="py-3 px-4">
                    <p className="text-white font-medium">{m.brand_name || m.shop_domain}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>{m.shop_domain}</p>
                  </td>

                  {/* Review App */}
                  <td className="py-3 px-4">
                    {!m.reviews_last_scanned_at ? (
                      <span className="flex items-center gap-1.5 text-[11px]" style={{ color: '#475569' }}>
                        <Clock size={11} />
                        Not scanned
                      </span>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-semibold"
                        style={{
                          background: `${appColor(m.review_app)}18`,
                          color: appColor(m.review_app),
                          border: `1px solid ${appColor(m.review_app)}33`,
                        }}
                      >
                        {appLabel(m.review_app)}
                      </span>
                    )}
                  </td>

                  {/* Avg Rating */}
                  <td className="py-3 px-4">
                    {m.avg_rating ? (
                      <div className="flex items-center gap-2">
                        <StarRating rating={m.avg_rating} />
                        <span className="font-semibold" style={{ color: '#F59E0B' }}>
                          {m.avg_rating.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#475569' }}>—</span>
                    )}
                  </td>

                  {/* Review Count */}
                  <td className="py-3 px-4">
                    <span className={m.total_reviews > 0 ? 'text-white font-semibold' : ''} style={{ color: m.total_reviews > 0 ? undefined : '#475569' }}>
                      {m.total_reviews > 0 ? m.total_reviews.toLocaleString() : '0'}
                    </span>
                  </td>

                  {/* Schema Status */}
                  <td className="py-3 px-4">
                    {m.review_schema_injected ? (
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#4ADE80' }}>
                        <CheckCircle2 size={13} />
                        Injected
                      </div>
                    ) : m.total_reviews > 0 ? (
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#F59E0B' }}>
                        <ShieldCheck size={13} />
                        Pending
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#475569' }}>
                        <XCircle size={13} />
                        No reviews
                      </div>
                    )}
                  </td>

                  {/* Last Scanned */}
                  <td className="py-3 px-4" style={{ color: '#475569' }}>
                    {m.reviews_last_scanned_at
                      ? new Date(m.reviews_last_scanned_at).toLocaleDateString()
                      : '—'}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => scanOne.mutate(m.merchant_id)}
                      disabled={scanOne.isPending}
                      className="rounded px-3 py-1 text-[11px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ background: '#1E293B', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Scan size={11} />
                      Scan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
