import { useRef, useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Settings as SettingsIcon, LogOut, PanelLeftClose, PanelLeftOpen,
  ArrowLeft, LayoutDashboard, RefreshCw, Building, BookOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useAppMode } from '@/context/AppModeContext';
import { getLogo } from '@/lib/settings';
import { getUploadsUrl } from '@/lib/empresaLogo';
import { getModuleIcon, getModuleImage } from '@/lib/moduleIcons';
import { formRouteMap } from '@/lib/permissions';

const superadminFormNames = new Set([
  'Modulos',
  'Formularios',
  'Modulo x Formulario',
  'Empresa x Modulo',
  'Empresas',
  'Relatorio Formularios',
]);

const moduleSubGroups: Record<string, Array<{ label: string; forms: string[] }>> = {
  Geral: [
    {
      label: 'Cadastro',
      forms: ['Clientes', 'Fornecedores', 'Usuarios','Marcas'],
    },
    {
      label: 'Configuracoes',
      forms: ['Configuracoes', 'Lancamentos Automaticos', 'Permissoes', 'Usuario x Formulario'],
    },
    {
      label: 'Configurações do Sistema',
      forms: ['Modulos', 'Formularios', 'Modulo x Formulario', 'Empresa x Modulo', 'Empresas', 'Relatorio Formularios'],
    },
    {
      label: 'Relatorios',
      forms: ['Relatorio Usuarios'],
    },
  ],
  Producao: [
    {
      label: 'Cadastro',
      forms: ['Insumos', 'Marcas', 'Produtos Fabricados', 'Receitas Ingredientes', 'Custos Adicionais'],
    },
    {
      label: 'Movimento',
      forms: ['Compras Insumo', 'Fabricacoes', 'Vendas Produto', 'Encomendas', 'Estoque Insumo', 'Estoque Produto Fabricado', 'Perdas Insumo', 'Perdas Produto', 'Uso Consumo'],
    },
    {
      label: 'Relatorios',
      forms: ['Relatorio Insumos', 'Relatorio Produtos Fabricados', 'Relatorio Fabricacoes', 'Relatorio Vendas Produto'],
    },
  ],
  'Producao V2': [
    {
      label: 'Cadastro',
      forms: ['Insumos', 'Marcas', 'Produtos Fabricados', 'Receitas Ingredientes', 'Custos Adicionais'],
    },
    {
      label: 'Movimento',
      forms: ['Compras Insumo', 'Fabricacoes', 'Vendas Produto', 'Encomendas', 'Estoque Insumo', 'Estoque Produto Fabricado', 'Perdas Insumo', 'Perdas Produto', 'Uso Consumo'],
    },
    {
      label: 'Relatorios',
      forms: ['Relatorio Insumos', 'Relatorio Produtos Fabricados', 'Relatorio Fabricacoes', 'Relatorio Vendas Produto'],
    },
  ],
};

const extraFormNames = ['Clientes', 'Fornecedores'];

const routeBlacklist = new Set(['/fabricacao-custos-adicionais']);

const MODE_MODULE_MAP: Record<string, string> = {
  gestor: 'Gestor',
  horas: 'Horas Trabalhadas',
  producao: 'Producao',
};

function normalizeKey(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function findSubGroups(moduleName: string) {
  const exact = moduleSubGroups[moduleName];
  if (exact) return exact;
  const norm = normalizeKey(moduleName);
  for (const [key, groups] of Object.entries(moduleSubGroups)) {
    if (normalizeKey(key) === norm) return groups;
  }
  return null;
}

function ModuleForms({ module, collapsed }: { module: { nome: string; formularios: Array<{ id: number; nome: string }> }; collapsed: boolean }) {
  const { menuData } = useModule();
  const { isSuperadmin } = useAuth();
  const subGroups = findSubGroups(module.nome);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    if (subGroups) {
      for (const sg of subGroups) {
        if (sg.label !== 'Configurações do Sistema' || isSuperadmin) {
          map[sg.label] = true;
        }
      }
    }
    return map;
  });

  const formByName = new Map<string, { id: number; nome: string }>();
  for (const f of module.formularios) {
    formByName.set(f.nome, f);
  }

  const allFormsByName = new Map<string, { id: number; nome: string }>();
  for (const mod of menuData) {
    for (const f of mod.formularios) {
      if (!allFormsByName.has(f.nome)) {
        allFormsByName.set(f.nome, f);
      }
    }
  }

  const validForms = module.formularios.filter((f) => {
    const route = formRouteMap[f.nome];
    if (!route || routeBlacklist.has(route)) return false;
    return true;
  });

  if (!subGroups) {
    const isHoras = module.nome === 'Horas Trabalhadas' || module.nome.toLowerCase().includes('horas');
    const isProducao = module.nome === 'Producao' || module.nome.toLowerCase().includes('producao');
    return (
      <div className="space-y-0.5">
        {isHoras && <FormLink key={-1} f={{ id: -1, nome: 'Dashboard Horas' }} collapsed={collapsed} />}
        {isProducao && <FormLink key={-2} f={{ id: -2, nome: 'Dashboard Produção' }} collapsed={collapsed} />}
        {validForms.map((f) => (
          <FormLink key={f.id} f={f} collapsed={collapsed} />
        ))}
      </div>
    );
  }

  const groupedForms = new Map<string, Array<{ id: number; nome: string }>>();
  for (const sg of subGroups) {
    groupedForms.set(sg.label, []);
  }

  const cadastroForms = subGroups.find((sg) => sg.label === 'Cadastro');
  if (cadastroForms) {
    for (const fn of extraFormNames) {
      if (!cadastroForms.forms.includes(fn)) {
        cadastroForms.forms.push(fn);
      }
    }
  }

  const allGrouped = new Set<string>();
  for (const sg of subGroups) {
    for (const fn of sg.forms) {
      allGrouped.add(fn);
    }
  }

  for (const sg of subGroups) {
    const list = groupedForms.get(sg.label)!;
    for (const fn of sg.forms) {
      const f = formByName.get(fn) || allFormsByName.get(fn);
      if (f) {
        const route = formRouteMap[f.nome];
        if (route && !routeBlacklist.has(route)) {
          list.push(f);
        }
      }
    }
  }

  const ungrouped = validForms.filter((f) => !allGrouped.has(f.nome));

  return (
    <div className="space-y-3">
      {subGroups.filter((sg) => sg.label !== 'Configurações do Sistema' || isSuperadmin).map((sg) => {
        const list = groupedForms.get(sg.label)!;
        if (list.length === 0) return null;
        const isExpanded = expandedGroups[sg.label] ?? true;
        return (
          <div key={sg.label}>
            {!collapsed ? (
              <button
                onClick={() => setExpandedGroups((prev) => ({ ...prev, [sg.label]: !prev[sg.label] }))}
                className="flex items-center gap-1 w-full text-[10px] font-semibold uppercase tracking-wider text-text-muted px-1 mb-1 hover:text-text-primary transition-colors"
              >
                <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▸</span>
                {sg.label}
              </button>
            ) : null}
            {isExpanded && (
              <div className="space-y-0.5">
                {list.map((f) => (
                  <FormLink key={f.id} f={f} collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {ungrouped.length > 0 && (
        <div className="space-y-0.5">
          {ungrouped.map((f) => (
            <FormLink key={f.id} f={f} collapsed={collapsed} />
          ))}
        </div>
      )}
    </div>
  );
}

function FormLink({ f, collapsed }: { f: { id: number; nome: string }; collapsed: boolean }) {
  const { temAcesso, isSuperadmin } = useAuth();
  const route = formRouteMap[f.nome];
  if (!route || !temAcesso(route)) return null;
  if (superadminFormNames.has(f.nome) && !isSuperadmin) return null;
  const fi = getModuleIcon(f.nome);
  const FIcon = fi.icon;
  return (
    <NavLink
      to={route}
      className={({ isActive }) =>
        `sidebar-link ${collapsed ? 'justify-center px-2' : ''} ${isActive ? 'active' : ''}`
      }
      title={collapsed ? f.nome : undefined}
    >
      <div className={`flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br ${fi.bgGradient}`}>
        <FIcon size={14} style={{ color: fi.color }} />
      </div>
      {!collapsed && <span>{f.nome}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, empresaNome, logout, temAcesso, permissoes, irrestrito, empresa } = useAuth();
  const { selectedModule, selectModule, menuData, menuLoading, menuError, refetchMenu } = useModule();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();
  const appMode = useAppMode();

  const logo = getLogo() ?? (empresa?.logomarca ? getUploadsUrl(empresa.logomarca) : null);
  const visibleSettings = temAcesso('/settings');

  useEffect(() => {
    if (!appMode || selectedModule || menuLoading || !menuData.length) return;
    const modName = MODE_MODULE_MAP[appMode];
    const mod = menuData.find((m) => normalizeKey(m.nome) === normalizeKey(modName));
    if (mod) selectModule(mod);
  }, [appMode, selectedModule, menuLoading, menuData, selectModule]);

  const location = useLocation();

  useEffect(() => {
    if (selectedModule || !menuData.length) return;
    for (const mod of menuData) {
      for (const f of mod.formularios) {
        if (formRouteMap[f.nome] === location.pathname) {
          selectModule(mod);
          return;
        }
      }
    }
  }, [location.pathname, selectedModule, menuData, selectModule]);

  const isAppMode = !!appMode;

  const linkClass = (isActive: boolean) =>
    `sidebar-link ${collapsed ? 'justify-center px-2' : ''} ${isActive ? 'active' : ''}`;

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} min-h-screen bg-bg-card border-r border-border-subtle flex flex-col transition-all duration-300 relative`}
    >
      <div className="p-4 border-b border-border-subtle flex items-center gap-3">
        {!collapsed && (
          <div className="flex-1 min-w-0 flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="Logo" className="h-10 max-w-28 object-contain shrink-0" />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-lg font-heading font-bold text-accent-primary truncate">Gestor Financeiro</h1>
              <p className="text-xs text-text-muted capitalize truncate">{user?.nome}</p>
              {empresaNome && <p className="text-[11px] text-text-muted/60 truncate">{empresaNome}</p>}
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className={`p-1.5 rounded-lg hover:bg-background-hover transition-colors shrink-0 ${collapsed ? 'mx-auto' : ''}`}
          title={collapsed ? 'Expandir menu' : 'Retrair menu'}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} className="text-text-secondary" />
          ) : (
            <PanelLeftClose size={18} className="text-text-secondary" />
          )}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {selectedModule ? (
          <div>
            {!isAppMode && (irrestrito || permissoes.length !== 1) && (
              <button
                onClick={() => { selectModule(null); navigate('/'); }}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors mb-3 px-1"
              >
                <ArrowLeft size={14} />
                {!collapsed && <span>Modulos</span>}
              </button>
            )}

            {!collapsed && (
              <div className="flex items-center gap-2 px-1 mb-3 pb-2 border-b border-border-subtle">
                {(() => {
                  const mi = getModuleIcon(selectedModule.nome);
                  return (
                    <>
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                        <img src={getModuleImage(selectedModule.nome, mi.color)} alt={selectedModule.nome} className="w-full h-full" />
                      </div>
                      <span className="text-sm font-semibold text-text-primary truncate">{selectedModule.nome}</span>
                    </>
                  );
                })()}
              </div>
            )}

            <ModuleForms module={selectedModule} collapsed={collapsed} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
            {collapsed ? (
              <Building size={20} className="text-text-muted" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 flex items-center justify-center mb-3">
                  <LayoutDashboard size={24} className="text-accent-primary" />
                </div>
                <p className="text-sm font-medium text-text-primary mb-1">Bem-vindo!</p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Selecione um modulo abaixo para comecar
                </p>
              </>
            )}
          </div>
        )}

        {menuLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-primary" />
          </div>
        )}
        
        {!menuLoading && !menuError && menuData.length === 0 && !selectedModule && (
          <div className="flex flex-col items-center gap-2 py-3 px-2 text-center">
            <p className="text-xs text-text-muted">Nenhum modulo vinculado a esta empresa</p>
            <NavLink
              to="/empresas"
              className="flex items-center gap-1 text-xs text-accent-primary hover:underline"
            >
              <Building size={12} /> Gerenciar modulos
            </NavLink>
          </div>
        )}

        {menuError && (
          <div className="flex flex-col items-center gap-2 py-3 px-2">
            <p className="text-xs text-text-muted text-center">Erro ao carregar menu</p>
            <button
              onClick={refetchMenu}
              className="flex items-center gap-1 text-xs text-accent-primary hover:underline"
            >
              <RefreshCw size={12} /> Tentar novamente
            </button>
          </div>
        )}

        <div className={`border-t border-border-subtle pt-2 mt-2 space-y-0.5 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          {!irrestrito && permissoes.length !== 1 && (
            <NavLink
              to="/"
              end
              className={({ isActive }) => linkClass(isActive)}
              title={collapsed ? 'Modulos' : undefined}
            >
              <Building size={20} />
              {!collapsed && <span>Modulos</span>}
            </NavLink>
          )}
          <NavLink
            to="/help"
            className={({ isActive }) => linkClass(isActive)}
            title={collapsed ? 'Ajuda' : undefined}
          >
            <BookOpen size={20} />
            {!collapsed && <span>Ajuda</span>}
          </NavLink>
          {visibleSettings && (
            <NavLink
              to="/settings"
              className={({ isActive }) => linkClass(isActive)}
              title={collapsed ? 'Configuracoes' : undefined}
            >
              <SettingsIcon size={20} />
              {!collapsed && <span>Configuracoes</span>}
            </NavLink>
          )}
        </div>
      </nav>

      <div className="p-3 border-t border-border-subtle">
        <button onClick={logout} className={`${linkClass(false)} w-full`} title={collapsed ? 'Sair' : undefined}>
          <LogOut size={20} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
