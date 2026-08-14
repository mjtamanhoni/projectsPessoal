import { aguarde, aguardePronto } from './aguarde';

export interface EmpresaPublic {
  id: number;
  razao_social: string;
  fantasia: string;
  cnpj_cpf?: string;
  inscricao_estadual_identidade?: string;
  regime_tributario?: string;
  endereco?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  chave_pix?: string;
  logomarca?: string;
  delivery?: number;
}

export interface Cliente {
  id?: number;
  nome: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  email?: string;
  cnpj_cpf?: string;
  status?: number;
}

export interface ProdutoFabricado {
  id?: number;
  nome: string;
  descricao?: string;
  rendimento?: number;
  unidade_medida: string;
  valor_venda_sugerido?: number;
  preco?: number;
  foto?: string;
  ativo?: boolean;
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
  data_entrega?: string;
  valor_total?: number;
  observacao?: string;
  status?: number;
  baixado?: boolean;
  venda_id?: number;
  itens?: EncomendaItem[];
}

export interface CupomPagamento {
  encomenda: Encomenda;
  descricao: string;
}

export interface VendaProdutoItem {
  produto_fabricado_id: number;
  produto_nome?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface VendaProduto {
  id?: number;
  codigo?: number;
  cliente_id?: number;
  cliente_nome?: string;
  data_venda: string;
  valor_total?: number;
  observacao?: string;
  recebido?: boolean;
  itens?: VendaProdutoItem[];
}

const SERVER_KEY = 'cliente.server';
const SERVERS_KEY = 'cliente.servers';
const DOCUMENTO_KEY = 'cliente.documento';
const EMPRESA_SELECIONADA_KEY = 'cliente.empresa.selecionada';
const REQUEST_TIMEOUT_MS = 6000;

export interface ServerEndpoint {
  host: string;
  port: number;
}

export const SERVIDOR_PADRAO: ServerEndpoint = { host: 'mjtsystems-gestor.duckdns.org', port: 9000 };

function getServerConfigLegacy(): { host: string; port: number } {
  try {
    const raw = localStorage.getItem(SERVER_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && c.host) return { host: String(c.host), port: Number(c.port) || 9000 };
    }
  } catch {
    /* ignora */
  }
  return { host: SERVIDOR_PADRAO.host, port: SERVIDOR_PADRAO.port };
}

export function getServerConfig(): { host: string; port: number } {
  return getServerList()[0];
}

export function setServerConfig(host: string, port: number) {
  localStorage.setItem(SERVER_KEY, JSON.stringify({ host, port }));
}

export function getServerList(): ServerEndpoint[] {
  try {
    const raw = localStorage.getItem(SERVERS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        const valid = list
          .filter((s) => s && s.host)
          .map((s) => ({ host: String(s.host), port: Number(s.port) || 9000 }));
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
    .map((s) => ({ host: s.host.trim(), port: Number(s.port) || 9000 }));
  if (valid.length === 0) return;
  localStorage.setItem(SERVERS_KEY, JSON.stringify(valid));
  const first = valid[0];
  localStorage.setItem(SERVER_KEY, JSON.stringify({ host: first.host, port: first.port }));
}

export function getDocumentoLembrado(): string {
  try {
    return localStorage.getItem(DOCUMENTO_KEY) || '';
  } catch {
    return '';
  }
}

export function setDocumentoLembrado(documento: string) {
  try {
    localStorage.setItem(DOCUMENTO_KEY, documento);
  } catch {
    /* ignora */
  }
}

export function getEmpresaSelecionadaMemoria(): EmpresaPublic | null {
  try {
    const raw = localStorage.getItem(EMPRESA_SELECIONADA_KEY);
    if (raw) return JSON.parse(raw) as EmpresaPublic;
  } catch {
    /* ignora */
  }
  return null;
}

export function setEmpresaSelecionadaMemoria(empresa: EmpresaPublic | null) {
  try {
    if (empresa) localStorage.setItem(EMPRESA_SELECIONADA_KEY, JSON.stringify(empresa));
    else localStorage.removeItem(EMPRESA_SELECIONADA_KEY);
  } catch {
    /* ignora */
  }
}

export function getBaseURL(): string {
  const { host, port } = getServerConfig();
  return `http://${host}:${port}`;
}

export function fotoUrl(foto: string): string {
  if (!foto) return '';
  return `${getBaseURL()}/uploads/${foto.split('/').map(encodeURIComponent).join('/')}`;
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) ?? {}) };
  if (options.body) headers['Content-Type'] = 'application/json';

  aguarde(descricaoOperacao(path, options));

  const servers = getServerList();
  let res: Response | null = null;

  try {
    for (const srv of servers) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        res = await fetch(`http://${srv.host}:${srv.port}${path}`, { ...options, headers, signal: controller.signal });
        clearTimeout(timer);
        break;
      } catch {
        clearTimeout(timer);
      }
    }
  } finally {
    aguardePronto();
  }

  if (!res) {
    const { host, port } = getServerConfig();
    throw new Error(
      `Não foi possível conectar ao servidor (${host}:${port}). Configure o endereço em "Configurações do Servidor".`
    );
  }

  return res;
}

function descricaoOperacao(_path: string, options: RequestInit): string {
  const metodo = (options.method ?? 'GET').toUpperCase();
  if (metodo === 'POST') return 'Salvando dados...';
  return 'Carregando dados...';
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

export async function listarEmpresas(apenasDelivery?: boolean): Promise<EmpresaPublic[]> {
  const res = await request(`/empresaPublic${apenasDelivery ? '?delivery=1' : ''}`);
  return (await parseResponse(res)) as EmpresaPublic[];
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

export async function buscarClientePorDocumento(empresa: number, documento: string): Promise<Cliente[]> {
  const res = await request(`/clientePublico?empresa=${empresa}&documento=${encodeURIComponent(documento)}`);
  return (await parseResponse(res)) as Cliente[];
}

export async function criarClientePublico(
  empresa: number,
  data: Cliente
): Promise<{ id?: number; mensagem?: string } | null> {
  const res = await request('/clientePublico', { method: 'POST', body: JSON.stringify({ empresa, ...data }) });
  const parsed = (await parseResponse(res)) as Record<string, unknown> | null;
  if (!parsed) return null;
  return {
    id: parsed.id != null ? Number(parsed.id) : undefined,
    mensagem: parsed.mensagem ? String(parsed.mensagem) : undefined,
  };
}

export async function listarProdutosFabricadosPublico(empresa: number): Promise<ProdutoFabricado[]> {
  const res = await request(`/produtoFabricadoPublico?empresa=${empresa}`);
  return (await parseResponse(res)) as ProdutoFabricado[];
}

export async function criarEncomendaPublica(
  empresa: number,
  data: Encomenda
): Promise<{ id?: number; codigo?: number } | null> {
  const res = await request('/encomendaPublico', { method: 'POST', body: JSON.stringify({ empresa, ...data }) });
  const parsed = (await parseResponse(res)) as Record<string, unknown> | null;
  if (!parsed) return null;
  return {
    id: parsed.id != null ? Number(parsed.id) : undefined,
    codigo: parsed.codigo != null ? Number(parsed.codigo) : undefined,
  };
}

export async function listarEncomendasPublicas(
  empresa: number,
  documento: string
): Promise<Encomenda[]> {
  const res = await request(`/encomendaPublico?empresa=${empresa}&documento=${encodeURIComponent(documento)}`);
  const rows = (await parseResponse(res)) as Record<string, unknown>[];
  const porId = new Map<number, Encomenda>();
  for (const row of rows) {
    const id = Number(row.id ?? 0);
    if (!id) continue;
    let e = porId.get(id);
    if (!e) {
      e = {
        id,
        codigo: id,
        cliente_id: Number(row.cliente_id ?? 0) || undefined,
        cliente_nome: row.cliente_nome ? String(row.cliente_nome) : undefined,
        data_encomenda: String(row.data_encomenda ?? ''),
        data_entrega: row.data_entrega ? String(row.data_entrega) : undefined,
        valor_total: Number(row.valor_total ?? 0) || undefined,
        observacao: row.observacao ? String(row.observacao) : undefined,
        status: Number(row.status ?? 1),
        baixado: !!row.baixado,
        venda_id: row.venda_id != null ? Number(row.venda_id) : undefined,
        itens: [],
      };
      porId.set(id, e);
    }
    if (row.item_id != null) {
      e.itens?.push({
        id: Number(row.item_id),
        produto_fabricado_id: Number(row.produto_fabricado_id ?? 0),
        produto_nome: row.produto_nome ? String(row.produto_nome) : undefined,
        quantidade: Number(row.quantidade ?? 0),
        valor_unitario: Number(row.valor_unitario ?? 0),
        valor_total: Number(row.item_valor_total ?? 0),
      });
    }
  }
  return Array.from(porId.values()).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
}

export async function cancelarEncomendaPublica(
  empresa: number,
  data: { id: number; cliente_id?: number; documento?: string; telefone?: string }
): Promise<{ mensagem?: string } | null> {
  const res = await request('/encomendaPublico/cancelar', {
    method: 'POST',
    body: JSON.stringify({ empresa, ...data }),
  });
  return (await parseResponse(res)) as { mensagem?: string } | null;
}

export async function atualizarItensEncomendaPublica(
  empresa: number,
  data: { id: number; cliente_id?: number; documento?: string; telefone?: string; itens: EncomendaItem[] }
): Promise<{ mensagem?: string; id?: number } | null> {
  const res = await request('/encomendaPublico/itens', {
    method: 'POST',
    body: JSON.stringify({ empresa, ...data }),
  });
  return (await parseResponse(res)) as { mensagem?: string; id?: number } | null;
}