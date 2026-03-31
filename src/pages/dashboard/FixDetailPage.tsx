import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { VisibilityBar } from '../../components/ui/VisibilityBar';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useFix, useApproveFix, useRejectFix } from '../../hooks/useApi';

const MOCK_FIX = {
  id: '1',
  fix_type: 'description' as const,
  priority: 'high' as const,
  title: 'Rewrite leather wallet product description',
  explanation: 'Your description is 210 words. AI-cited competitors average 884 words. Expanding with FAQ content and semantic keywords will significantly increase your citation rate across ChatGPT, Perplexity, and Gemini.',
  original: {
    body: `The Oakwood Heritage Wallet is crafted from full-grain leather. Features 6 card slots and a bill compartment. Available in brown and black. Handmade in the USA.`,
    word_count: 28,
  },
  generated: {
    body: `Introducing the Oakwood Heritage Wallet — handcrafted from full-grain vegetable-tanned leather sourced from sustainable tanneries in the American Midwest. Each wallet is hand-stitched by our artisans in Portland, Oregon, using waxed linen thread that strengthens with every use.\n\nBuilt to last decades, not seasons. The Heritage Wallet features:\n• 6 card slots (expands to hold 8-10 cards comfortably)\n• Full-length bill compartment for organized cash storage\n• 1 secure ID window with crystal-clear acetate\n• Slim profile: 8mm when empty, 12mm fully loaded\n• Full-grain leather that develops a rich patina over time\n\nWhy choose full-grain leather? Unlike top-grain or bonded leather, full-grain retains the natural fiber structure for superior durability. Your wallet will look better at year 5 than it did on day one.\n\nAvailable in Cognac Brown, Saddle Black, and Natural Tan. Each color is dyed using traditional methods that allow the leather's natural character to show through.\n\nDimensions: 4.4" × 3.5" × 0.3" (empty)\nWeight: 2.1 oz\nMade in Portland, Oregon, USA\n30-day satisfaction guarantee. Free shipping over $75.`,
    word_count: 198,
  },
  est_impact: 23,
  status: 'pending' as const,
  target_gid: 'gid://shopify/Product/1',
  created_at: '2026-03-01T00:00:00Z',
};

export function FixDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'preview' | 'diff'>('preview');
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: fix, isLoading } = useFix(id ?? '');
  const approveMutation = useApproveFix();
  const rejectMutation = useRejectFix();

  const data = fix ?? MOCK_FIX;

  async function handleApply() {
    setApplyError('');
    try {
      await approveMutation.mutateAsync(data.id);
    } catch (e: any) {
      setApplyError(e.message ?? 'Failed to apply fix. Please try again.');
    }
  }

  async function handleReject() {
    try {
      await rejectMutation.mutateAsync(data.id);
      setRejectConfirm(false);
      navigate('/dashboard/fixes');
    } catch (e: any) {
      setApplyError(e.message ?? 'Failed to reject fix.');
    }
  }

  if (isLoading) {
    return (
      <div className="pb-20 md:pb-0">
        <LoadingSkeleton height="20px" className="w-32 mb-4" />
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-[6] space-y-4">
            <LoadingSkeleton height="28px" className="w-80" />
            <LoadingSkeleton height="400px" />
          </div>
          <div className="flex-[4] space-y-4">
            <LoadingSkeleton height="120px" />
            <LoadingSkeleton height="80px" />
            <LoadingSkeleton height="100px" />
            <LoadingSkeleton height="48px" />
          </div>
        </div>
      </div>
    );
  }

  // Schema, FAQ, and listing fixes cannot be auto-applied via API.
  // The backend marks them as "manual" — the merchant must paste the content manually.
  const isManualFix = ['schema', 'faq', 'listing'].includes(data.fix_type);

  const isApplied = data.status === 'applied' || (!isManualFix && approveMutation.isSuccess);
  const isMarkedManual = data.status === 'manual' || (isManualFix && approveMutation.isSuccess);
  const isRejected = data.status === 'rejected' || rejectMutation.isSuccess;
  const isApplying = approveMutation.isPending;

  // Copy generated content to clipboard
  function handleCopy() {
    const content =
      typeof data.generated.body === 'string'
        ? data.generated.body
        : JSON.stringify(data.generated, null, 2);
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Manual fix instructions per type
  const MANUAL_INSTRUCTIONS: Record<string, { steps: string[]; destination: string }> = {
    schema: {
      destination: 'Shopify admin → Online Store → Themes → Edit code → product.liquid (or sections/main-product.liquid)',
      steps: [
        'Copy the JSON-LD above using the Copy button',
        'In Shopify admin, go to Online Store → Themes → Edit code',
        'Open product.liquid or sections/main-product.liquid',
        'Paste the <script type="application/ld+json"> block before </body>',
        'Save and click "Mark as Done" below',
      ],
    },
    faq: {
      destination: 'Your storefront — add as a FAQ page or FAQ section on product pages',
      steps: [
        'Copy the FAQ content above',
        'In Shopify admin, create a new Page titled "FAQ" (or add to existing)',
        'Paste the Q&A pairs as formatted content',
        'Optionally add the page to your navigation menu',
        'Save and click "Mark as Done" below',
      ],
    },
    listing: {
      destination: 'External directories — Google Business Profile, Yelp, industry directories',
      steps: [
        'Copy the listing description above',
        'Submit to the directory links provided in the content',
        'Use the description as your standard brand bio across all listings',
        'Click "Mark as Done" once you\'ve submitted to at least one directory',
      ],
    },
  };

  return (
    <div className="pb-20 md:pb-0">
      {/* Back + header */}
      <button
        onClick={() => navigate('/dashboard/fixes')}
        className="flex items-center gap-1.5 text-[13px] mb-4 transition-colors hover:text-white"
        style={{ color: '#64748B' }}
      >
        <ArrowLeft size={14} /> Back to fixes
      </button>

      <PageHeader
        title={data.title}
        action={
          <span
            className="text-[11px] px-2 py-0.5 rounded capitalize"
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              color: data.status === 'applied' ? '#00D4FF' : data.status === 'rejected' ? '#64748B' : '#F59E0B',
            }}
          >
            {isApplied ? 'Applied' : isRejected ? 'Rejected' : data.status}
          </span>
        }
      />

      <div className="flex flex-col md:flex-row gap-6">
        {/* LEFT — Diff view */}
        <div
          className="flex-[6] rounded-[6px] overflow-hidden"
          style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {/* Tabs */}
          <div
            className="flex"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {(['preview', 'diff'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-5 py-3 text-[13px] capitalize transition-colors"
                style={{
                  color: activeTab === tab ? '#ffffff' : '#64748B',
                  borderBottom: activeTab === tab ? '2px solid #00D4FF' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {tab === 'diff' ? 'Raw diff' : 'Preview'}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'preview' ? (
              <div>
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Current */}
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: '#64748B' }}>
                      Current
                    </p>
                    <div
                      className="rounded-[6px] p-4 text-[13px] leading-relaxed overflow-y-auto"
                      style={{
                        background: '#0d0d10',
                        color: '#64748B',
                        maxHeight: 320,
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      {typeof data.original.body === 'string' ? data.original.body : JSON.stringify(data.original, null, 2)}
                    </div>
                    <p className="text-[11px] mt-2" style={{ color: '#64748B' }}>
                      {typeof data.original.word_count === 'number' ? data.original.word_count : 28} words
                    </p>
                  </div>

                  {/* Improved */}
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: '#00D4FF' }}>
                      Improved
                    </p>
                    <div
                      className="rounded-[6px] p-4 text-[13px] leading-relaxed overflow-y-auto"
                      style={{
                        background: '#001a22',
                        color: '#e2e8f0',
                        maxHeight: 320,
                        border: '1px solid rgba(0,212,255,0.15)',
                        borderLeft: '3px solid #00D4FF',
                      }}
                    >
                      {typeof data.generated.body === 'string'
                        ? data.generated.body
                        : JSON.stringify(data.generated, null, 2)}
                    </div>
                    <p className="text-[11px] mt-2" style={{ color: '#00D4FF' }}>
                      {typeof data.generated.word_count === 'number' ? data.generated.word_count : 198} words (
                      {typeof data.original.word_count === 'number' && typeof data.generated.word_count === 'number'
                        ? `+${data.generated.word_count - data.original.word_count}`
                        : '+170'}
                      )
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="font-mono text-[13px] leading-relaxed overflow-y-auto rounded-[6px]"
                style={{ maxHeight: 400, background: '#0d0d10', padding: '12px' }}
              >
                {/* Mock diff lines */}
                {[
                  { type: 'remove', text: '− The Oakwood Heritage Wallet is crafted from full-grain leather.' },
                  { type: 'remove', text: '− Features 6 card slots and a bill compartment.' },
                  { type: 'remove', text: '− Available in brown and black. Handmade in the USA.' },
                  { type: 'add', text: '+ Introducing the Oakwood Heritage Wallet — handcrafted from full-grain' },
                  { type: 'add', text: '+  vegetable-tanned leather sourced from sustainable tanneries in the' },
                  { type: 'add', text: '+  American Midwest.' },
                  { type: 'add', text: '+ ' },
                  { type: 'add', text: '+ Built to last decades, not seasons. The Heritage Wallet features:' },
                  { type: 'add', text: '+ • 6 card slots (expands to hold 8-10 cards comfortably)' },
                  { type: 'add', text: '+ • Full-length bill compartment for organized cash storage' },
                  { type: 'add', text: '+ • 1 secure ID window with crystal-clear acetate' },
                ].map((line, i) => (
                  <div
                    key={i}
                    className="py-0.5 px-2 rounded-[2px] mb-0.5"
                    style={{
                      background: line.type === 'remove' ? '#1a0000' : line.type === 'add' ? '#001a00' : 'transparent',
                      borderLeft: line.type === 'remove' ? '2px solid #EF4444' : line.type === 'add' ? '2px solid #22c55e' : '2px solid transparent',
                      color: line.type === 'remove' ? '#EF4444aa' : line.type === 'add' ? '#86efacaa' : '#64748B',
                    }}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Context panel */}
        <div className="flex-[4] flex flex-col gap-4">
          {/* Why this fix */}
          <div
            className="rounded-[6px] p-4"
            style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="font-medium text-white text-[14px] mb-2">Why this fix?</p>
            <p className="text-[13px] mb-4" style={{ color: '#94a3b8' }}>
              {data.explanation}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Your avg', value: '210 words', color: '#EF4444' },
                { label: 'Cited brands avg', value: '884 words', color: '#00D4FF' },
                { label: 'Gap', value: '674 words', color: '#F59E0B' },
              ].map((sig) => (
                <div
                  key={sig.label}
                  className="rounded-[6px] p-2.5 text-center"
                  style={{ background: '#0d0d10', border: `1px solid ${sig.color}22` }}
                >
                  <p className="font-mono font-bold text-[14px]" style={{ color: sig.color }}>
                    {sig.value}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>
                    {sig.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated impact */}
          <div
            className="rounded-[6px] p-4"
            style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="font-medium text-white text-[14px] mb-1">Estimated impact</p>
            <p className="font-mono font-bold text-[36px]" style={{ color: '#00D4FF' }}>
              +{data.est_impact}%
            </p>
            <p className="text-[12px] mb-3" style={{ color: '#64748B' }}>
              Estimated improvement in AI citation rate
            </p>
            <div className="relative" style={{ height: 8, background: '#1a1a1f', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '8%',
                  background: '#64748B',
                  borderRadius: 4,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${8 + data.est_impact}%`,
                  background: 'linear-gradient(90deg, #00D4FF44, #00D4FF)',
                  borderRadius: 4,
                  opacity: 0.6,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] mt-1 font-mono" style={{ color: '#64748B' }}>
              <span>Current: 8%</span>
              <span style={{ color: '#00D4FF' }}>Projected: {8 + data.est_impact}%</span>
            </div>
          </div>

          {/* Platform impact */}
          <div
            className="rounded-[6px] p-4"
            style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="font-medium text-white text-[14px] mb-3">Platform impact</p>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[12px] mb-1">
                  <span style={{ color: '#64748B' }}>ChatGPT</span>
                  <span className="font-mono" style={{ color: '#00D4FF' }}>+18%</span>
                </div>
                <VisibilityBar score={18} platform="chatgpt" />
              </div>
              <div>
                <div className="flex justify-between text-[12px] mb-1">
                  <span style={{ color: '#64748B' }}>Perplexity</span>
                  <span className="font-mono" style={{ color: '#A78BFA' }}>+28%</span>
                </div>
                <VisibilityBar score={28} platform="perplexity" />
              </div>
              <div>
                <div className="flex justify-between text-[12px] mb-1">
                  <span style={{ color: '#64748B' }}>Gemini</span>
                  <span className="font-mono" style={{ color: '#F59E0B' }}>+14%</span>
                </div>
                <VisibilityBar score={14} platform="gemini" />
              </div>
            </div>
          </div>

          {/* Action panel */}
          <div
            className="rounded-[6px] p-4 space-y-2"
            style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {isApplied ? (
              <div className="text-center py-4">
                <p className="text-[32px] mb-2">✓</p>
                <p className="font-medium" style={{ color: '#00D4FF' }}>
                  Applied to your store
                </p>
                <p className="text-[12px] mt-1" style={{ color: '#64748B' }}>
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            ) : isMarkedManual ? (
              <div className="py-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[13px] font-medium" style={{ color: '#F59E0B' }}>
                    ✓ Marked as done — manual steps required
                  </span>
                </div>
                <p className="text-[12px] mb-3" style={{ color: '#64748B' }}>
                  This change needs to be added to your store manually. Follow the steps below.
                </p>
                {MANUAL_INSTRUCTIONS[data.fix_type] && (
                  <div className="space-y-1.5">
                    {MANUAL_INSTRUCTIONS[data.fix_type].steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px]">
                        <span className="font-mono flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }}>
                          {i + 1}.
                        </span>
                        <span style={{ color: '#94a3b8' }}>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : isRejected ? (
              <div className="text-center py-4">
                <p className="font-medium" style={{ color: '#64748B' }}>This fix was dismissed</p>
              </div>
            ) : rejectConfirm ? (
              <div>
                <p className="text-[13px] text-white mb-3">
                  Are you sure? This fix won't appear again.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    className="flex-1 py-2 text-[13px] rounded"
                    style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444' }}
                  >
                    {rejectMutation.isPending ? 'Rejecting...' : 'Yes, reject'}
                  </button>
                  <button
                    onClick={() => setRejectConfirm(false)}
                    className="flex-1 py-2 text-[13px] rounded"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#64748B' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : isManualFix ? (
              /* Manual fix flow: copy content + step-by-step instructions */
              <>
                <div
                  className="rounded-[6px] p-3 mb-2"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                >
                  <p className="text-[12px] font-medium mb-1" style={{ color: '#F59E0B' }}>
                    Manual action required
                  </p>
                  <p className="text-[11px]" style={{ color: '#94a3b8' }}>
                    This fix can't be auto-applied. Copy the generated content and add it to your store manually.
                  </p>
                  {MANUAL_INSTRUCTIONS[data.fix_type] && (
                    <p className="text-[11px] mt-1.5" style={{ color: '#64748B' }}>
                      Where: {MANUAL_INSTRUCTIONS[data.fix_type].destination}
                    </p>
                  )}
                </div>

                {/* Steps */}
                {MANUAL_INSTRUCTIONS[data.fix_type] && (
                  <div className="space-y-1.5 mb-3">
                    {MANUAL_INSTRUCTIONS[data.fix_type].steps.slice(0, -1).map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px]">
                        <span className="font-mono flex-shrink-0 mt-0.5" style={{ color: '#64748B' }}>
                          {i + 1}.
                        </span>
                        <span style={{ color: '#94a3b8' }}>{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleCopy}
                  className="w-full font-medium text-[14px] flex items-center justify-center gap-2 transition-all hover:brightness-110"
                  style={{
                    background: copied ? 'rgba(0,212,255,0.15)' : '#00D4FF',
                    color: copied ? '#00D4FF' : '#0A0A0B',
                    height: 44,
                    borderRadius: 6,
                    border: copied ? '1px solid rgba(0,212,255,0.4)' : 'none',
                  }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copied to clipboard' : 'Copy Generated Content'}
                </button>

                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className="w-full py-2.5 text-[13px] font-medium transition-all hover:brightness-110"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    color: '#F59E0B',
                    borderRadius: 6,
                    border: '1px solid rgba(245,158,11,0.2)',
                    opacity: isApplying ? 0.7 : 1,
                  }}
                >
                  {isApplying ? 'Saving...' : "Mark as Done (I've added it manually)"}
                </button>

                {applyError && (
                  <p className="text-[12px] text-center" style={{ color: '#EF4444' }}>
                    {applyError}
                  </p>
                )}
                <button
                  onClick={() => setRejectConfirm(true)}
                  className="w-full py-2 text-[12px] transition-colors hover:text-white"
                  style={{ color: '#475569' }}
                >
                  Reject Fix
                </button>
              </>
            ) : (
              /* Auto-apply flow: description only */
              <>
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className="w-full font-medium text-[14px] transition-all hover:brightness-110 flex items-center justify-center gap-2"
                  style={{
                    background: '#00D4FF',
                    color: '#0A0A0B',
                    height: 48,
                    borderRadius: 6,
                    opacity: isApplying ? 0.7 : 1,
                  }}
                >
                  {isApplying ? (
                    <>
                      <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Applying...
                    </>
                  ) : (
                    'Apply to Store'
                  )}
                </button>
                <p className="text-center text-[11px]" style={{ color: '#64748B' }}>
                  Pushes this change directly to your Shopify product description
                </p>
                {applyError && (
                  <p className="text-[12px] text-center" style={{ color: '#EF4444' }}>
                    {applyError}
                  </p>
                )}
                <button
                  onClick={() => setRejectConfirm(true)}
                  className="w-full py-2.5 text-[13px] transition-colors hover:text-white"
                  style={{
                    color: '#64748B',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 6,
                  }}
                >
                  Reject Fix
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
