import { cn } from '../../lib/utils';

interface LoadingSkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({ lines = 1, height = '16px', className }: LoadingSkeletonProps) {
  if (lines === 1) {
    return (
      <div
        className={cn('skeleton', className)}
        style={{ height }}
      />
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height,
            width: i === lines - 1 ? '70%' : '100%',
          }}
        />
      ))}
    </div>
  );
}
