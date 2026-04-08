import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ClipboardCheck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as adminApi from '../../lib/adminApi';

export function AdminAuditPage() {
  const [merchantId, setMerchantId] = useState('');

  const audit = useMutation({
    mutationFn: (id: number) => adminApi.triggerAudit(id),
    onSuccess: (_, id) => {
      toast.success(`Audit queued for merchant ${id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to queue audit');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = parseInt(merchantId, 10);
    if (!id || id <= 0) {
      toast.error('Enter a valid merchant ID');
      return;
    }
    audit.mutate(id);
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <ClipboardCheck size={16} style={{ color: '#F59E0B' }} />
        </div>
        <div>
          <h1 className="text-[18px] font-bold text-white">Store Audit</h1>
          <p className="text-[12px]" style={{ color: '#475569' }}>
            Re-run the onboarding audit for any merchant
          </p>
        </div>
      </div>

      <p className="text-[13px] mb-8 mt-4" style={{ color: '#64748B', lineHeight: '1.6' }}>
        The onboarding audit runs automatically on install. Use this tool to re-audit a merchant
        after they've made significant changes — added product descriptions, built an FAQ page,
        or deployed schema from another source. The audit updates what fixes get recommended.
      </p>

      {/* What it checks */}
      <div
        className="rounded-lg p-4 mb-8"
        style={{ background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-[12px] font-semibold mb-3" style={{ color: '#94A3B8' }}>
          WHAT THE AUDIT CHECKS
        </p>
        <div className="space-y-2">
          {[
            { label: 'Schema live', detail: 'geo_visibility/schema_json metafield present on store' },
            { label: 'Description quality', detail: 'Avg word count + empty/short product count (top 10)' },
            { label: 'FAQ page', detail: 'Shopify page with "faq" in title or handle' },
            { label: 'Review app', detail: 'Detected app from active theme files' },
          ].map(({ label, detail }) => (
            <div key={label} className="flex items-start gap-3">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: '#F59E0B' }}
              />
              <div>
                <span className="text-[13px] font-medium text-white">{label}</span>
                <span className="text-[12px] ml-2" style={{ color: '#475569' }}>{detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <label className="block text-[12px] font-semibold mb-2" style={{ color: '#94A3B8' }}>
          MERCHANT ID
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            min="1"
            value={merchantId}
            onChange={e => setMerchantId(e.target.value)}
            placeholder="e.g. 7"
            className="flex-1 rounded-lg px-4 py-2.5 text-[14px] text-white outline-none"
            style={{
              background: '#0D0D0F',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
          <button
            type="submit"
            disabled={audit.isPending || !merchantId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all"
            style={{
              background: audit.isPending ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
              color: audit.isPending ? '#92400E' : '#F59E0B',
              cursor: audit.isPending || !merchantId ? 'not-allowed' : 'pointer',
              opacity: !merchantId ? 0.5 : 1,
            }}
          >
            <RefreshCw size={13} className={audit.isPending ? 'animate-spin' : ''} />
            {audit.isPending ? 'Queuing…' : 'Re-audit Store'}
          </button>
        </div>
      </form>

      {/* Result */}
      {audit.isSuccess && (
        <div
          className="flex items-center gap-3 mt-6 rounded-lg px-4 py-3"
          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <CheckCircle2 size={15} style={{ color: '#10B981' }} />
          <div>
            <p className="text-[13px] font-medium" style={{ color: '#10B981' }}>
              Audit queued for merchant {audit.data?.merchant_id}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: '#475569' }}>
              Results will update in merchant_audit within ~30 seconds. Fix recommendations
              will reflect the new audit on the next scan.
            </p>
          </div>
        </div>
      )}

      {audit.isError && (
        <div
          className="flex items-center gap-3 mt-6 rounded-lg px-4 py-3"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertCircle size={15} style={{ color: '#EF4444' }} />
          <p className="text-[13px]" style={{ color: '#EF4444' }}>
            {(audit.error as Error)?.message ?? 'Failed to queue audit'}
          </p>
        </div>
      )}
    </div>
  );
}
