import { ReactNode, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { empresa } = useAuth();
  const [collapsed, setCollapsed] = useState(() => empresa?.delivery === 1);

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <Topbar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar collapsed={collapsed} />
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
