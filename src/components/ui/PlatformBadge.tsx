import { cn } from '../../lib/utils';

type Platform = 'chatgpt' | 'perplexity' | 'gemini';

const PLATFORM_CONFIG: Record<Platform, { color: string; label: string }> = {
  chatgpt: { color: '#00D4FF', label: 'ChatGPT' },
  perplexity: { color: '#A78BFA', label: 'Perplexity' },
  gemini: { color: '#F59E0B', label: 'Gemini' },
};

interface PlatformBadgeProps {
  platform: Platform | string;
  className?: string;
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform as Platform] ?? {
    color: '#64748B',
    label: platform,
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className="rounded-full flex-shrink-0"
        style={{
          width: 8,
          height: 8,
          backgroundColor: config.color,
        }}
      />
      <span
        className="text-[12px]"
        style={{ fontFamily: 'DM Sans, sans-serif', color: '#94a3b8' }}
      >
        {config.label}
      </span>
    </span>
  );
}
