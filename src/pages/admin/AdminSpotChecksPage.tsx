import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LogOut, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import * as adminApi from '../../lib/adminApi';
import type { SpotCheck } from '../../lib/adminApi';
import { AdminVerifyModal } from './AdminVerifyModal';

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
};

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: '#10B981',
  perplexity: '#A78BFA',
  gemini: '#F59E0B',
};

function pct(v: number | null): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function StatusBadge({ status }: { status: string }) {
  const isVerified = status === 'verified';
  return (
    <span
      className="px-2 py-0.5 rounded text-[11px] font-semibold"
      style={{
        background: isVerified ? '#0F2A1A' : '#1E1A0A',
        color: isVerified ? '#4ADE80' : '#F59E0B',
        border: `1px solid ${isVerified ? 'rgba(74,222,128,0.2)' : 'rgba(245,158,11,0.2)'}`,
      }}
    >
      {isVerified ? 'Verified' : 'Pending'}
    </span>
  );
}

function CreateSpotCheckForm({ onCreated }: { onCreated: () => void }) {
  const [merchantId, setMerchantId] = useState('');
  const [citationId, setCitationId] = useState('');

  const create = useMutation({
    mutationFn: () =>
      adminApi.createSpotCheck(Number(merchantId), Number(citationId)),
    onSuccess: () => {
      toast.success('Spot check created');
      setMerchantId('');
      setCitationId('');
      onCreated();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create spot check');
    },
  });

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <p className="text-white font-semibold text-[13px] mb-3">Create spot check</p>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-[11px] mb-1" style={{ color: '#64748B' }}>Merchant ID</label>
          <input
            type="number"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            className="rounded px-3 py-2 text-[13px] text-white outline-none w-36"
            style={{ background: '#161618', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <div>
          <label className="block text-[11px] mb-1" style={{ color: '#64748B' }}>Citation Record ID</label>
          <input
            type="number"
            value={citationId}
            onChange={(e) => setCitationId(e.target.value)}
            className="rounded px-3 py-2 text-[13px] text-white outline-none w-44"
            style={{ background: '#161618', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending || !merchantId || !citationId}
          className="flex items-center gap-1.5 rounded px-3 py-2 text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: '#00D4FF', color: '#000' }}
        >
          <Plus size={14} />
          {create.isPending ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  );
}

function AccuracyPanel({ merchantId }: { merchantId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-accuracy', merchantId],
    queryFn: () => adminApi.getAccuracyMetrics(merchantId),
    enabled: merchantId > 0,
  });

  if (merchantId <= 0) return null;

  if (isLoading) {
    return (
      <div className="rounded-lg p-4 flex items-center gap-2" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.07)', height: 72 }}>
        <RefreshCw size={13} className="animate-spin flex-shrink-0" style={{ color: '#64748B' }} />
        <span className="text-[12px]" style={{ color: '#64748B' }}>Loading accuracy metrics…</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="rounded-lg p-4"
        style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-[13px]" style={{ color: '#64748B' }}>No accuracy metrics yet — the daily validation worker generates these after running overnight.</p>
      </div>
    );
  }

  // Group by platform, take most recent
  const byPlatform: Record<string, typeof data[0]> = {};
  for (const m of data) {
    if (!byPlatform[m.platform] || m.date > byPlatform[m.platform].date) {
      byPlatform[m.platform] = m;
    }
  }

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#64748B' }}>
        Accuracy metrics (last 30 days)
      </p>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {Object.entries(byPlatform).map(([platform, m]) => (
          <div
            key={platform}
            className="rounded-lg p-4"
            style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[12px] font-semibold"
                style={{ color: PLATFORM_COLORS[platform] ?? '#94A3B8' }}
              >
                {PLATFORM_LABELS[platform] ?? platform}
              </span>
              <span className="text-[11px]" style={{ color: '#475569' }}>{m.date}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Precision', value: pct(m.avg_precision) },
                { label: 'Recall', value: pct(m.avg_recall) },
                { label: 'F1', value: pct(m.avg_f1) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px]" style={{ color: '#64748B' }}>{label}</p>
                  <p className="text-[14px] font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-center mt-2" style={{ color: '#475569' }}>
              {m.sample_size} samples
            </p>
            {/* F1 threshold indicator */}
            <div className="mt-3">
              <div className="rounded-full overflow-hidden" style={{ height: 4, background: '#1E293B' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, m.avg_f1 * 100)}%`,
                    background: m.avg_f1 >= 0.8 ? '#22C55E' : m.avg_f1 >= 0.7 ? '#F59E0B' : '#EF4444',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px]" style={{ color: '#475569' }}>0</span>
                <span className="text-[9px]" style={{ color: '#475569' }}>warn 80%</span>
                <span className="text-[9px]" style={{ color: '#475569' }}>100%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Historical table */}
      {data.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Date', 'Platform', 'Precision', 'Recall', 'F1', 'Samples'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: '#64748B' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 30).map((m, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-2 px-3" style={{ color: '#94A3B8' }}>{m.date}</td>
                  <td className="py-2 px-3">
                    <span style={{ color: PLATFORM_COLORS[m.platform] ?? '#94A3B8' }}>
                      {PLATFORM_LABELS[m.platform] ?? m.platform}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-white">{pct(m.avg_precision)}</td>
                  <td className="py-2 px-3 text-white">{pct(m.avg_recall)}</td>
                  <td className="py-2 px-3">
                    <span
                      style={{
                        color: m.avg_f1 >= 0.8 ? '#4ADE80' : m.avg_f1 >= 0.7 ? '#F59E0B' : '#EF4444',
                        fontWeight: 600,
                      }}
                    >
                      {pct(m.avg_f1)}
                    </span>
                  </td>
                  <td className="py-2 px-3" style={{ color: '#94A3B8' }}>{m.sample_size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminSpotChecksPage() {
  const navigate = useNavigate();
  const [merchantId, setMerchantId] = useState('7');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [selected, setSelected] = useState<SpotCheck | null>(null);

  const parsedMerchantId = Number(merchantId) || 0;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-spot-checks', parsedMerchantId],
    queryFn: () => adminApi.listSpotChecks(parsedMerchantId, 100),
    enabled: parsedMerchantId > 0,
    retry: false,
  });

  // Redirect to login on 401/503
  useEffect(() => {
    if (isError && (error as Error).message === 'UNAUTHORIZED') {
      localStorage.removeItem('admin_api_key');
      navigate('/admin', { replace: true });
    }
  }, [isError, error, navigate]);

  function handleLogout() {
    localStorage.removeItem('admin_api_key');
    navigate('/admin');
  }

  const filtered = (data ?? []).filter((sc) => {
    if (statusFilter === 'all') return true;
    return sc.status === statusFilter;
  });

  const pendingCount = (data ?? []).filter((sc) => sc.status === 'pending').length;
  const verifiedCount = (data ?? []).filter((sc) => sc.status === 'verified').length;

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0B' }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-6"
        style={{ height: 52, background: '#0D0D0F', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="flex items-baseline gap-0">
          <span className="font-bold font-mono text-[17px]" style={{ color: '#00D4FF' }}>GEO</span>
          <span className="text-[15px] font-normal" style={{ color: '#64748B' }}>.visibility</span>
          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded font-mono" style={{ background: '#1E1A0A', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
            admin
          </span>
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-[12px] transition-colors hover:text-white"
          style={{ color: '#64748B' }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Filters row */}
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-[11px] mb-1 font-medium" style={{ color: '#64748B' }}>
              Merchant ID
            </label>
            <input
              type="number"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="rounded px-3 py-2 text-[13px] text-white outline-none w-32"
              style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <div className="flex items-center gap-1 rounded p-1" style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['all', 'pending', 'verified'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className="px-3 py-1.5 rounded text-[12px] font-medium capitalize transition-colors"
                style={{
                  background: statusFilter === f ? '#1E293B' : 'transparent',
                  color: statusFilter === f ? '#E2E8F0' : '#64748B',
                }}
              >
                {f}
                {f === 'pending' && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 rounded-full text-[10px]" style={{ background: '#F59E0B22', color: '#F59E0B' }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => { refetch(); toast.info('Refreshing…'); }}
            className="flex items-center gap-1.5 rounded px-3 py-2 text-[12px] font-medium transition-colors hover:text-white"
            style={{ color: '#64748B', background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>

          <div className="ml-auto flex gap-3 text-[12px]">
            <span style={{ color: '#64748B' }}>
              <span className="text-white font-semibold">{pendingCount}</span> pending
            </span>
            <span style={{ color: '#64748B' }}>
              <span className="text-white font-semibold">{verifiedCount}</span> verified
            </span>
          </div>
        </div>

        {/* Create spot check form */}
        <CreateSpotCheckForm onCreated={() => refetch()} />

        {/* Accuracy panel */}
        <AccuracyPanel merchantId={parsedMerchantId} />

        {/* Spot checks table */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#64748B' }}>
            Spot checks
          </p>

          {isLoading && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw size={13} className="animate-spin" style={{ color: '#64748B' }} />
                <span className="text-[12px]" style={{ color: '#64748B' }}>Loading from server…</span>
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="rounded-lg animate-pulse" style={{ height: 56, background: '#1E293B' }} />
              ))}
            </div>
          )}

          {isError && (
            <div
              className="rounded-lg p-4 text-[13px]"
              style={{ background: '#1A0A0A', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
            >
              {(error as Error).message}
            </div>
          )}

          {!isLoading && !isError && parsedMerchantId <= 0 && (
            <div className="rounded-lg p-5 text-center" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[13px]" style={{ color: '#64748B' }}>Enter a merchant ID above to load spot checks.</p>
            </div>
          )}

          {!isLoading && !isError && parsedMerchantId > 0 && filtered.length === 0 && (
            <div className="rounded-lg p-5 text-center" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[13px]" style={{ color: '#64748B' }}>
                No {statusFilter !== 'all' ? statusFilter + ' ' : ''}spot checks for merchant {parsedMerchantId}.<br />
                <span className="text-[12px]" style={{ color: '#475569' }}>Create one above using a citation record ID.</span>
              </p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0D0D0F', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['ID', 'Query', 'Platform', 'Detected', 'Precision', 'Recall', 'F1', 'Status', 'Created', ''].map((h) => (
                      <th key={h} className="text-left py-3 px-4 font-medium" style={{ color: '#64748B' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sc) => (
                    <tr
                      key={sc.id}
                      onClick={() => setSelected(sc)}
                      className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td className="py-3 px-4 font-mono" style={{ color: '#475569' }}>
                        #{sc.id}
                      </td>
                      <td className="py-3 px-4 max-w-xs" style={{ color: '#CBD5E1' }}>
                        <span className="block truncate">{sc.query_text}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span style={{ color: PLATFORM_COLORS[sc.platform] ?? '#94A3B8' }}>
                          {PLATFORM_LABELS[sc.platform] ?? sc.platform}
                        </span>
                      </td>
                      <td className="py-3 px-4" style={{ color: '#94A3B8' }}>
                        {sc.detected_brands?.length ?? 0} brands
                      </td>
                      <td className="py-3 px-4 text-white">{pct(sc.precision)}</td>
                      <td className="py-3 px-4 text-white">{pct(sc.recall)}</td>
                      <td className="py-3 px-4">
                        <span
                          style={{
                            color:
                              sc.f1_score == null
                                ? '#64748B'
                                : sc.f1_score >= 0.8
                                ? '#4ADE80'
                                : sc.f1_score >= 0.7
                                ? '#F59E0B'
                                : '#EF4444',
                            fontWeight: sc.f1_score != null ? 600 : 400,
                          }}
                        >
                          {pct(sc.f1_score)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={sc.status} />
                      </td>
                      <td className="py-3 px-4" style={{ color: '#475569' }}>
                        {new Date(sc.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelected(sc)}
                          className="px-3 py-1 rounded text-[11px] font-semibold transition-opacity hover:opacity-80"
                          style={
                            sc.status === 'pending'
                              ? { background: '#00D4FF22', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.3)' }
                              : { background: '#1E293B', color: '#64748B', border: '1px solid rgba(255,255,255,0.08)' }
                          }
                        >
                          {sc.status === 'pending' ? 'Verify' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selected && (
        <AdminVerifyModal
          spotCheck={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
