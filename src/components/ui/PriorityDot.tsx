import { cn } from '../../lib/utils';

type Priority = 'high' | 'medium' | 'low';

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#00D4FF',
};

interface PriorityDotProps {
  priority: Priority;
  className?: string;
}

export function PriorityDot({ priority, className }: PriorityDotProps) {
  return (
    <span
      className={cn('inline-block rounded-full flex-shrink-0', className)}
      style={{
        width: 10,
        height: 10,
        backgroundColor: PRIORITY_COLORS[priority],
      }}
    />
  );
}
