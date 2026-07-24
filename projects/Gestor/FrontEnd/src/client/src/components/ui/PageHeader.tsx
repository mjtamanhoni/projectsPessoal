import type { ReactNode } from 'react';
import { getModuleIcon } from '@/lib/moduleIcons';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  const { icon: Icon, color, bgGradient } = getModuleIcon(title);

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${bgGradient}`}>
          <Icon size={22} style={{ color }} />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground-primary">{title}</h1>
          {subtitle && <p className="text-text-secondary mt-1">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
