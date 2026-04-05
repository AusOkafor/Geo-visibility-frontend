import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus } from 'lucide-react';
import * as adminApi from '../../lib/adminApi';
import type { SpotCheck } from '../../lib/adminApi';

interface Props {
  spotCheck: SpotCheck;
  onClose: () => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
};

function pct(v: number | null): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

export function AdminVerifyModal({ spotCheck, onClose }: Props) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [brandInput, setBrandInput] = useState('');
  const [manualBrands, setManualBrands] = useState<string[]>(
    spotCheck.manual_brands ?? spotCheck.detected_brands ?? []
  );

  const verify = useMutation({
    mutationFn: () =>
      adminApi.verifySpotCheck(spotCheck.id, manualBrands, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-spot-checks'] });
      qc.invalidateQueries({ queryKey: ['admin-accuracy'] });
      onClose();
    },
  });

  function addBrand() {
    const trimmed = brandInput.trim();
    if (!trimmed) return;
    // Support comma-separated input
    const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    setManualBrands((prev) => {
      const existing = new Set(prev.map((b) => b.toLowerCase()));
      return [...prev, ...parts.filter((p) => !existing.has(p.toLowerCase()))];
    });
    setBrandInput('');
  }

  function removeBrand(brand: string) {
    setManualBrands((prev) => prev.filter((b) => b !== brand));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBrand();
    }
  }

  const isVerified = spotCheck.status === 'verified';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-lg overflow-hidden flex flex-col"
        style={{
          background: '#0D0D0F',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: isVerified ? '#0A1A0A' : '#0A0F1A',
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-white font-semibold text-[14px]">
                Spot check #{spotCheck.id}
              </p>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold"
                style={
                  isVerified
                    ? { background: '#0F2A1A', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.25)' }
                    : { background: '#1A1A0A', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }
                }
              >
                {isVerified ? 'Verified' : 'Needs verification'}
              </span>
            </div>
            <p className="text-[12px]" style={{ color: '#64748B' }}>
              Merchant {spotCheck.merchant_id} · {PLATFORM_LABELS[spotCheck.platform] ?? spotCheck.platform}
              {spotCheck.verified_by_email && (
                <span> · Verified by {spotCheck.verified_by_email}</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5">
          {/* Query */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>
              Query
            </p>
            <p className="text-white text-[13px]">{spotCheck.query_text}</p>
          </div>

          {/* AI Response */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>
              AI response
            </p>
            <div
              className="rounded p-3 text-[12px] leading-relaxed overflow-y-auto"
              style={{
                background: '#161618',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#CBD5E1',
                maxHeight: 180,
                fontFamily: 'DM Mono, monospace',
                whiteSpace: 'pre-wrap',
              }}
            >
              {spotCheck.ai_response || <span style={{ color: '#64748B' }}>No response stored</span>}
            </div>
          </div>

          {/* Auto-detected brands */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>
              Auto-detected brands ({spotCheck.detected_brands?.length ?? 0})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(spotCheck.detected_brands ?? []).length === 0 ? (
                <span className="text-[12px]" style={{ color: '#64748B' }}>None detected</span>
              ) : (
                (spotCheck.detected_brands ?? []).map((b) => (
                  <span
                    key={b}
                    className="px-2 py-0.5 rounded text-[11px] font-medium"
                    style={{ background: '#1E293B', color: '#94A3B8' }}
                  >
                    {b}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Metrics (if already verified) */}
          {isVerified && (
            <div
              className="rounded p-3 grid grid-cols-3 gap-3"
              style={{ background: '#0F1A1A', border: '1px solid rgba(0,212,255,0.15)' }}
            >
              {[
                { label: 'Precision', value: pct(spotCheck.precision) },
                { label: 'Recall', value: pct(spotCheck.recall) },
                { label: 'F1 score', value: pct(spotCheck.f1_score) },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-[11px]" style={{ color: '#64748B' }}>{label}</p>
                  <p className="text-[18px] font-semibold" style={{ color: '#00D4FF' }}>{value}</p>
                </div>
              ))}
              <div className="col-span-3 flex justify-around mt-1">
                {[
                  { label: 'TP', value: spotCheck.true_positives, color: '#22C55E' },
                  { label: 'FP', value: spotCheck.false_positives, color: '#EF4444' },
                  { label: 'FN', value: spotCheck.false_negatives, color: '#F59E0B' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <p className="text-[11px]" style={{ color: '#64748B' }}>{label}</p>
                    <p className="text-[14px] font-semibold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual brands editor */}
          {!isVerified && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>
                Correct brand list (ground truth)
              </p>
              <p className="text-[12px] mb-2" style={{ color: '#475569' }}>
                Review the AI response above and list every brand name actually mentioned.
              </p>

              {/* Current brands */}
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                {manualBrands.map((b) => (
                  <span
                    key={b}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium"
                    style={{ background: '#0F2A1A', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)' }}
                  >
                    {b}
                    <button
                      onClick={() => removeBrand(b)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {manualBrands.length === 0 && (
                  <span className="text-[12px]" style={{ color: '#64748B' }}>No brands added yet</span>
                )}
              </div>

              {/* Add brand input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={brandInput}
                  onChange={(e) => setBrandInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Brand name (comma-separate for multiple)"
                  className="flex-1 rounded px-3 py-2 text-[13px] text-white outline-none"
                  style={{
                    background: '#161618',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
                <button
                  onClick={addBrand}
                  className="rounded px-3 py-2 flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-80"
                  style={{ background: '#1E293B', color: '#94A3B8' }}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Email (only for verification) */}
          {!isVerified && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>
                Your email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="team@yourcompany.com"
                className="w-full rounded px-3 py-2 text-[13px] text-white outline-none"
                style={{
                  background: '#161618',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>
          )}

          {verify.isError && (
            <p className="text-[12px]" style={{ color: '#EF4444' }}>
              {(verify.error as Error).message}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onClose}
            className="text-[13px] font-medium transition-colors hover:text-white"
            style={{ color: '#64748B' }}
          >
            Close
          </button>

          {!isVerified && (
            <button
              onClick={() => verify.mutate()}
              disabled={verify.isPending || !email.trim() || manualBrands.length === 0}
              className="rounded px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#00D4FF', color: '#000' }}
            >
              {verify.isPending ? 'Saving...' : 'Submit verification'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
