import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import api from '@/lib/api';
import { formRouteMap } from '@/lib/permissions';
import { useAuth } from '@/context/AuthContext';

export interface FormularioItem {
  id: number;
  nome: string;
  abertura?: number;
}

export interface ModuleItem {
  id: number;
  nome: string;
  descricao: string;
  formularios: FormularioItem[];
}

interface ModuleContextType {
  selectedModule: ModuleItem | null;
  selectModule: (mod: ModuleItem | null) => void;
  menuData: ModuleItem[];
  menuLoading: boolean;
  menuError: boolean;
  refetchMenu: () => void;
}

const ModuleContext = createContext<ModuleContextType | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);
  const [menuData, setMenuData] = useState<ModuleItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(false);
  const location = useLocation();
  const lastAutoRoute = useRef('');

  const fetchMenu = useCallback(async () => {
    setMenuLoading(true);
    setMenuError(false);
    try {
      const res = await api.get('/auth/menu');
      setMenuData(res.data as ModuleItem[]);
    } catch {
      setMenuError(true);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMenu();
    }
  }, [isAuthenticated, fetchMenu]);

  const selectModule = useCallback((mod: ModuleItem | null) => {
    setSelectedModule(mod);
  }, []);

  useEffect(() => {
    if (menuData.length === 0) return;
    const route = location.pathname;
    if (route === lastAutoRoute.current) return;
    lastAutoRoute.current = route;

    if (route === '/') {
      setSelectedModule(null);
      return;
    }

    const matchesModule = (mod: ModuleItem) =>
      mod.formularios.some((f) => formRouteMap[f.nome] === route);

    if (selectedModule && matchesModule(selectedModule)) return;

    for (const mod of menuData) {
      if (matchesModule(mod)) {
        setSelectedModule(mod);
        return;
      }
    }
  }, [location.pathname, menuData, selectedModule]);

  return (
    <ModuleContext.Provider value={{ selectedModule, selectModule, menuData, menuLoading, menuError, refetchMenu: fetchMenu }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModule deve ser usado dentro de ModuleProvider');
  }
  return context;
}
