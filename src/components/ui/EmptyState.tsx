import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div
        className="flex items-center justify-center rounded-full mb-4"
        style={{ width: 64, height: 64, background: '#1a1a1f' }}
      >
        <Icon size={28} style={{ color: '#64748B' }} />
      </div>
      <p className="text-white font-medium text-[15px] mb-2">{title}</p>
      {description && (
        <p className="text-[13px] max-w-xs" style={{ color: '#64748B' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
