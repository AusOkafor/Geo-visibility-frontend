import { useState, useEffect } from 'react';
import { Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { useMerchant, useUpdateMerchant } from '../../hooks/useApi';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 transition-colors"
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: checked ? '#00D4FF' : '#1a1a1f',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <span
        className="absolute top-0.5 transition-all"
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#ffffff',
          left: checked ? 19 : 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  );
}

function SaveButton({ dirty, onSave }: { dirty: boolean; onSave: () => void }) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (!dirty) setState('idle');
  }, [dirty]);

  async function handle() {
    setState('saving');
    await new Promise((r) => setTimeout(r, 800));
    setState('saved');
    onSave();
    setTimeout(() => setState('idle'), 2000);
  }

  if (!dirty && state === 'idle') return null;

  return (
    <button
      onClick={handle}
      disabled={state === 'saving'}
      className="text-[12px] px-3 py-1 rounded transition-all"
      style={{
        background: state === 'saved' ? 'rgba(0,212,255,0.1)' : '#00D4FF',
        color: state === 'saved' ? '#00D4FF' : '#0A0A0B',
        borderRadius: 6,
      }}
    >
      {state === 'saving' ? 'Saving...' : state === 'saved' ? 'Saved ✓' : 'Save'}
    </button>
  );
}

function Card({ title, children, redBorder = false }: { title: string; children: React.ReactNode; redBorder?: boolean }) {
  return (
    <div
      className="rounded-[6px] p-5 mb-4"
      style={{
        background: '#111113',
        border: redBorder ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.05)',
        borderLeft: redBorder ? '3px solid #EF4444' : undefined,
      }}
    >
      <p className="font-medium text-white text-[15px] mb-4">{title}</p>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { data: merchant } = useMerchant();
  const updateMerchant = useUpdateMerchant();
  const navigate = useNavigate();
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [scanFreq, setScanFreq] = useState<'daily' | 'weekly'>(
    () => (localStorage.getItem('settings_scan_freq') as 'daily' | 'weekly') ?? 'daily'
  );
  const [scanFreqDirty, setScanFreqDirty] = useState(false);

  const [scanTime, setScanTime] = useState(
    () => localStorage.getItem('settings_scan_time') ?? '02:00'
  );
  const [scanTimeDirty, setScanTimeDirty] = useState(false);

  const [email, setEmail] = useState(
    () => localStorage.getItem('settings_notif_email') ?? ''
  );
  const [emailDirty, setEmailDirty] = useState(false);

  const [brandName, setBrandName] = useState(
    () => localStorage.getItem('settings_brand_name') ?? ''
  );
  const [category, setCategory] = useState(
    () => localStorage.getItem('settings_category') ?? ''
  );
  const [profileDirty, setProfileDirty] = useState(false);

  useEffect(() => {
    if (merchant) {
      const storedName = localStorage.getItem('settings_brand_name');
      const storedCategory = localStorage.getItem('settings_category');
      // Use localStorage if present (user explicitly saved); otherwise fall back to API
      const resolvedName = storedName ?? merchant.brand_name ?? '';
      const resolvedCategory = storedCategory ?? merchant.category ?? '';
      setBrandName(resolvedName);
      setCategory(resolvedCategory);
      // Always keep localStorage in sync with what we're showing
      localStorage.setItem('settings_brand_name', resolvedName);
      localStorage.setItem('settings_category', resolvedCategory);
      // If localStorage has values that differ from DB, enable Save so they sync
      if (
        (resolvedName && resolvedName !== (merchant.brand_name ?? '')) ||
        (resolvedCategory && resolvedCategory !== (merchant.category ?? ''))
      ) {
        setProfileDirty(true);
      }
    }
  }, [merchant]);

  type NotifState = { weeklyReport: boolean; visibilityDrop: boolean; newFixes: boolean; competitorGain: boolean };
  const defaultNotifs: NotifState = { weeklyReport: true, visibilityDrop: true, newFixes: true, competitorGain: false };
  const [notifs, setNotifs] = useState<NotifState>(() => {
    const stored = localStorage.getItem('settings_notifs');
    if (stored) {
      try { return JSON.parse(stored) as NotifState; } catch { /* fall through */ }
    }
    return defaultNotifs;
  });
  const [notifDirty, setNotifDirty] = useState(false);

  const NOTIF_ITEMS = [
    { key: 'weeklyReport' as const, label: 'Weekly visibility report email', desc: 'Receive a weekly summary of your AI visibility changes.' },
    { key: 'visibilityDrop' as const, label: 'Alert when visibility drops >5%', desc: 'Get notified immediately if your scores drop significantly.' },
    { key: 'newFixes' as const, label: 'New fixes available', desc: 'Notify me when new AI-generated fixes are ready for review.' },
    { key: 'competitorGain' as const, label: 'Competitor gains significant visibility', desc: 'Alert when a competitor sees a large improvement in AI citations.' },
  ];

  return (
    <div className="max-w-2xl pb-20 md:pb-0">
      <PageHeader
        title="Settings"
        subtitle="Manage your store connection and account preferences"
      />

      {/* Store connection */}
      <Card title="Shopify Store">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Store size={20} style={{ color: '#64748B', marginTop: 2 }} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white text-[14px] font-medium">
                  {merchant?.shop_domain ?? '—'}
                </span>
                <span className="flex items-center gap-1 text-[11px]" style={{ color: '#00D4FF' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]" />
                  Connected
                </span>
              </div>
              {merchant?.installed_at && (
                <p className="text-[13px]" style={{ color: '#64748B' }}>
                  Connected on {new Date(merchant.installed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
          {disconnectConfirm ? (
            <div className="text-right">
              <p className="text-[12px] mb-2" style={{ color: '#EF4444' }}>
                Disconnect this store?
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { localStorage.removeItem('geo_session_token'); navigate('/'); }}
                  className="text-[12px] px-3 py-1 rounded"
                  style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444' }}
                >
                  Yes, disconnect
                </button>
                <button
                  onClick={() => setDisconnectConfirm(false)}
                  className="text-[12px] px-3 py-1 rounded"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#64748B' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDisconnectConfirm(true)}
              className="text-[13px] px-3 py-1.5 rounded transition-colors hover:bg-red-950/30"
              style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', borderRadius: 6 }}
            >
              Disconnect Store
            </button>
          )}
        </div>
      </Card>

      {/* Store profile */}
      <Card title="Store profile">
        <p className="text-[13px] mb-4" style={{ color: '#64748B' }}>
          Used to generate accurate scan queries and AI fix recommendations.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-[12px] block mb-1" style={{ color: '#94a3b8' }}>Brand name</label>
            <input
              type="text"
              value={brandName}
              placeholder="e.g. Oakwood Leather Co."
              onChange={(e) => { setBrandName(e.target.value); setProfileDirty(true); }}
              className="w-full text-[13px] px-3 py-2 rounded"
              style={{ background: '#0d0d10', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
            />
          </div>
          <div>
            <label className="text-[12px] block mb-1" style={{ color: '#94a3b8' }}>Product category</label>
            <input
              type="text"
              value={category}
              placeholder="e.g. leather wallets, handbags, accessories"
              onChange={(e) => { setCategory(e.target.value); setProfileDirty(true); }}
              className="w-full text-[13px] px-3 py-2 rounded"
              style={{ background: '#0d0d10', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => {
              updateMerchant.mutate(
                { brand_name: brandName, category },
                {
                  onSuccess: () => {
                    localStorage.setItem('settings_brand_name', brandName);
                    localStorage.setItem('settings_category', category);
                    setProfileDirty(false);
                  },
                }
              );
            }}
            disabled={updateMerchant.isPending || !profileDirty}
            className="text-[12px] px-3 py-1.5 rounded transition-all"
            style={{
              background: updateMerchant.isSuccess && !profileDirty ? 'rgba(0,212,255,0.1)' : '#00D4FF',
              color: updateMerchant.isSuccess && !profileDirty ? '#00D4FF' : '#0A0A0B',
              opacity: !profileDirty && !updateMerchant.isSuccess ? 0.4 : 1,
              cursor: !profileDirty ? 'default' : 'pointer',
              borderRadius: 6,
            }}
          >
            {updateMerchant.isPending ? 'Saving...' : updateMerchant.isSuccess && !profileDirty ? 'Saved ✓' : 'Save'}
          </button>
          {updateMerchant.isError && (
            <span className="text-[12px]" style={{ color: '#EF4444' }}>
              Failed to save — check your connection
            </span>
          )}
        </div>
      </Card>

      {/* Scan settings */}
      <Card title="Scan frequency">
        <p className="text-[13px] mb-4" style={{ color: '#64748B' }}>
          How often we check your visibility across AI platforms
        </p>
        <div className="flex gap-2 mb-4">
          {(['daily', 'weekly'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setScanFreq(f); setScanFreqDirty(true); }}
              className="px-4 py-2 text-[13px] rounded transition-all capitalize"
              style={{
                border: scanFreq === f ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.1)',
                color: scanFreq === f ? '#00D4FF' : '#64748B',
                background: scanFreq === f ? 'rgba(0,212,255,0.05)' : 'transparent',
              }}
            >
              {f === 'daily' ? 'Daily (recommended)' : 'Weekly'}
            </button>
          ))}
        </div>
        <p className="text-[12px] mb-4" style={{ color: '#64748B' }}>
          Daily scans use more quota but catch changes faster.
        </p>
        <SaveButton dirty={scanFreqDirty} onSave={() => { localStorage.setItem('settings_scan_freq', scanFreq); setScanFreqDirty(false); }} />

        <div
          className="mt-4 pt-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] text-white mb-0.5">Scan time preference</p>
              <p className="text-[12px]" style={{ color: '#64748B' }}>
                We scan during off-peak hours to minimize API costs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={scanTime}
                onChange={(e) => { setScanTime(e.target.value); setScanTimeDirty(true); }}
                className="text-[13px] px-2 py-1 rounded font-mono"
                style={{
                  background: '#0d0d10',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#ffffff',
                }}
              />
              <span className="text-[12px]" style={{ color: '#64748B' }}>UTC</span>
              <SaveButton dirty={scanTimeDirty} onSave={() => { localStorage.setItem('settings_scan_time', scanTime); setScanTimeDirty(false); }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications">
        <div className="space-y-4">
          {NOTIF_ITEMS.map((item) => (
            <div key={item.key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[14px] text-white mb-0.5">{item.label}</p>
                <p className="text-[12px]" style={{ color: '#64748B' }}>{item.desc}</p>
              </div>
              <Toggle
                checked={notifs[item.key]}
                onChange={(v) => {
                  setNotifs((prev) => ({ ...prev, [item.key]: v }));
                  setNotifDirty(true);
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailDirty(true); }}
              className="flex-1 text-[13px] px-3 py-2 rounded"
              style={{
                background: '#0d0d10',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#ffffff',
              }}
            />
            <SaveButton dirty={emailDirty} onSave={() => { localStorage.setItem('settings_notif_email', email); setEmailDirty(false); }} />
          </div>
        </div>
        {notifDirty && (
          <div className="mt-3">
            <SaveButton dirty={notifDirty} onSave={() => { localStorage.setItem('settings_notifs', JSON.stringify(notifs)); setNotifDirty(false); }} />
          </div>
        )}
      </Card>

      {/* Plan and billing */}
      <Card title="Current plan">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[12px] px-2 py-0.5 rounded font-medium"
                style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF' }}
              >
                {merchant?.plan === 'growth' ? 'Growth' : merchant?.plan === 'pro' ? 'Pro' : merchant?.plan === 'starter' ? 'Starter' : 'Free'}
              </span>
            </div>
            <p className="text-[13px] mb-3" style={{ color: '#64748B' }}>
              Manage billing and renewal in your Shopify admin.
            </p>
            <ul className="space-y-1 text-[13px]" style={{ color: '#94a3b8' }}>
              {['3 AI platforms monitored', '100 queries per platform', 'Daily scan frequency', 'Unlimited fixes', 'Competitor tracking (top 10)'].map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <button
              className="text-[13px] px-3 py-1.5 rounded transition-colors"
              style={{ border: '1px solid #00D4FF', color: '#00D4FF', borderRadius: 6 }}
            >
              Upgrade to Pro
            </button>
            <button className="text-[13px]" style={{ color: '#64748B' }}>
              Manage billing
            </button>
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card title="Danger zone" redBorder>
        {deleteConfirm ? (
          <div>
            <p className="text-[13px] mb-4" style={{ color: '#94a3b8' }}>
              This permanently deletes all your scan history, fixes, and settings.
              Your Shopify store will not be affected.
            </p>
            <div className="flex gap-2">
              <button
                className="text-[13px] px-3 py-2 rounded"
                style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444' }}
              >
                Yes, delete everything
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="text-[13px] px-3 py-2 rounded"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#64748B' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="text-[13px] transition-colors hover:opacity-80"
            style={{ color: '#EF4444' }}
          >
            Delete all my data
          </button>
        )}
      </Card>
    </div>
  );
}
