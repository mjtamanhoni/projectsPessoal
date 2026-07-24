import { useAuth } from '@/context/AuthContext';
import { ReactNode } from 'react';

interface ShowForPermissionProps {
  rota: string;
  acao: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ShowForPermission({ rota, acao, children, fallback = null }: ShowForPermissionProps) {
  const { temPermissao } = useAuth();
  return temPermissao(rota, acao) ? <>{children}</> : <>{fallback}</>;
}
