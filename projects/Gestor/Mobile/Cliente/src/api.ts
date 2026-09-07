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
  nr?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  endereco?: string;
  email?: string;
  cnpj_cpf?: string;
  status?: number;
}

export interface IngredientePublico {
  id?: number;
  insumo_id?: number;
  nome: string;
  quantidade?: number;
}

export interface AdicionalPublico {
  adicional_id: number;
  nome: string;
  descricao?: string;
  preco: number;
}

export interface AdicionalItemPedido {
  adicional_id?: number;
  nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total?: number;
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
  ingredientes?: string;
  adicionais?: string;
}

export interface ProdutoVendaItemPublico {
  id: number;
  nome: string;
  pode_remover: boolean;
  pode_adicionar: boolean;
  adicional_id?: number;
  adicional_nome?: string;
  adicional_preco?: number;
  ordem?: number;
}

export interface ClassificacaoAdicionalPublico {
  adicional_id: number;
  nome: string;
  descricao?: string;
  preco: number;
}

export interface ProdutoVendaPublico {
  id?: number;
  nome: string;
  descricao?: string;
  preco?: number;
  produto_fabricado_id?: number;
  produto_classificacao_id?: number;
  produto_fabricado_nome?: string;
  produto_classificacao_nome?: string;
  foto?: string;
  itens?: ProdutoVendaItemPublico[] | string;
  classificacao_adicionais?: ClassificacaoAdicionalPublico[] | string;
}

export interface EncomendaItem {
  id?: number;
  produto_fabricado_id?: number;
  produto_venda_id?: number;
  produto_nome?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  removidos?: string[];
  adicionais?: AdicionalItemPedido[];
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
  forma_pagamento_id?: number;
  forma_pagamento_nome?: string;
  forma_pagamento_classificacao?: string;
  troco_para?: number;
  bandeira_cartao_id?: number;
  bandeira_cartao_nome?: string;
  endereco_entrega?: EnderecoEntrega;
}

export interface EnderecoEntrega {
  cep?: string;
  endereco?: string;
  nr?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  retira_estabelecimento?: number;
  latitude?: number;
  longitude?: number;
  place_id?: string;
}

export interface FormaPagamentoPublica {
  id: number;
  descricao: string;
  classificacao: string;
}

export interface CupomPagamento {
  encomenda: Encomenda;
  descricao: string;
}

export interface VendaProdutoItem {
  produto_fabricado_id?: number;
  produto_venda_id?: number;
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

export async function listarProdutosVendaPublico(empresa: number): Promise<ProdutoVendaPublico[]> {
  const res = await request(`/produtoVendaPublico?empresa=${empresa}`);
  return (await parseResponse(res)) as ProdutoVendaPublico[];
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

export async function listarFormasPagamentoPublico(
  empresa: number
): Promise<FormaPagamentoPublica[]> {
  const res = await request(`/formaPagamentoPublico?empresa=${empresa}`);
  const rows = (await parseResponse(res)) as Record<string, unknown>[];
  return (rows ?? []).map((r) => ({
    id: Number(r.id ?? 0),
    descricao: String(r.descricao ?? ''),
    classificacao: String(r.classificacao ?? 'OUTROS'),
  }));
}

export interface BandeiraCartaoPublica {
  id: number;
  nome: string;
}

export async function listarBandeirasCartaoPublico(empresaId: number): Promise<BandeiraCartaoPublica[]> {
  const res = await request(`/bandeiraCartaoPublico?empresa=${empresaId}`);
  const rows = (await parseResponse(res)) as Record<string, unknown>[];
  return (rows ?? []).map((r) => ({
    id: Number(r.id ?? r.codigo ?? 0),
    nome: String(r.nome ?? ''),
  }));
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
        forma_pagamento_id: row.forma_pagamento_id != null ? Number(row.forma_pagamento_id) : undefined,
        forma_pagamento_nome: row.forma_pagamento_nome ? String(row.forma_pagamento_nome) : undefined,
        forma_pagamento_classificacao: row.forma_pagamento_classificacao ? String(row.forma_pagamento_classificacao) : undefined,
        troco_para: row.troco_para != null ? Number(row.troco_para) : undefined,
        bandeira_cartao_id: row.bandeira_cartao_id != null ? Number(row.bandeira_cartao_id) : undefined,
        bandeira_cartao_nome: row.bandeira_cartao_nome ? String(row.bandeira_cartao_nome) : undefined,
        endereco_entrega: (row.eee_endereco || row.eee_cep || row.eee_retira_estabelecimento) ? {
          cep: row.eee_cep ? String(row.eee_cep) : undefined,
          endereco: row.eee_endereco ? String(row.eee_endereco) : undefined,
          nr: row.eee_nr ? String(row.eee_nr) : undefined,
          complemento: row.eee_complemento ? String(row.eee_complemento) : undefined,
          bairro: row.eee_bairro ? String(row.eee_bairro) : undefined,
          cidade: row.eee_cidade ? String(row.eee_cidade) : undefined,
          uf: row.eee_uf ? String(row.eee_uf) : undefined,
          retira_estabelecimento: row.eee_retira_estabelecimento != null ? Number(row.eee_retira_estabelecimento) : undefined,
          latitude: row.eee_latitude != null ? Number(row.eee_latitude) : undefined,
          longitude: row.eee_longitude != null ? Number(row.eee_longitude) : undefined,
          place_id: row.eee_place_id ? String(row.eee_place_id) : undefined,
        } : undefined,
      };
      porId.set(id, e);
    }
    if (row.item_id != null) {
      const removidosRaw = typeof row.removidos === 'string' ? row.removidos : null;
      const adicionaisRaw = typeof row.adicionais === 'string' ? row.adicionais : null;
      let removidos: string[] | undefined;
      if (removidosRaw) {
        try {
          const arr = JSON.parse(removidosRaw);
          if (Array.isArray(arr)) {
            removidos = arr.map((v) => (typeof v === 'string' ? v : String(v?.nome ?? ''))).filter(Boolean);
          }
        } catch {
          /* ignora */
        }
      }
      let adicionais: AdicionalItemPedido[] | undefined;
      if (adicionaisRaw) {
        try {
          const arr = JSON.parse(adicionaisRaw);
          if (Array.isArray(arr)) {
            adicionais = arr.map((a) => ({
              adicional_id: Number(a.adicional_id ?? 0) || undefined,
              nome: String(a.nome ?? ''),
              quantidade: Number(a.quantidade ?? 0),
              valor_unitario: Number(a.valor_unitario ?? 0),
              valor_total: Number(a.valor_total ?? 0) || undefined,
            }));
          }
        } catch {
          /* ignora */
        }
      }
      e.itens?.push({
        id: Number(row.item_id),
        produto_fabricado_id: Number(row.produto_fabricado_id ?? 0) || undefined,
        produto_venda_id: Number(row.produto_venda_id ?? 0) || undefined,
        produto_nome: row.produto_nome ? String(row.produto_nome) : undefined,
        quantidade: Number(row.quantidade ?? 0),
        valor_unitario: Number(row.valor_unitario ?? 0),
        valor_total: Number(row.item_valor_total ?? 0),
        removidos,
        adicionais,
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

export async function atualizarFormaPagamentoEncomendaPublica(
  empresa: number,
  data: { id: number; cliente_id?: number; documento?: string; telefone?: string; forma_pagamento_id: number; forma_pagamento_nome?: string; troco_para?: number; bandeira_cartao_id?: number; bandeira_cartao_nome?: string }
): Promise<{ mensagem?: string } | null> {
  const res = await request('/encomendaPublico/formaPagamento', {
    method: 'POST',
    body: JSON.stringify({ empresa, ...data }),
  });
  return (await parseResponse(res)) as { mensagem?: string } | null;
}

export async function salvarEnderecoEntregaPublico(
  empresa: number,
  data: {
    id: number;
    cliente_id?: number;
    documento?: string;
    telefone?: string;
    cep?: string;
    endereco?: string;
    nr?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    retira_estabelecimento?: number;
    latitude?: number;
    longitude?: number;
    place_id?: string;
  }
): Promise<{ mensagem?: string } | null> {
  const res = await request('/encomendaPublico/enderecoEntrega', {
    method: 'POST',
    body: JSON.stringify({ empresa, ...data }),
  });
  return (await parseResponse(res)) as { mensagem?: string } | null;
}

export interface VersaoInfo {
  nome: string;
  versao: string;
  arquivo: string;
}

export const VERSAO_APP: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

function getLastSeenVersion(): string {
  try { return localStorage.getItem('versao_vista') || ''; } catch { return ''; }
}
function setLastSeenVersion(v: string) {
  try { localStorage.setItem('versao_vista', v); } catch { /* ok */ }
}

export async function verificarVersao(): Promise<VersaoInfo | null> {
  try {
    const servers = getServerList();
    const lastSeen = getLastSeenVersion();
    console.log('[verificarVersao] VERSAO_APP=', VERSAO_APP, 'lastSeen=', lastSeen, 'servers=', servers);
    for (const srv of servers) {
      try {
        const url = `http://${srv.host}:${srv.port}/apk/versao`;
        console.log('[verificarVersao] Fetching', url);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        console.log('[verificarVersao] Status', res.status);
        if (!res.ok) continue;
        const raw = await res.text();
        console.log('[verificarVersao] Raw response:', raw);
        const data = JSON.parse(raw) as VersaoInfo;
        if (!data || !data.versao) continue;
        console.log('[verificarVersao] Server versao:', data.versao, 'App versao:', VERSAO_APP);
        // Server version matches installed app → no update needed
        if (data.versao === VERSAO_APP) {
          setLastSeenVersion(data.versao);
          return null;
        }
        // Server version matches what we already saw and dismissed → don't show again
        if (lastSeen && data.versao === lastSeen) {
          console.log('[verificarVersao] Already seen this version, skipping');
          return null;
        }
        // New version available
        setLastSeenVersion(data.versao);
        return data;
      } catch (e) {
        console.log('[verificarVersao] Error:', e);
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}