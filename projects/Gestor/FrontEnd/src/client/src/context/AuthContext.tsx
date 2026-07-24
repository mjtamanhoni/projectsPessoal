import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import api from '@/lib/api';
import { fetchSettings, getCachedSettings } from '@/lib/settings';
import { formRouteMap, routeFormMap, ACAO } from '@/lib/permissions';
import type { User, FormularioPermissao, Empresa } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isSuperadmin: boolean;
  permissoes: FormularioPermissao[];
  rotasPermitidas: string[];
  irrestrito: boolean;
  homeRoute: string;
  empresaNome: string;
  login: (login: string, senha: string, pin?: string, empresa?: number) => Promise<void>;
  logout: () => void;
  temAcesso: (rota: string) => boolean;
  temPermissao: (rota: string, acao: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadPermissions(): { permissoes: FormularioPermissao[]; irrestrito: boolean } {
  try {
    const raw = localStorage.getItem('permissoes');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        permissoes: Array.isArray(parsed.permissoes) ? parsed.permissoes : [],
        irrestrito: parsed.irrestrito !== false,
      };
    }
  } catch {
    // fallback
  }
  return { permissoes: [], irrestrito: true };
}

async function fetchPermissions(): Promise<{ irrestrito: boolean; formularios: FormularioPermissao[]; isSuperadmin?: boolean }> {
  const res = await api.get('/auth/permissoes');
  return res.data as { irrestrito: boolean; formularios: FormularioPermissao[]; isSuperadmin?: boolean };
}

async function fetchEmpresaNome(empresaId: number): Promise<string> {
  try {
    const res = await api.get('/auth/empresas');
    const empresas = res.data as Empresa[];
    const empresa = empresas.find(e => e.id === empresaId || e.codigo === empresaId);
    const nome = empresa?.fantasia || empresa?.razao_social || '';
    if (nome) localStorage.setItem('empresaNome', nome);
    return nome;
  } catch {
    return '';
  }
}

function buildRotasPermitidas(permissoes: FormularioPermissao[], irrestrito: boolean): string[] {
  if (irrestrito) return [];
  const rotas = new Set<string>();
  for (const form of permissoes) {
    if (formRouteMap[form.nome]) {
      rotas.add(formRouteMap[form.nome]);
    }
  }
  return Array.from(rotas);
}

function determineHomeRoute(rotasPermitidas: string[], irrestrito: boolean): string {
  if (irrestrito) return '/dashboard';
  if (rotasPermitidas.includes('/dashboard')) return '/dashboard';
  return rotasPermitidas[0] || '/dashboard';
}

const REDIRECT_KEY = 'redirectAfterLogin';
const INACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

function saveRedirectPath(path?: string) {
  if (path && path !== '/login') {
    localStorage.setItem(REDIRECT_KEY, path);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        return parsed.is_superadmin === true;
      }
    } catch {}
    return false;
  });
  const [permissoes, setPermissoes] = useState<FormularioPermissao[]>(() => loadPermissions().permissoes);
  const [irrestrito, setIrrestrito] = useState<boolean>(() => loadPermissions().irrestrito);
  const [empresaNome, setEmpresaNome] = useState<string>(() => localStorage.getItem('empresaNome') || '');
  const [loading, setLoading] = useState(true);

  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityCleanupRef = useRef<(() => void) | null>(null);
  const performLogoutRef = useRef<() => void>(() => {});

  const rotasPermitidas = useMemo(() => buildRotasPermitidas(permissoes, irrestrito), [permissoes, irrestrito]);
  const homeRoute = useMemo(() => determineHomeRoute(rotasPermitidas, irrestrito), [rotasPermitidas, irrestrito]);

  const temAcesso = useCallback(
    (rota: string): boolean => {
      if (rota === '/') return true;
      if (irrestrito) return true;
      if (rotasPermitidas.length === 0) return true;
      return rotasPermitidas.some((r) => rota === r || (rota.startsWith(r) && (rota.length === r.length || rota[r.length] === '/')));
    },
    [irrestrito, rotasPermitidas]
  );

  const temPermissao = useCallback(
    (rota: string, acao: string): boolean => {
      if (irrestrito) return true;
      const formName = routeFormMap[rota];
      if (!formName) return true;
      const formPerm = permissoes.find(p => p.nome === formName);
      if (!formPerm) return false;
      return formPerm.permissoes?.includes(acao) ?? false;
    },
    [irrestrito, permissoes]
  );

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (activityCleanupRef.current) {
      activityCleanupRef.current();
      activityCleanupRef.current = null;
    }
  }, []);

  const doLogout = useCallback((reason: string) => {
    clearSessionTimer();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissoes');
    localStorage.removeItem('empresaNome');
    setUser(null);
    setIsSuperadmin(false);
    setPermissoes([]);
    setIrrestrito(true);
    setEmpresaNome('');
    if (window.location.pathname !== '/login') {
      saveRedirectPath(window.location.pathname);
      window.location.href = `/login?expired=1&message=${encodeURIComponent(reason)}`;
    }
  }, [clearSessionTimer]);

  performLogoutRef.current = () => doLogout('Sessão expirada por inatividade');

  const startSessionTimer = useCallback(() => {
    clearSessionTimer();
    const settings = getCachedSettings();
    const timeoutMinutes = settings?.sessionTimeout ?? 0;
    if (timeoutMinutes <= 0) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        performLogoutRef.current();
      }, timeoutMs);
    };

    const handlers = INACTIVITY_EVENTS.map((event) => {
      const handler = () => resetTimer();
      window.addEventListener(event, handler, { passive: true });
      return { event, handler };
    });

    resetTimer();

    activityCleanupRef.current = () => {
      if (timer) clearTimeout(timer);
      handlers.forEach((h) => window.removeEventListener(h.event, h.handler));
    };
  }, [clearSessionTimer]);

  const initSessionTimer = useCallback(() => {
    fetchSettings().then(() => startSessionTimer()).catch(() => startSessionTimer());
  }, [startSessionTimer]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData) as User;
        setUser(parsedUser);
        setIsSuperadmin(parsedUser.is_superadmin === true);
        initSessionTimer();
        fetchEmpresaNome(parsedUser.empresaId).then(setEmpresaNome);
        fetchPermissions()
          .then((data) => {
            setPermissoes(data.formularios);
            setIrrestrito(data.irrestrito);
            if (data.isSuperadmin !== undefined) {
              setIsSuperadmin(data.isSuperadmin);
            }
            localStorage.setItem('permissoes', JSON.stringify({ permissoes: data.formularios, irrestrito: data.irrestrito }));
          })
          .catch(() => {});
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('permissoes');
      }
    }
    setLoading(false);
    return () => clearSessionTimer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      clearSessionTimer();
      setUser(null);
      setIsSuperadmin(false);
      setPermissoes([]);
      setIrrestrito(true);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('permissoes');
      if (window.location.pathname !== '/login') {
        saveRedirectPath(window.location.pathname);
        window.location.href = `/login?expired=1&message=${encodeURIComponent(detail || 'Sessão expirada')}`;
      }
    };
    const refreshHandler = () => { startSessionTimer(); };
    window.addEventListener('auth:unauthorized', handler);
    window.addEventListener('settings:saved', refreshHandler);
    return () => {
      window.removeEventListener('auth:unauthorized', handler);
      window.removeEventListener('settings:saved', refreshHandler);
      clearSessionTimer();
    };
  }, [clearSessionTimer, startSessionTimer]);

  const login = useCallback(async (login: string, senha: string, pin?: string, empresa?: number) => {
    const body = pin ? { pin, empresa: empresa || 1 } : { login, senha, empresa: empresa || 1 };
    const response = await api.post('/auth/login', body);
    const data = response.data as User;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    setIsSuperadmin(data.is_superadmin === true);
    fetchEmpresaNome(data.empresaId).then(setEmpresaNome);
    try {
      const permData = await fetchPermissions();
      setPermissoes(permData.formularios);
      setIrrestrito(permData.irrestrito);
      if (permData.isSuperadmin !== undefined) {
        setIsSuperadmin(permData.isSuperadmin);
      }
      localStorage.setItem('permissoes', JSON.stringify({ permissoes: permData.formularios, irrestrito: permData.irrestrito }));
    } catch {
      setPermissoes([]);
      setIrrestrito(true);
    }
    initSessionTimer();
  }, [initSessionTimer]);

  const logout = useCallback(() => {
    doLogout('Logout manual');
  }, [doLogout]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isSuperadmin, permissoes, rotasPermitidas, irrestrito, homeRoute, empresaNome, login, logout, temAcesso, temPermissao, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
