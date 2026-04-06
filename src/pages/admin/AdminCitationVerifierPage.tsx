import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, ShieldAlert, RefreshCw, GitCompare,
  AlertTriangle, TrendingDown, CheckCircle2, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import * as adminApi from '../../lib/adminApi';
import type { VerificationResult, CrossPlatformResult, VerificationRecord, StabilityRecord } from '../../lib/adminApi';

// ─── helpers ──────────────────────────────────────────────────────────────────

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

function pct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function simColor(score: number): string {
  if (score >= 0.85) return '#4ADE80';
  if (score >= 0.75) return '#F59E0B';
  return '#EF4444';
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-white font-bold text-[16px]">{title}</h2>
      <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>{subtitle}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>
      {children}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, type = 'text',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded px-3 py-2 text-[13px] text-white outline-none"
      style={{ background: '#161618', border: '1px solid rgba(255,255,255,0.1)' }}
    />
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg p-5 ${className}`}
      style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {children}
    </div>
  );
}

// ─── Re-Query Verification Panel ──────────────────────────────────────────────

function ReQueryPanel() {
  const [citationId, setCitationId] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const verify = useMutation({
    mutationFn: () =>
      adminApi.verifyCitation(Number(citationId), Number(merchantId)),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['verifier-history'] });
      toast.success(data.is_authentic ? 'Citation verified — authentic' : 'Verification complete — review result');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Verification failed');
    },
  });

  const canSubmit = citationId.trim() !== '' && merchantId.trim() !== '';

  return (
    <Card>
      <SectionHeader
        title="Re-Query Verification"
        subtitle="Re-run the original query on the same platform and compare responses."
      />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <FieldLabel>Citation Record ID</FieldLabel>
          <TextInput value={citationId} onChange={setCitationId} placeholder="e.g. 42" type="number" />
        </div>
        <div>
          <FieldLabel>Merchant ID</FieldLabel>
          <TextInput value={merchantId} onChange={setMerchantId} placeholder="e.g. 7" type="number" />
        </div>
      </div>

      <button
        onClick={() => verify.mutate()}
        disabled={verify.isPending || !canSubmit}
        className="rounded px-4 py-2 text-[13px] font-semibold flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ background: '#00D4FF', color: '#000' }}
      >
        <RefreshCw size={14} className={verify.isPending ? 'animate-spin' : ''} />
        {verify.isPending ? 'Querying AI…' : 'Run Verification'}
      </button>

      {result && (
        <div
          className="mt-5 rounded-lg p-4 flex flex-col gap-4"
          style={{
            background: result.is_authentic ? '#0A1A0A' : '#1A0A0A',
            border: `1px solid ${result.is_authentic ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}
        >
          {/* Verdict header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.is_authentic ? (
                <ShieldCheck size={18} style={{ color: '#4ADE80' }} />
              ) : (
                <ShieldAlert size={18} style={{ color: '#EF4444' }} />
              )}
              <span className="font-semibold text-[14px]" style={{ color: result.is_authentic ? '#4ADE80' : '#EF4444' }}>
                {result.is_authentic ? 'Authentic' : 'Questionable'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[12px]" style={{ color: '#94A3B8' }}>
              <span>
                Similarity: <span style={{ color: simColor(result.similarity_score) }} className="font-semibold">{pct(result.similarity_score)}</span>
              </span>
              <span>
                Hallucinations: <span className="font-semibold" style={{ color: result.hallucination_count > 0 ? '#EF4444' : '#4ADE80' }}>{result.hallucination_count}</span>
              </span>
            </div>
          </div>

          {/* Variability callout */}
          <div
            className="rounded px-3 py-2 flex items-start gap-2 text-[11px]"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span style={{ color: '#475569', flexShrink: 0 }}>ℹ</span>
            <span style={{ color: '#64748B' }}>
              AI responses are non-deterministic — the same query can return different wording each run.
              {' '}<span style={{ color: '#94A3B8' }}>75–90% similarity is normal.</span>
              {' '}Below 60% suggests meaningful drift (model update, ranking shift, or hallucination).
              {' '}Run multiple verifications to establish a baseline via the Stability tab.
            </span>
          </div>

          {/* Hallucination flags */}
          {result.hallucinations && result.hallucinations.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                Hallucinated Brands
              </p>
              <div className="flex flex-col gap-1.5">
                {result.hallucinations.map((h) => (
                  <div
                    key={h.brand}
                    className="rounded px-3 py-2 flex items-center gap-2 text-[12px]"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                  >
                    <AlertTriangle size={12} style={{ color: '#EF4444', flexShrink: 0 }} />
                    <span className="font-semibold text-white">{h.brand}</span>
                    <span style={{ color: '#64748B' }}>— {h.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response diff toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-[12px] transition-opacity hover:opacity-70"
            style={{ color: '#64748B' }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide' : 'Show'} response comparison
          </button>

          {expanded && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Original Response', text: result.original_response },
                { label: 'Re-Query Response', text: result.re_query_response },
              ].map(({ label, text }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>{label}</p>
                  <div
                    className="rounded p-2.5 text-[11px] leading-relaxed overflow-y-auto"
                    style={{
                      background: '#0D0D0F',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#CBD5E1',
                      maxHeight: 160,
                      fontFamily: 'DM Mono, monospace',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {text || <span style={{ color: '#475569' }}>Empty</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Cross-Platform Panel ──────────────────────────────────────────────────────

function CrossPlatformPanel() {
  const [query, setQuery] = useState('');
  const [brandName, setBrandName] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [result, setResult] = useState<CrossPlatformResult | null>(null);

  const run = useMutation({
    mutationFn: () =>
      adminApi.crossPlatform(query, brandName, Number(merchantId)),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Cross-platform scan complete — consistency ${pct(data.consistency_score)}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Cross-platform scan failed');
    },
  });

  const canSubmit = query.trim() !== '' && brandName.trim() !== '' && merchantId.trim() !== '';

  return (
    <Card>
      <SectionHeader
        title="Cross-Platform Comparison"
        subtitle="Run the same query on ChatGPT, Perplexity, and Gemini simultaneously."
      />

      <div className="flex flex-col gap-3 mb-4">
        <div>
          <FieldLabel>Query</FieldLabel>
          <TextInput value={query} onChange={setQuery} placeholder="e.g. best furniture stores in Toronto" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Brand Name</FieldLabel>
            <TextInput value={brandName} onChange={setBrandName} placeholder="e.g. West Elm" />
          </div>
          <div>
            <FieldLabel>Merchant ID</FieldLabel>
            <TextInput value={merchantId} onChange={setMerchantId} placeholder="e.g. 7" type="number" />
          </div>
        </div>
      </div>

      <button
        onClick={() => run.mutate()}
        disabled={run.isPending || !canSubmit}
        className="rounded px-4 py-2 text-[13px] font-semibold flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ background: '#A78BFA', color: '#000' }}
      >
        <GitCompare size={14} className={run.isPending ? 'animate-spin' : ''} />
        {run.isPending ? 'Querying all platforms…' : 'Run Cross-Platform'}
      </button>

      {result && (
        <div className="mt-5 flex flex-col gap-4">
          {/* Consistency summary */}
          <div
            className="rounded-lg p-4 flex items-center justify-between"
            style={{ background: '#161618', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div>
              <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>Cross-Platform Consistency</p>
              <p className="text-[24px] font-bold" style={{ color: simColor(result.consistency_score) }}>
                {pct(result.consistency_score)}
              </p>
              <p className="text-[11px] mt-1" style={{ color: '#64748B' }}>
                {result.shared_brands?.length ?? 0} brand{(result.shared_brands?.length ?? 0) !== 1 ? 's' : ''} cited on 2+ platforms
              </p>
            </div>
            {result.shared_brands && result.shared_brands.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-w-[55%]">
                {result.shared_brands.map((b) => (
                  <span
                    key={b}
                    className="px-2 py-0.5 rounded text-[11px] font-medium"
                    style={{ background: '#1E293B', color: '#94A3B8' }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Per-platform cards */}
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(result.platforms).map(([plat, pr]) => (
              <div
                key={plat}
                className="rounded-lg p-3 flex flex-col gap-2"
                style={{
                  background: '#161618',
                  border: `1px solid ${PLATFORM_COLORS[plat] ?? '#475569'}22`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: PLATFORM_COLORS[plat] ?? '#94A3B8' }}
                  >
                    {PLATFORM_LABELS[plat] ?? plat}
                  </span>
                  {pr.mentioned ? (
                    <CheckCircle2 size={13} style={{ color: '#4ADE80' }} />
                  ) : (
                    <XCircle size={13} style={{ color: '#EF4444' }} />
                  )}
                </div>

                {pr.error ? (
                  <p className="text-[11px]" style={{ color: '#EF4444' }}>{pr.error}</p>
                ) : (
                  <>
                    <p className="text-[11px]" style={{ color: '#475569' }}>
                      {pr.brands.length > 0 ? pr.brands.join(', ') : 'No brands detected'}
                    </p>
                    {pr.response && (
                      <p
                        className="text-[10px] leading-snug line-clamp-3"
                        style={{ color: '#64748B', fontFamily: 'DM Mono, monospace' }}
                      >
                        {pr.response}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── History Panel ─────────────────────────────────────────────────────────────

function HistoryPanel() {
  const [merchantId, setMerchantId] = useState('');
  const [activeId, setActiveId] = useState<string>('');

  const { data: records, isLoading, refetch } = useQuery<VerificationRecord[]>({
    queryKey: ['verifier-history', activeId],
    queryFn: () => adminApi.listVerifications(Number(activeId) || 0),
    enabled: false,
  });

  function load() {
    setActiveId(merchantId);
    refetch();
  }

  return (
    <Card>
      <SectionHeader
        title="Verification History"
        subtitle="Browse past re-query verification runs for a merchant."
      />

      <div className="flex gap-3 mb-5">
        <div className="flex-1">
          <FieldLabel>Merchant ID (leave blank for all)</FieldLabel>
          <TextInput value={merchantId} onChange={setMerchantId} placeholder="e.g. 7" type="number" />
        </div>
        <div className="flex items-end">
          <button
            onClick={load}
            disabled={isLoading}
            className="rounded px-4 py-2 text-[13px] font-semibold flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: '#1E293B', color: '#94A3B8' }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Load
          </button>
        </div>
      </div>

      {records && (
        records.length === 0 ? (
          <p className="text-[13px]" style={{ color: '#64748B' }}>No verification runs found.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {records.map((r) => (
              <div
                key={r.id}
                className="rounded-lg p-3 flex flex-col gap-1.5"
                style={{
                  background: '#161618',
                  border: `1px solid ${r.is_authentic ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-white truncate max-w-[60%]">
                    {r.original_query}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-semibold"
                      style={{ background: PLATFORM_COLORS[r.original_platform] ? `${PLATFORM_COLORS[r.original_platform]}22` : '#1E293B', color: PLATFORM_COLORS[r.original_platform] ?? '#94A3B8' }}
                    >
                      {PLATFORM_LABELS[r.original_platform] ?? r.original_platform}
                    </span>
                    {r.is_authentic ? (
                      <ShieldCheck size={13} style={{ color: '#4ADE80' }} />
                    ) : (
                      <ShieldAlert size={13} style={{ color: '#EF4444' }} />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px]" style={{ color: '#64748B' }}>
                  <span>Similarity: <span style={{ color: simColor(r.similarity_score ?? 0) }} className="font-semibold">{pct(r.similarity_score)}</span></span>
                  <span>Hallucinations: <span className="font-semibold" style={{ color: r.hallucination_count > 0 ? '#EF4444' : '#94A3B8' }}>{r.hallucination_count}</span></span>
                  <span style={{ color: '#475569' }}>{new Date(r.verified_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </Card>
  );
}

// ─── Stability Panel ───────────────────────────────────────────────────────────

function StabilityPanel() {
  const [merchantId, setMerchantId] = useState('');
  const [activeId, setActiveId] = useState<string>('');

  const { data: records, isLoading, refetch } = useQuery<StabilityRecord[]>({
    queryKey: ['verifier-stability', activeId],
    queryFn: () => adminApi.getStability(Number(activeId) || 0),
    enabled: false,
  });

  function load() {
    setActiveId(merchantId);
    refetch();
  }

  return (
    <Card>
      <SectionHeader
        title="Response Stability"
        subtitle="Track how AI responses drift over time for each query + platform combination."
      />

      <div className="flex gap-3 mb-5">
        <div className="flex-1">
          <FieldLabel>Merchant ID (leave blank for all)</FieldLabel>
          <TextInput value={merchantId} onChange={setMerchantId} placeholder="e.g. 7" type="number" />
        </div>
        <div className="flex items-end">
          <button
            onClick={load}
            disabled={isLoading}
            className="rounded px-4 py-2 text-[13px] font-semibold flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: '#1E293B', color: '#94A3B8' }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Load
          </button>
        </div>
      </div>

      {records && (
        records.length === 0 ? (
          <p className="text-[13px]" style={{ color: '#64748B' }}>No stability records found.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {records.map((r) => (
              <div
                key={r.id}
                className="rounded-lg p-3 flex flex-col gap-1.5"
                style={{
                  background: '#161618',
                  border: `1px solid ${r.drift_detected ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-white truncate max-w-[55%]">
                    {r.query_text}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-semibold"
                      style={{ background: PLATFORM_COLORS[r.platform] ? `${PLATFORM_COLORS[r.platform]}22` : '#1E293B', color: PLATFORM_COLORS[r.platform] ?? '#94A3B8' }}
                    >
                      {PLATFORM_LABELS[r.platform] ?? r.platform}
                    </span>
                    {r.drift_detected && (
                      <TrendingDown size={13} style={{ color: '#EF4444' }} />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px]" style={{ color: '#64748B' }}>
                  <span>Avg similarity: <span style={{ color: simColor(r.avg_similarity) }} className="font-semibold">{pct(r.avg_similarity)}</span></span>
                  <span>Min: <span className="font-semibold" style={{ color: simColor(r.min_similarity) }}>{pct(r.min_similarity)}</span></span>
                  <span>Checks: <span className="font-semibold text-white">{r.check_count}</span></span>
                  <span style={{ color: '#475569' }}>Last: {new Date(r.last_checked_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'verify' | 'cross' | 'history' | 'stability';

const TABS: { id: Tab; label: string }[] = [
  { id: 'verify', label: 'Re-Query Verification' },
  { id: 'cross', label: 'Cross-Platform' },
  { id: 'history', label: 'History' },
  { id: 'stability', label: 'Stability' },
];

export function AdminCitationVerifierPage() {
  const [tab, setTab] = useState<Tab>('verify');

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck size={20} style={{ color: '#00D4FF' }} />
          <h1 className="text-white font-bold text-[20px]">Citation Verifier</h1>
        </div>
        <p className="text-[13px]" style={{ color: '#64748B' }}>
          Re-query AI platforms, detect hallucinations, measure cross-platform consistency, and track response drift.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-7 p-1 rounded-lg w-fit"
        style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="rounded px-4 py-1.5 text-[12px] font-medium transition-all"
            style={{
              background: tab === id ? '#1E293B' : 'transparent',
              color: tab === id ? '#E2E8F0' : '#64748B',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Panel */}
      {tab === 'verify' && <ReQueryPanel />}
      {tab === 'cross' && <CrossPlatformPanel />}
      {tab === 'history' && <HistoryPanel />}
      {tab === 'stability' && <StabilityPanel />}
    </div>
  );
}
