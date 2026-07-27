import {
  Receipt, CreditCard, Users, Building2, Tags, Wrench, ClipboardList,
  Building, Link2, ShieldCheck, UserCog, Package, ShoppingCart,
  Factory, DollarSign, TrendingUp, List, Clock, Minus, BarChart3,
  LayoutDashboard, Settings, BookOpen, AlertTriangle, CirclePlus,
  Cog, Calculator, LayoutGrid, Archive, Trash2, XCircle, Zap,
  type LucideIcon,
} from 'lucide-react';

export interface ModuleIconInfo {
  icon: LucideIcon;
  color: string;
  bgGradient: string;
}

const moduleIconMap: Record<string, ModuleIconInfo> = {
  // === Módulos ===
  Gestor: {
    icon: Receipt,
    color: '#16a34a',
    bgGradient: 'from-green-500/20 to-green-600/10',
  },
  Financeiro: {
    icon: Receipt,
    color: '#16a34a',
    bgGradient: 'from-green-500/20 to-green-600/10',
  },
  Cadastros: {
    icon: BookOpen,
    color: '#2563eb',
    bgGradient: 'from-blue-500/20 to-blue-600/10',
  },
  Producao: {
    icon: Factory,
    color: '#a855f7',
    bgGradient: 'from-purple-500/20 to-purple-600/10',
  },
  'Producao V2': {
    icon: Factory,
    color: '#a855f7',
    bgGradient: 'from-purple-500/20 to-purple-600/10',
  },
  Administrativo: {
    icon: UserCog,
    color: '#06b6d4',
    bgGradient: 'from-cyan-500/20 to-cyan-600/10',
  },
  Geral: {
    icon: UserCog,
    color: '#06b6d4',
    bgGradient: 'from-cyan-500/20 to-cyan-600/10',
  },
  'Recursos Humanos': {
    icon: Users,
    color: '#7c3aed',
    bgGradient: 'from-violet-500/20 to-violet-600/10',
  },
  'Controle de Horas': {
    icon: Clock,
    color: '#3b82f6',
    bgGradient: 'from-blue-500/20 to-blue-600/10',
  },
  Estoques: {
    icon: Package,
    color: '#65a30d',
    bgGradient: 'from-lime-500/20 to-lime-600/10',
  },
  Relatorios: {
    icon: BarChart3,
    color: '#1e293b',
    bgGradient: 'from-slate-700/20 to-slate-800/10',
  },
  Vendas: {
    icon: DollarSign,
    color: '#16a34a',
    bgGradient: 'from-green-500/20 to-green-600/10',
  },
  RH: {
    icon: Users,
    color: '#7c3aed',
    bgGradient: 'from-violet-500/20 to-violet-600/10',
  },

  // === Formulários ===
  Dashboard: {
    icon: LayoutDashboard,
    color: '#0284c7',
    bgGradient: 'from-sky-600/20 to-sky-700/10',
  },
  'Contas a Pagar': {
    icon: CreditCard,
    color: '#dc2626',
    bgGradient: 'from-red-500/20 to-red-600/10',
  },
  'Contas a Receber': {
    icon: Receipt,
    color: '#16a34a',
    bgGradient: 'from-green-500/20 to-green-600/10',
  },
  Clientes: {
    icon: Users,
    color: '#2563eb',
    bgGradient: 'from-blue-500/20 to-blue-600/10',
  },
  Fornecedores: {
    icon: Building2,
    color: '#f97316',
    bgGradient: 'from-orange-500/20 to-orange-600/10',
  },
  Categorias: {
    icon: Tags,
    color: '#8b5cf6',
    bgGradient: 'from-violet-500/20 to-violet-600/10',
  },
  Servicos: {
    icon: Wrench,
    color: '#64748b',
    bgGradient: 'from-slate-500/20 to-slate-600/10',
  },
  Formularios: {
    icon: ClipboardList,
    color: '#14b8a6',
    bgGradient: 'from-teal-500/20 to-teal-600/10',
  },
  'Usuario x Formulario': {
    icon: Link2,
    color: '#0ea5e9',
    bgGradient: 'from-sky-500/20 to-sky-600/10',
  },
  Usuarios: {
    icon: UserCog,
    color: '#7c3aed',
    bgGradient: 'from-violet-500/20 to-violet-600/10',
  },
  'Horas Trabalhadas': {
    icon: Clock,
    color: '#3b82f6',
    bgGradient: 'from-blue-500/20 to-blue-600/10',
  },
  'Horas Excedidas': {
    icon: AlertTriangle,
    color: '#dc2626',
    bgGradient: 'from-red-500/20 to-red-600/10',
  },
  Abatimentos: {
    icon: Minus,
    color: '#a855f7',
    bgGradient: 'from-purple-500/20 to-purple-600/10',
  },
  'Relatorio Financeiro': {
    icon: TrendingUp,
    color: '#059669',
    bgGradient: 'from-emerald-500/20 to-emerald-600/10',
  },
  'Relatorio Clientes': {
    icon: Users,
    color: '#2563eb',
    bgGradient: 'from-blue-500/20 to-blue-600/10',
  },
  'Relatorio Fornecedores': {
    icon: Building2,
    color: '#f97316',
    bgGradient: 'from-orange-500/20 to-orange-600/10',
  },
  'Relatorio Categorias': {
    icon: Tags,
    color: '#8b5cf6',
    bgGradient: 'from-violet-500/20 to-violet-600/10',
  },
  'Relatorio Usuarios': {
    icon: UserCog,
    color: '#7c3aed',
    bgGradient: 'from-violet-500/20 to-violet-600/10',
  },
  'Relatorio Formularios': {
    icon: ClipboardList,
    color: '#14b8a6',
    bgGradient: 'from-teal-500/20 to-teal-600/10',
  },
  Empresas: {
    icon: Building2,
    color: '#059669',
    bgGradient: 'from-emerald-500/20 to-emerald-600/10',
  },
  Insumos: {
    icon: Package,
    color: '#65a30d',
    bgGradient: 'from-lime-500/20 to-lime-600/10',
  },
  'Compras Insumo': {
    icon: ShoppingCart,
    color: '#f59e0b',
    bgGradient: 'from-amber-500/20 to-amber-600/10',
  },
  'Produtos Fabricados': {
    icon: Factory,
    color: '#a855f7',
    bgGradient: 'from-purple-500/20 to-purple-600/10',
  },
  'Custos Adicionais': {
    icon: CirclePlus,
    color: '#f43f5e',
    bgGradient: 'from-rose-500/20 to-rose-600/10',
  },
  Fabricacoes: {
    icon: Cog,
    color: '#8b5cf6',
    bgGradient: 'from-violet-500/20 to-violet-600/10',
  },
  'Vendas Produto': {
    icon: DollarSign,
    color: '#16a34a',
    bgGradient: 'from-green-500/20 to-green-600/10',
  },
  'Receitas Ingredientes': {
    icon: List,
    color: '#0ea5e9',
    bgGradient: 'from-sky-500/20 to-sky-600/10',
  },
  'Custos Fab.': {
    icon: Calculator,
    color: '#64748b',
    bgGradient: 'from-slate-500/20 to-slate-600/10',
  },
  'Estoque Insumo': {
    icon: Archive,
    color: '#65a30d',
    bgGradient: 'from-lime-500/20 to-lime-600/10',
  },
  'Estoque Produto Fabricado': {
    icon: Package,
    color: '#84cc16',
    bgGradient: 'from-lime-400/20 to-lime-500/10',
  },
  Modulos: {
    icon: LayoutGrid,
    color: '#06b6d4',
    bgGradient: 'from-cyan-500/20 to-cyan-600/10',
  },
  'Modulo x Formulario': {
    icon: Link2,
    color: '#0ea5e9',
    bgGradient: 'from-sky-500/20 to-sky-600/10',
  },
  'Empresa x Modulo': {
    icon: Link2,
    color: '#10b981',
    bgGradient: 'from-emerald-500/20 to-emerald-600/10',
  },
  Configuracoes: {
    icon: Settings,
    color: '#475569',
    bgGradient: 'from-slate-500/20 to-slate-600/10',
  },
  Permissoes: {
    icon: ShieldCheck,
    color: '#eab308',
    bgGradient: 'from-yellow-500/20 to-yellow-600/10',
  },
  'Relatorio Insumos': {
    icon: Package,
    color: '#65a30d',
    bgGradient: 'from-lime-500/20 to-lime-600/10',
  },
  'Relatorio Produtos Fabricados': {
    icon: Factory,
    color: '#a855f7',
    bgGradient: 'from-purple-500/20 to-purple-600/10',
  },
  'Relatorio Fabricacoes': {
    icon: Cog,
    color: '#8b5cf6',
    bgGradient: 'from-violet-500/20 to-violet-600/10',
  },
  'Relatorio Vendas Produto': {
    icon: DollarSign,
    color: '#16a34a',
    bgGradient: 'from-green-500/20 to-green-600/10',
  },
  'Perdas Insumo': {
    icon: Trash2,
    color: '#dc2626',
    bgGradient: 'from-red-500/20 to-red-600/10',
  },
  'Perdas Produto': {
    icon: XCircle,
    color: '#ef4444',
    bgGradient: 'from-red-400/20 to-red-500/10',
  },
  'Uso Consumo': {
    icon: Zap,
    color: '#eab308',
    bgGradient: 'from-yellow-500/20 to-yellow-600/10',
  },
};

const fallbackColors = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e',
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
];

const fallbackGradients = [
  'from-indigo-500/20 to-indigo-600/10',
  'from-violet-500/20 to-violet-600/10',
  'from-purple-500/20 to-purple-600/10',
  'from-fuchsia-500/20 to-fuchsia-600/10',
  'from-rose-500/20 to-rose-600/10',
  'from-red-500/20 to-red-600/10',
  'from-orange-500/20 to-orange-600/10',
  'from-yellow-500/20 to-yellow-600/10',
  'from-lime-500/20 to-lime-600/10',
  'from-green-500/20 to-green-600/10',
  'from-teal-500/20 to-teal-600/10',
  'from-cyan-500/20 to-cyan-600/10',
  'from-sky-500/20 to-sky-600/10',
  'from-blue-500/20 to-blue-600/10',
  'from-indigo-500/20 to-indigo-600/10',
];

let fallbackIndex = 0;

export function getModuleIcon(name: string): ModuleIconInfo {
  const entry = moduleIconMap[name];
  if (entry) return entry;
  const idx = fallbackIndex++ % fallbackColors.length;
  return {
    icon: BookOpen,
    color: fallbackColors[idx],
    bgGradient: fallbackGradients[idx],
  };
}

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

type ImageBuilder = (color: string) => string;

const customImages: Record<string, ImageBuilder> = {
  gestor: (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect width="80" height="80" rx="16" fill="${c}" opacity="0.06"/>
      <text x="40" y="52" text-anchor="middle" font-size="38" font-weight="bold" fill="${c}" opacity="0.45" font-family="sans-serif">$</text>
      <circle cx="18" cy="62" r="6" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.2"/>
      <circle cx="62" cy="58" r="5" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.18"/>
      <circle cx="56" cy="68" r="4" fill="none" stroke="${c}" stroke-width="1.2" opacity="0.15"/>
      <circle cx="26" cy="68" r="3.5" fill="none" stroke="${c}" stroke-width="1.2" opacity="0.15"/>
    </svg>`,

  'horas trabalhadas': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect width="80" height="80" rx="16" fill="${c}" opacity="0.06"/>
      <circle cx="40" cy="38" r="22" fill="none" stroke="${c}" stroke-width="2" opacity="0.3"/>
      <line x1="40" y1="38" x2="40" y2="22" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.4"/>
      <line x1="40" y1="38" x2="54" y2="38" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      <circle cx="40" cy="38" r="2.5" fill="${c}" opacity="0.5"/>
      <line x1="40" y1="16" x2="40" y2="19" stroke="${c}" stroke-width="1.5" opacity="0.2"/>
      <line x1="40" y1="57" x2="40" y2="60" stroke="${c}" stroke-width="1.5" opacity="0.2"/>
      <line x1="18" y1="38" x2="21" y2="38" stroke="${c}" stroke-width="1.5" opacity="0.2"/>
      <line x1="59" y1="38" x2="62" y2="38" stroke="${c}" stroke-width="1.5" opacity="0.2"/>
    </svg>`,

  producao: (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect width="80" height="80" rx="16" fill="${c}" opacity="0.06"/>
      <circle cx="40" cy="38" r="14" fill="none" stroke="${c}" stroke-width="2.5" opacity="0.35"/>
      <circle cx="40" cy="38" r="9" fill="none" stroke="${c}" stroke-width="2" opacity="0.2"/>
      <circle cx="40" cy="38" r="3.5" fill="${c}" opacity="0.3"/>
      <line x1="40" y1="18" x2="40" y2="22" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
      <line x1="40" y1="54" x2="40" y2="58" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
      <line x1="20" y1="38" x2="24" y2="38" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
      <line x1="56" y1="38" x2="60" y2="38" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
      <line x1="25.5" y1="23.5" x2="28.5" y2="26.5" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
      <line x1="54.5" y1="52.5" x2="51.5" y2="49.5" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
      <line x1="54.5" y1="23.5" x2="51.5" y2="26.5" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
      <line x1="25.5" y1="52.5" x2="28.5" y2="49.5" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
    </svg>`,
};

function makeSvgUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getModuleImage(name: string, color: string): string {
  const key = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const builder = customImages[key];
  if (builder) return makeSvgUri(builder(color));

  const rng = createRng(hashString(name));

  const shapes: string[] = [];

  const numElements = 3 + Math.floor(rng() * 4);

  for (let i = 0; i < numElements; i++) {
    const cx = 15 + rng() * 50;
    const cy = 15 + rng() * 50;
    const size = 8 + rng() * 20;
    const opacity = 0.08 + rng() * 0.25;
    const type = Math.floor(rng() * 5);

    switch (type) {
      case 0: {
        shapes.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${size.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(3)}"/>`);
        break;
      }
      case 1: {
        const rot = rng() * 360;
        shapes.push(
          `<rect x="${(cx - size).toFixed(1)}" y="${(cy - size * 0.6).toFixed(1)}" width="${(size * 2).toFixed(1)}" height="${(size * 1.2).toFixed(1)}" rx="${(size * 0.2).toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(3)}" transform="rotate(${rot.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`
        );
        break;
      }
      case 2: {
        const rot = rng() * 360;
        const h = size * 1.2;
        const w = size * 1.2;
        const pts = `${cx.toFixed(1)},${(cy - h).toFixed(1)} ${(cx + w * 0.866).toFixed(1)},${(cy + h * 0.5).toFixed(1)} ${(cx - w * 0.866).toFixed(1)},${(cy + h * 0.5).toFixed(1)}`;
        shapes.push(
          `<polygon points="${pts}" fill="${color}" opacity="${opacity.toFixed(3)}" transform="rotate(${rot.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`
        );
        break;
      }
      case 3: {
        const rot = rng() * 360;
        shapes.push(
          `<rect x="${(cx - size * 0.5).toFixed(1)}" y="${(cy - size * 0.5).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${(size * 0.05).toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(3)}" transform="rotate(${rot.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`
        );
        break;
      }
      case 4: {
        shapes.push(
          `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${size.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${(2 + rng() * 3).toFixed(1)}" opacity="${opacity.toFixed(3)}"/>`
        );
        break;
      }
    }
  }

  const numDots = 4 + Math.floor(rng() * 6);
  for (let i = 0; i < numDots; i++) {
    const dx = 8 + rng() * 64;
    const dy = 8 + rng() * 64;
    const dr = 1.5 + rng() * 3;
    shapes.push(`<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${dr.toFixed(1)}" fill="${color}" opacity="0.25"/>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="16" fill="${color}" opacity="0.06"/>${shapes.join('')}</svg>`;
  return makeSvgUri(svg);
}
