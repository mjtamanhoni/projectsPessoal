import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModule } from '@/context/ModuleContext';
import { useAppMode } from '@/context/AppModeContext';
import { useAuth } from '@/context/AuthContext';
import { getModuleIcon, getModuleImage } from '@/lib/moduleIcons';
import { formRouteMap } from '@/lib/permissions';
import { fetchSettings } from '@/lib/settings';
import { Layout } from '@/components/ui/Layout';
import { ArrowRight, RefreshCw, Loader2 } from 'lucide-react';

function normalizeKey(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

const MODE_MODULE_MAP: Record<string, string> = {
  gestor: 'Gestor',
  horas: 'Horas Trabalhadas',
  producao: 'Producao',
};

export function ModuloSelector() {
  const { menuData, menuLoading, menuError, refetchMenu, selectModule } = useModule();
  const navigate = useNavigate();
  const appMode = useAppMode();
  const { irrestrito, permissoes } = useAuth();

  useEffect(() => {
    if (irrestrito) return;
    if (!permissoes || permissoes.length === 0) return;

    const targetForm = permissoes.find((p) => p.formulario_start === 1) || permissoes[0];
    if (!targetForm) return;
    const route = formRouteMap[targetForm.nome];
    if (!route) return;
    const mod = menuData.find((m) => m.formularios.some((f) => f.nome === targetForm.nome));
    if (mod) selectModule(mod);
    navigate(route, { replace: true });
  }, [irrestrito, permissoes, navigate, menuData, selectModule]);

  useEffect(() => {
    if (menuLoading || !menuData.length) return;
    if (!appMode) return;

    const modName = MODE_MODULE_MAP[appMode];
    const mod = menuData.find((m) => normalizeKey(m.nome) === normalizeKey(modName));
    if (!mod) return;

    selectModule(mod);
    const target = mod.formularios.find((f) => f.abertura === 1) || mod.formularios[0];
    if (target) {
      const route = formRouteMap[target.nome];
      if (route) navigate(route, { replace: true });
    }
  }, [menuLoading, menuData, appMode, selectModule, navigate]);

  useEffect(() => {
    if (menuLoading || !menuData.length) return;
    if (!irrestrito) return;
    if (appMode) return;
    if (sessionStorage.getItem('moduloInicialRedirectDone')) return;

    fetchSettings().then((settings) => {
      const moduloId = settings?.display?.moduloInicialId;
      const formularioId = settings?.display?.formularioInicialId;
      if (!moduloId || !formularioId) return;

      const mod = menuData.find((m) => m.id === moduloId);
      if (!mod) return;

      const target = mod.formularios.find((f) => f.id === formularioId);
      if (!target) return;

      const route = formRouteMap[target.nome];
      if (!route) return;

      sessionStorage.setItem('moduloInicialRedirectDone', '1');
      selectModule(mod);
      navigate(route, { replace: true });
    }).catch(() => {});
  }, [menuLoading, menuData, irrestrito, appMode, selectModule, navigate]);

  const handleSelect = (mod: typeof menuData[0]) => {
    selectModule(mod);
    const target = mod.formularios.find((f) => f.abertura === 1) || mod.formularios[0];
    if (target) {
      const route = formRouteMap[target.nome];
      navigate(route || '/');
    }
  };

  const content = () => {
    if (!irrestrito && permissoes?.length > 0) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-accent-primary" />
            <p className="text-sm text-text-muted">Redirecionando...</p>
          </div>
        </div>
      );
    }

    if (menuLoading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-accent-primary" />
            <p className="text-sm text-text-muted">Carregando modulos...</p>
          </div>
        </div>
      );
    }

    if (menuError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-accent-red/10 flex items-center justify-center">
              <RefreshCw size={28} className="text-accent-red" />
            </div>
            <p className="text-sm text-text-muted">Erro ao carregar os modulos</p>
            <button
              onClick={refetchMenu}
              className="flex items-center gap-1.5 text-sm text-accent-primary hover:underline font-medium"
            >
              <RefreshCw size={14} /> Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    const modules = appMode
      ? menuData.filter((m) => m.nome === MODE_MODULE_MAP[appMode])
      : menuData;

    if (modules.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-base text-text-muted">Nenhum modulo disponivel para esta empresa</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto py-8 px-2">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground-primary">Selecione um Modulo</h1>
          <p className="text-sm text-text-muted mt-1">Escolha um modulo para acessar suas funcionalidades</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod) => {
            const mi = getModuleIcon(mod.nome);
            return (
              <button
                key={mod.id}
                onClick={() => handleSelect(mod)}
                className="group relative flex flex-col items-center text-center p-8 rounded-2xl border border-border-subtle bg-bg-card hover:border-accent-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-200">
                  <img src={getModuleImage(mod.nome, mi.color)} alt={mod.nome} className="w-full h-full" />
                </div>
                <h3 className="text-base font-semibold text-foreground-primary mb-1">{mod.nome}</h3>
                {mod.descricao && (
                  <p className="text-xs text-text-muted mb-3 line-clamp-2">{mod.descricao}</p>
                )}
                <div className="flex items-center gap-1 text-xs font-medium text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span>Acessar</span>
                  <ArrowRight size={12} />
                </div>

                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {mod.formularios.slice(0, 4).map((f) => {
                    const fi = getModuleIcon(f.nome);
                    const FIcon = fi.icon;
                    return (
                      <span
                        key={f.id}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-bg-muted text-[10px] text-text-muted"
                      >
                        <FIcon size={10} style={{ color: fi.color }} />
                        {f.nome}
                      </span>
                    );
                  })}
                  {mod.formularios.length > 4 && (
                    <span className="text-[10px] text-text-muted px-1">+{mod.formularios.length - 4}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return <Layout>{content()}</Layout>;
}
