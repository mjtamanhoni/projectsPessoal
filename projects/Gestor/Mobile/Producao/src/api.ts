export interface EmpresaPublic {
  id: number;
  razao_social: string;
  fantasia: string;
}

export interface LoginResponse {
  id: number;
  nome: string;
  email: string;
  usuario: string;
  token: string;
  empresa: number;
  is_superadmin: boolean;
}

export interface EncomendaItem {
  id?: number;
  produto_fabricado_id: number;
  produto_nome?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface Encomenda {
  id?: number;
  codigo?: number;
  cliente_id?: number;
  cliente_nome?: string;
  data_encomenda: string;
  valor_total?: number;
  observacao?: string;
  status?: number;
  baixado?: boolean;
  venda_id?: number;
  qtd_itens?: number;
  itens?: EncomendaItem[];
}

export interface DashboardData {
  kpis: {
    total_vendas: number;
    qtd_vendida: number;
    qtd_vendas: number;
    total_compras: number;
    qtd_compras: number;
    qtd_fabricada: number;
    custo_total: number;
    qtd_fabricacoes: number;
    lucro_bruto: number;
    lucro_liquido: number;
  };
  mensal_vendas: { mes: number; valor: number; qtd: number; qtd_vendas: number }[];
  mensal_compras: { mes: number; valor: number; qtd: number }[];
  mensal_fabricacao: { mes: number; qtd_fabricada: number; custo_total: number; qtd: number }[];
  diario_fabricacao: { dia: string; qtd_fabricada: number }[];
  diario_vendas: { dia: string; valor: number }[];
}

const SERVER_KEY = 'producao.server';
const TOKEN_KEY = 'producao.token';

export function getServerConfig(): { host: string; port: number } {
  try {
    const raw = localStorage.getItem(SERVER_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && c.host) return { host: String(c.host), port: Number(c.port) || 9000 };
    }
  } catch {
    /* ignora */
  }
  return { host: 'localhost', port: 9000 };
}

export function setServerConfig(host: string, port: number) {
  localStorage.setItem(SERVER_KEY, JSON.stringify({ host, port }));
}

export function getBaseURL(): string {
  const { host, port } = getServerConfig();
  return `http://${host}:${port}`;
}

async function request(path: string, options: RequestInit = {}, autenticado = false): Promise<Response> {
  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) ?? {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (autenticado) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(getBaseURL() + path, { ...options, headers });
  } catch {
    const { host, port } = getServerConfig();
    throw new Error(
      `Não foi possível conectar ao servidor (${host}:${port}). Configure o endereço em "Configurações do Servidor".`
    );
  }

  if (res.status === 401 && autenticado) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('producao.user');
    localStorage.removeItem('producao.empresaNome');
    window.dispatchEvent(new CustomEvent('producao:unauthorized'));
  }
  return res;
}

async function parseResponse(res: Response): Promise<unknown> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* sem corpo */
  }
  if (!res.ok) {
    const d = data as { erro?: string; error?: string } | null;
    const msg = d?.erro || d?.error || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export function extrairErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Erro desconhecido';
}

export async function listarEmpresas(): Promise<EmpresaPublic[]> {
  const res = await request('/empresaPublic');
  return (await parseResponse(res)) as EmpresaPublic[];
}

export async function loginApi(body: {
  login?: string;
  senha?: string;
  pin?: string;
  empresa: number;
}): Promise<LoginResponse> {
  const res = await request('/usuario/login', { method: 'POST', body: JSON.stringify(body) });
  return (await parseResponse(res)) as LoginResponse;
}

export async function fetchDashboard(ano: number, mes: number): Promise<DashboardData> {
  const res = await request(`/producaoDashboard?ano=${ano}&mes=${mes}`, {}, true);
  const d = (await parseResponse(res)) as Record<string, unknown>;
  const num = (v: unknown): number => Number(v) || 0;
  const k = (d.kpis ?? {}) as Record<string, unknown>;
  return {
    kpis: {
      total_vendas: num(k.total_vendas),
      qtd_vendida: num(k.qtd_vendida),
      qtd_vendas: num(k.qtd_vendas),
      total_compras: num(k.total_compras),
      qtd_compras: num(k.qtd_compras),
      qtd_fabricada: num(k.qtd_fabricada),
      custo_total: num(k.custo_total),
      qtd_fabricacoes: num(k.qtd_fabricacoes),
      lucro_bruto: num(k.lucro_bruto),
      lucro_liquido: num(k.lucro_liquido),
    },
    mensal_vendas: ((d.mensal_vendas ?? []) as Record<string, unknown>[]).map((m) => ({
      mes: num(m.mes),
      valor: num(m.valor),
      qtd: num(m.qtd),
      qtd_vendas: num(m.qtd_vendas),
    })),
    mensal_compras: ((d.mensal_compras ?? []) as Record<string, unknown>[]).map((m) => ({
      mes: num(m.mes),
      valor: num(m.valor),
      qtd: num(m.qtd),
    })),
    mensal_fabricacao: ((d.mensal_fabricacao ?? []) as Record<string, unknown>[]).map((m) => ({
      mes: num(m.mes),
      qtd_fabricada: num(m.qtd_fabricada),
      custo_total: num(m.custo_total),
      qtd: num(m.qtd),
    })),
    diario_fabricacao: ((d.diario_fabricacao ?? []) as Record<string, unknown>[]).map((m) => ({
      dia: String(m.dia ?? ''),
      qtd_fabricada: num(m.qtd_fabricada),
    })),
    diario_vendas: ((d.diario_vendas ?? []) as Record<string, unknown>[]).map((m) => ({
      dia: String(m.dia ?? ''),
      valor: num(m.valor),
    })),
  };
}

export async function testServer(host: string, port: number): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`http://${host}:${port}/health`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    throw new Error('Servidor não encontrado');
  } finally {
    clearTimeout(timer);
  }
}

export async function listarEncomendas(): Promise<Encomenda[]> {
  const res = await request('/encomenda', {}, true);
  return (await parseResponse(res)) as Encomenda[];
}

export async function listarEncomendaItens(id: number): Promise<EncomendaItem[]> {
  const res = await request(`/encomenda?id=${id}`, {}, true);
  const rows = (await parseResponse(res)) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: row.item_id != null ? Number(row.item_id) : undefined,
    produto_fabricado_id: Number(row.produto_fabricado_id) || 0,
    produto_nome: row.produto_nome ? String(row.produto_nome) : undefined,
    quantidade: Number(row.quantidade) || 0,
    valor_unitario: Number(row.valor_unitario) || 0,
    valor_total: Number(row.item_valor_total ?? row.valor_total) || 0,
  }));
}

export async function salvarEncomenda(data: Encomenda): Promise<{ id?: number; codigo?: number } | null> {
  const res = await request('/encomenda', { method: 'POST', body: JSON.stringify(data) }, true);
  const parsed = (await parseResponse(res)) as Record<string, unknown> | null;
  if (!parsed) return null;
  return {
    id: parsed.id != null ? Number(parsed.id) : undefined,
    codigo: parsed.codigo != null ? Number(parsed.codigo) : undefined,
  };
}

export async function excluirEncomenda(id: number): Promise<void> {
  const res = await request(`/encomenda?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function gerarVendaDeEncomenda(input: {
  id_encomenda: number;
  data_venda?: string;
  recebido?: boolean;
}): Promise<{ venda_id?: number; mensagem?: string } | null> {
  const res = await request('/encomenda/gerarVenda', { method: 'POST', body: JSON.stringify(input) }, true);
  return (await parseResponse(res)) as { venda_id?: number; mensagem?: string } | null;
}
