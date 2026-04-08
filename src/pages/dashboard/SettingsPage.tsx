import { useState, useEffect } from 'react';
import { Store, Plus, Trash2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { useMerchant, useUpdateMerchant, useSocialLinks, useUpdateSocialLinks, useMerchantFAQs, useUpdateMerchantFAQs, useFAQSuggestions } from '../../hooks/useApi';
import { deleteAllMerchantData } from '../../lib/api';
import type { MerchantFAQ } from '../../lib/api';

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

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourbrand' },
  { key: 'tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/@yourbrand' },
  { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/yourbrand' },
  { key: 'pinterest', label: 'Pinterest', placeholder: 'https://pinterest.com/yourbrand' },
  { key: 'youtube',   label: 'YouTube',   placeholder: 'https://youtube.com/@yourbrand' },
] as const;

export function SettingsPage() {
  const { data: merchant } = useMerchant();
  const updateMerchant = useUpdateMerchant();
  const { data: socialData } = useSocialLinks();
  const updateSocialLinks = useUpdateSocialLinks();
  const { data: savedFAQs } = useMerchantFAQs();
  const updateFAQs = useUpdateMerchantFAQs();
  const suggestFAQs = useFAQSuggestions();
  const navigate = useNavigate();

  const [faqs, setFaqs] = useState<MerchantFAQ[]>([]);
  const [faqDirty, setFaqDirty] = useState(false);

  useEffect(() => {
    if (savedFAQs) setFaqs(savedFAQs);
  }, [savedFAQs]);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const deleteData = useMutation({
    mutationFn: deleteAllMerchantData,
    onSuccess: () => {
      toast.success('All data deleted. You are now signed out.');
      setTimeout(() => {
        localStorage.clear();
        navigate('/');
      }, 1500);
    },
    onError: () => toast.error('Failed to delete data — try again'),
  });

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

  // Social links: one slot per platform, keyed by platform index
  const [socialInputs, setSocialInputs] = useState<string[]>(() =>
    SOCIAL_PLATFORMS.map(() => '')
  );
  const [socialDirty, setSocialDirty] = useState(false);

  useEffect(() => {
    if (socialData?.social_links) {
      // Map stored links back onto the platform slots by matching the URL prefix
      setSocialInputs(
        SOCIAL_PLATFORMS.map(({ placeholder }) => {
          const domain = new URL(placeholder).hostname;
          return socialData.social_links.find((l) => l.includes(domain)) ?? '';
        })
      );
    }
  }, [socialData]);

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
            <label className="text-[12px] block mb-1" style={{ color: '#94a3b8' }}>Primary product category</label>
            <input
              type="text"
              value={category}
              placeholder="e.g. furniture, fine jewelry, skincare"
              onChange={(e) => { setCategory(e.target.value); setProfileDirty(true); }}
              className="w-full text-[13px] px-3 py-2 rounded"
              style={{ background: '#0d0d10', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
            />
            <p className="text-[11px] mt-1.5" style={{ color: '#475569' }}>
              Enter your main product type as a short phrase — e.g. <span style={{ color: '#64748b' }}>furniture</span>, <span style={{ color: '#64748b' }}>women's clothing</span>, <span style={{ color: '#64748b' }}>home fragrance</span>. For stores with multiple product types, use the broadest term that covers your range. This drives how AI scan queries are generated.
            </p>
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

      {/* Social links */}
      <Card title="Social profiles">
        <p className="text-[13px] mb-4" style={{ color: '#64748B' }}>
          Added to your schema as <code className="text-[12px] px-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>sameAs</code> links — helps AI models connect your store to your social presence.
        </p>
        <div className="space-y-3">
          {SOCIAL_PLATFORMS.map(({ label, placeholder }, i) => (
            <div key={label}>
              <label className="text-[12px] block mb-1" style={{ color: '#94a3b8' }}>{label}</label>
              <input
                type="url"
                value={socialInputs[i]}
                placeholder={placeholder}
                onChange={(e) => {
                  const next = [...socialInputs];
                  next[i] = e.target.value;
                  setSocialInputs(next);
                  setSocialDirty(true);
                }}
                className="w-full text-[13px] px-3 py-2 rounded font-mono"
                style={{ background: '#0d0d10', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => {
              updateSocialLinks.mutate(
                socialInputs.filter(Boolean),
                { onSuccess: () => setSocialDirty(false) }
              );
            }}
            disabled={updateSocialLinks.isPending || !socialDirty}
            className="text-[12px] px-3 py-1.5 rounded transition-all"
            style={{
              background: updateSocialLinks.isSuccess && !socialDirty ? 'rgba(0,212,255,0.1)' : '#00D4FF',
              color: updateSocialLinks.isSuccess && !socialDirty ? '#00D4FF' : '#0A0A0B',
              opacity: !socialDirty && !updateSocialLinks.isSuccess ? 0.4 : 1,
              cursor: !socialDirty ? 'default' : 'pointer',
              borderRadius: 6,
            }}
          >
            {updateSocialLinks.isPending ? 'Saving...' : updateSocialLinks.isSuccess && !socialDirty ? 'Saved ✓' : 'Save'}
          </button>
          {updateSocialLinks.isError && (
            <span className="text-[12px]" style={{ color: '#EF4444' }}>Failed to save — check your connection</span>
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

      {/* FAQ */}
      <Card title="Store FAQs">
        <p className="text-[13px] mb-1" style={{ color: '#64748B' }}>
          These Q&amp;As appear in your schema as a <code className="text-[12px] px-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>FAQPage</code> entity.
          AI assistants cite factual, policy-based answers — shipping, materials, returns.
        </p>
        <p className="text-[12px] mb-4" style={{ color: '#475569' }}>
          Avoid self-promotional questions like "Why is [brand] the best?" — AI down-ranks those.
        </p>

        <div className="space-y-3 mb-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-[6px] p-3"
              style={{ background: '#0d0d10', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={faq.question}
                  placeholder="e.g. How long does shipping take?"
                  onChange={(e) => {
                    const next = [...faqs];
                    next[i] = { ...next[i], question: e.target.value };
                    setFaqs(next);
                    setFaqDirty(true);
                  }}
                  className="flex-1 text-[13px] px-2 py-1.5 rounded"
                  style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                />
                <button
                  onClick={() => {
                    setFaqs(faqs.filter((_, j) => j !== i));
                    setFaqDirty(true);
                  }}
                  className="flex-shrink-0 p-1.5 rounded transition-colors hover:bg-red-950/30"
                  style={{ color: '#64748B' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                value={faq.answer}
                placeholder="e.g. Orders ship within 2-3 business days. Standard delivery takes 5-7 days."
                rows={2}
                onChange={(e) => {
                  const next = [...faqs];
                  next[i] = { ...next[i], answer: e.target.value };
                  setFaqs(next);
                  setFaqDirty(true);
                }}
                className="w-full text-[13px] px-2 py-1.5 rounded resize-none"
                style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => { setFaqs([...faqs, { question: '', answer: '' }]); setFaqDirty(true); }}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
          >
            <Plus size={13} /> Add FAQ
          </button>
          <button
            onClick={() => suggestFAQs.mutate(undefined, {
              onSuccess: (suggestions) => {
                setFaqs((prev) => [...prev, ...suggestions]);
                setFaqDirty(true);
              },
            })}
            disabled={suggestFAQs.isPending}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded transition-all"
            style={{ border: '1px solid rgba(0,212,255,0.2)', color: '#00D4FF', background: 'rgba(0,212,255,0.05)' }}
          >
            <Sparkles size={13} />
            {suggestFAQs.isPending ? 'Generating...' : 'AI suggest safe FAQs'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => updateFAQs.mutate(faqs, { onSuccess: () => setFaqDirty(false) })}
            disabled={updateFAQs.isPending || !faqDirty}
            className="text-[12px] px-3 py-1.5 rounded transition-all"
            style={{
              background: updateFAQs.isSuccess && !faqDirty ? 'rgba(0,212,255,0.1)' : '#00D4FF',
              color: updateFAQs.isSuccess && !faqDirty ? '#00D4FF' : '#0A0A0B',
              opacity: !faqDirty && !updateFAQs.isSuccess ? 0.4 : 1,
              cursor: !faqDirty ? 'default' : 'pointer',
              borderRadius: 6,
            }}
          >
            {updateFAQs.isPending ? 'Saving...' : updateFAQs.isSuccess && !faqDirty ? 'Saved ✓' : 'Save FAQs'}
          </button>
          {updateFAQs.isError && (
            <span className="text-[12px]" style={{ color: '#EF4444' }}>Failed to save</span>
          )}
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
                onClick={() => deleteData.mutate()}
                disabled={deleteData.isPending}
                className="text-[13px] px-3 py-2 rounded disabled:opacity-50"
                style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444' }}
              >
                {deleteData.isPending ? 'Deleting...' : 'Yes, delete everything'}
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
