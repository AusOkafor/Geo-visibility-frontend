import { cn } from '../../lib/utils';

type Platform = 'chatgpt' | 'perplexity' | 'gemini';

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: '#00D4FF',
  perplexity: '#A78BFA',
  gemini: '#F59E0B',
};

interface VisibilityBarProps {
  score: number;
  platform?: string;
  color?: string;
  className?: string;
}

export function VisibilityBar({ score, platform, color, className }: VisibilityBarProps) {
  const barColor = color ?? PLATFORM_COLORS[platform as Platform] ?? '#00D4FF';
  const pct = Math.min(Math.max(score, 0), 100);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 8, background: '#1a1a1f' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${barColor}66, ${barColor})`,
          }}
        />
      </div>
      <span
        className="text-xs font-mono text-white flex-shrink-0"
        style={{ minWidth: 32, textAlign: 'right' }}
      >
        {score}%
      </span>
    </div>
  );
}
