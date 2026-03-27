import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1
          className="font-medium text-white leading-tight"
          style={{ fontSize: 22, fontFamily: 'DM Sans, sans-serif' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-[14px] mt-1" style={{ color: '#64748B' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}
