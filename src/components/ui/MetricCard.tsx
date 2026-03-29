import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number;
  suffix?: string;
  status?: { label: string; color: string };
  className?: string;
}

function useCountUp(target: number, duration = 800): number {
  const [count, setCount] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    setCount(0);
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}

export function MetricCard({ label, value, trend, suffix, status, className }: MetricCardProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  const isNumeric = !isNaN(numericValue);
  const animated = useCountUp(isNumeric ? numericValue : 0);

  const displayValue = isNumeric
    ? `${animated}${suffix ?? ''}`
    : value;

  return (
    <div
      className={cn(
        'rounded-[6px] p-5 transition-all duration-200',
        'hover:shadow-[0_0_0_1px_rgba(0,212,255,0.15),inset_0_0_20px_rgba(0,212,255,0.03)]',
        className
      )}
      style={{
        background: '#111113',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <p
        className="text-[11px] uppercase tracking-widest mb-2"
        style={{ color: '#64748B' }}
      >
        {label}
      </p>
      <p className="text-[28px] font-bold font-mono text-white leading-none">
        {displayValue}
      </p>
      <div className="flex items-center justify-between mt-2">
        {status ? (
          <p className="text-[11px] font-medium" style={{ color: status.color }}>
            {status.label}
          </p>
        ) : <span />}
        {trend !== undefined && (
          <p
            className={cn(
              'text-[11px] font-mono',
              trend > 0 ? 'text-[#00D4FF]' : trend < 0 ? 'text-rose-400' : 'text-[#64748B]'
            )}
          >
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '—'}{trend !== 0 ? ` ${Math.abs(trend)}pts` : ' flat'}
          </p>
        )}
      </div>
    </div>
  );
}
