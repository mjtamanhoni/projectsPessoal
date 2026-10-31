export interface EmpresaPublic {
  id: number;
  razao_social: string;
  fantasia: string;
  cnpj_cpf?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  logomarca?: string;
}

export interface LoginResponse {
  id: number;
  nome: string;
  email: string;
  usuario: string;
  token: string;
  empresa: number;
  is_superadmin: boolean;
  empresa_info?: EmpresaPublic;
}

export interface TituloPagar {
  empresa_id?: number;
  id?: number;
  usuario_id?: number | null;
  credor: string;
  descricao?: string;
  numero_documento?: string;
  valor_total: number;
  data_emissao?: string;
  data_vencimento: string;
  status?: string;
  total_pago?: number;
  saldo_devedor?: number;
  dias_atraso?: number;
  ultimo_pagamento?: string | null;
}

export interface TituloPagarInput {
  credor: string;
  descricao?: string;
  numero_documento?: string;
  valor_total: number;
  data_emissao?: string;
  data_vencimento: string;
  status?: string;
}

export interface PagamentoEfetuado {
  empresa_id?: number;
  id?: number;
  titulo_id: number;
  usuario_id?: number | null;
  usuario_nome?: string;
  data_pagamento: string;
  valor_pago: number;
  forma_pagamento?: string;
  observacao?: string;
  criado_em?: string;
}

export interface PagamentoInput {
  titulo_id: number;
  data_pagamento: string;
  valor_pago: number;
  forma_pagamento?: string;
  observacao?: string;
}

export interface ServerEndpoint {
  host: string;
  port: number;
}

const SERVER_KEY = 'titulos.server';
const SERVERS_KEY = 'titulos.servers';
export const TOKEN_KEY = 'titulos.token';
const REQUEST_TIMEOUT_MS = 10000;

export const SERVIDOR_PADRAO: ServerEndpoint = {
  host: import.meta.env.VITE_SERVER_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_SERVER_PORT || '9001', 10),
};

let ultimoServidor: ServerEndpoint | null = null;

function getServerConfigLegacy(): ServerEndpoint {
  try {
    const raw = localStorage.getItem(SERVER_KEY);
    if (raw) {
      const c = JSON.parse(raw) as Partial<ServerEndpoint>;
      if (c && c.host) return { host: String(c.host), port: Number(c.port) || SERVIDOR_PADRAO.port };
    }
  } catch {
    /* ignora */
  }
  return { ...SERVIDOR_PADRAO };
}

export function getServerConfig(): ServerEndpoint {
  return getServerList()[0];
}

export function getServerList(): ServerEndpoint[] {
  try {
    const raw = localStorage.getItem(SERVERS_KEY);
    if (raw) {
      const list = JSON.parse(raw) as ServerEndpoint[];
      if (Array.isArray(list) && list.length > 0) {
        const valid = list
          .filter((s) => s && s.host)
          .map((s) => ({ host: String(s.host), port: Number(s.port) || SERVIDOR_PADRAO.port }));
        if (valid.length > 0) return valid;
      }
    }
  } catch {
    /* ignora */
  }
  return [getServerConfigLegacy()];
}

export function setServerList(list: ServerEndpoint[]) {
  const valid = list
    .filter((s) => s && s.host.trim())
    .map((s) => ({ host: s.host.trim(), port: Number(s.port) || SERVIDOR_PADRAO.port }));
  if (valid.length === 0) return;
  localStorage.setItem(SERVERS_KEY, JSON.stringify(valid));
  localStorage.setItem(SERVER_KEY, JSON.stringify(valid[0]));
  ultimoServidor = null;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('titulos.user');
    localStorage.removeItem('titulos.empresa');
  } catch {
    /* ignora */
  }
}

async function request(path: string, options: RequestInit = {}, autenticado = true): Promise<Response> {
  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) ?? {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (autenticado) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const servers = getServerList();
  const ordem = ultimoServidor
    ? [ultimoServidor, ...servers.filter((s) => !(s.host === ultimoServidor?.host && s.port === ultimoServidor?.port))]
    : servers;

  let res: Response | null = null;

  for (const srv of ordem) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      res = await fetch(`http://${srv.host}:${srv.port}${path}`, { ...options, headers, signal: controller.signal });
      clearTimeout(timer);
      ultimoServidor = srv;
      break;
    } catch {
      clearTimeout(timer);
    }
  }

  if (!res) {
    const { host, port } = getServerConfig();
    throw new Error(
      `Não foi possível conectar ao servidor (${host}:${port}). Confira o endereço em Configurações.`
    );
  }

  if (res.status === 401 && autenticado) {
    clearSession();
    window.dispatchEvent(new CustomEvent('titulos:unauthorized'));
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
    throw new Error(d?.erro || d?.error || `Erro ${res.status}`);
  }
  return data;
}

export function extrairErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Erro desconhecido';
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

export async function loginApi(body: {
  login?: string;
  senha?: string;
  pin?: string;
  empresa: number | string;
}): Promise<LoginResponse> {
  const res = await request('/usuario/login', { method: 'POST', body: JSON.stringify(body) }, false);
  return (await parseResponse(res)) as LoginResponse;
}

export async function listarTitulos(): Promise<TituloPagar[]> {
  const res = await request('/titulosPagar');
  return (await parseResponse(res)) as TituloPagar[];
}

export async function salvarTitulo(data: TituloPagarInput): Promise<void> {
  const res = await request('/titulosPagar', { method: 'POST', body: JSON.stringify(data) });
  await parseResponse(res);
}

export async function listarPagamentos(tituloId: number): Promise<PagamentoEfetuado[]> {
  const res = await request(`/pagamentosEfetuados?titulo_id=${encodeURIComponent(String(tituloId))}`);
  return (await parseResponse(res)) as PagamentoEfetuado[];
}

export async function salvarPagamento(data: PagamentoInput): Promise<{ status?: string } | null> {
  const res = await request('/pagamentosEfetuados', { method: 'POST', body: JSON.stringify(data) });
  return (await parseResponse(res)) as { status?: string } | null;
}

export const VERSAO_APP: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
