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

export interface Fornecedor {
  id?: number;
  nome: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  email?: string;
  cnpj_cpf?: string;
  status?: number;
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

export interface Marca {
  id?: number;
  nome: string;
  ativo?: boolean;
}

export interface CustoAdicionalTipo {
  id?: number;
  nome: string;
  ativo?: boolean;
}

export interface Fabricacao {
  id?: number;
  codigo?: number;
  produto_fabricado_id: number;
  produto_nome?: string;
  quantidade_produzida: number;
  data_fabricacao: string;
  custo_insumos?: number;
  custo_adicional_total?: number;
  custo_total?: number;
  custo_unitario?: number;
  observacao?: string;
}

export interface FabricacaoCustoAdicional {
  id?: number;
  codigo?: number;
  fabricacao_id: number;
  custo_adicional_tipo_id: number;
  custo_adicional_nome?: string;
  valor: number;
}

export interface ProdutoFabricado {
  id?: number;
  nome: string;
  descricao?: string;
  rendimento?: number;
  unidade_medida: string;
  custo_unitario?: number;
  margem_lucro?: number;
  valor_venda_sugerido?: number;
  preco?: number;
  foto?: string;
  ativo?: boolean;
}

export interface ReceitaIngrediente {
  id?: number;
  produto_fabricado_id: number;
  insumo_id: number;
  quantidade: number;
  insumo_nome?: string;
  insumo_ativo?: boolean;
  insumo_unidade_medida?: string;
  insumo_custo_medio?: number;
  produto_nome?: string;
}

export interface Insumo {
  id?: number;
  nome: string;
  unidade_medida: string;
  custo_medio?: number;
  ativo?: boolean;
  id_fornecedor?: number | null;
  id_marca?: number | null;
  fornecedor_nome?: string;
  marca_nome?: string;
}

export interface CompraInsumoItem {
  insumo_id: number;
  insumo_nome?: string;
  marca_nome?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface CompraInsumo {
  id?: number;
  codigo?: number;
  fornecedor_id?: number;
  fornecedor_nome?: string;
  data_compra: string;
  valor_total?: number;
  observacao?: string;
  pago?: boolean;
  qtd_itens?: number;
  itens?: CompraInsumoItem[];
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
  qtd_itens?: number;
  itens?: VendaProdutoItem[];
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
  qtd_itens?: number;
  itens?: EncomendaItem[];
}

export interface EstoqueInsumo {
  id?: number;
  insumo_id: number;
  insumo_nome?: string;
  unidade_medida?: string;
  quantidade: number;
  data_atualizacao: string;
  observacao?: string;
}

export interface EstoqueProdutoFabricado {
  id?: number;
  produto_fabricado_id: number;
  produto_nome?: string;
  unidade_medida?: string;
  quantidade: number;
  data_atualizacao: string;
  observacao?: string;
}

export interface PerdaInsumo {
  id?: number;
  codigo?: number;
  insumo_id: number;
  insumo_nome?: string;
  quantidade: number;
  data_perda: string;
  motivo?: string;
}

export interface PerdaProdutoFabricado {
  id?: number;
  codigo?: number;
  produto_fabricado_id: number;
  produto_nome?: string;
  quantidade: number;
  data_perda: string;
  motivo?: string;
}

export interface UsoConsumo {
  id?: number;
  codigo?: number;
  produto_fabricado_id: number;
  produto_nome?: string;
  quantidade: number;
  data_uso: string;
  motivo?: string;
}

export interface DashboardData {  kpis: {
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
const SERVERS_KEY = 'producao.servers';
const TOKEN_KEY = 'producao.token';
const REQUEST_TIMEOUT_MS = 6000;

export interface ServerEndpoint {
  host: string;
  port: number;
}

let ultimoServidor: ServerEndpoint | null = null;
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
  return { host: 'localhost', port: 9000 };
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
  ultimoServidor = null;
}

export function getBaseURL(): string {
  const { host, port } = getServerConfig();
  return `http://${host}:${port}`;
}

export function fotoUrl(foto: string): string {
  if (!foto) return '';
  return `${getBaseURL()}/uploads/${foto.split('/').map(encodeURIComponent).join('/')}`;
}

async function request(path: string, options: RequestInit = {}, autenticado = false): Promise<Response> {
  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) ?? {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (autenticado) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  aguarde(descricaoOperacao(path, options));

  const servers = getServerList();
  const ordem = ultimoServidor
    ? [ultimoServidor, ...servers.filter((s) => !(s.host === ultimoServidor?.host && s.port === ultimoServidor?.port))]
    : servers;

  let res: Response | null = null;

  try {
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
  } finally {
    aguardePronto();
  }

  if (!res) {
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

function descricaoOperacao(path: string, options: RequestInit): string {
  const metodo = (options.method ?? 'GET').toUpperCase();
  if (metodo === 'POST') {
    if (path.includes('/login')) return 'Entrando no sistema...';
    return 'Salvando dados...';
  }
  if (metodo === 'DELETE') return 'Excluindo registro...';
  if (path.includes('Dashboard')) return 'Carregando relatórios...';
  if (path.includes('Relatorio')) return 'Gerando relatório...';
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

export async function listarEmpresas(): Promise<EmpresaPublic[]> {
  const res = await request('/empresaPublic');
  return (await parseResponse(res)) as EmpresaPublic[];
}

export async function loginApi(body: {
  login?: string;
  senha?: string;
  pin?: string;
  empresa: number | string;
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

export async function listarInsumos(): Promise<Insumo[]> {
  const res = await request('/insumo', {}, true);
  return (await parseResponse(res)) as Insumo[];
}

export async function listarComprasInsumo(): Promise<CompraInsumo[]> {
  const res = await request('/compraInsumo', {}, true);
  return (await parseResponse(res)) as CompraInsumo[];
}

export async function listarCompraInsumoItens(id: number): Promise<CompraInsumoItem[]> {
  const res = await request(`/compraInsumo?id=${id}`, {}, true);
  const rows = (await parseResponse(res)) as Record<string, unknown>[];
  return rows.map((row) => ({
    insumo_id: Number(row.insumo_id) || 0,
    insumo_nome: row.insumo_nome ? String(row.insumo_nome) : undefined,
    marca_nome: row.marca_nome ? String(row.marca_nome) : undefined,
    quantidade: Number(row.quantidade) || 0,
    valor_unitario: Number(row.valor_unitario) || 0,
    valor_total: Number(row.item_valor_total ?? row.valor_total) || 0,
  }));
}

export async function salvarCompraInsumo(data: CompraInsumo): Promise<void> {
  const res = await request('/compraInsumo', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirCompraInsumo(id: number): Promise<void> {
  const res = await request(`/compraInsumo?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarVendasProduto(): Promise<VendaProduto[]> {
  const res = await request('/vendaProduto', {}, true);
  return (await parseResponse(res)) as VendaProduto[];
}

export async function listarVendaProdutoItens(id: number): Promise<VendaProdutoItem[]> {
  const res = await request(`/vendaProduto?id=${id}`, {}, true);
  const rows = (await parseResponse(res)) as Record<string, unknown>[];
  return rows.map((row) => ({
    produto_fabricado_id: Number(row.produto_fabricado_id) || 0,
    produto_nome: row.produto_nome ? String(row.produto_nome) : undefined,
    quantidade: Number(row.quantidade) || 0,
    valor_unitario: Number(row.valor_unitario) || 0,
    valor_total: Number(row.item_valor_total ?? row.valor_total) || 0,
  }));
}

export async function salvarVendaProduto(data: VendaProduto): Promise<{ id?: number; codigo?: number } | null> {
  const res = await request('/vendaProduto', { method: 'POST', body: JSON.stringify(data) }, true);
  const parsed = (await parseResponse(res)) as Record<string, unknown> | null;
  if (!parsed) return null;
  return {
    id: parsed.id != null ? Number(parsed.id) : undefined,
    codigo: parsed.codigo != null ? Number(parsed.codigo) : undefined,
  };
}

export async function excluirVendaProduto(id: number): Promise<void> {
  const res = await request(`/vendaProduto?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
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

export async function alterarStatusEncomenda(input: {
  id: number;
  status: number;
  data_venda?: string;
  recebido?: boolean;
  categoria_receber_id?: number;
}): Promise<{ venda_id?: number; mensagem?: string; id?: number } | null> {
  const res = await request('/encomenda', { method: 'POST', body: JSON.stringify(input) }, true);
  return (await parseResponse(res)) as { venda_id?: number; mensagem?: string; id?: number } | null;
}

export async function listarEstoqueInsumos(): Promise<EstoqueInsumo[]> {
  const res = await request('/estoqueInsumo', {}, true);
  return (await parseResponse(res)) as EstoqueInsumo[];
}

export async function salvarEstoqueInsumo(data: EstoqueInsumo): Promise<void> {
  const res = await request('/estoqueInsumo', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirEstoqueInsumo(id: number): Promise<void> {
  const res = await request(`/estoqueInsumo?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarEstoqueProdutos(): Promise<EstoqueProdutoFabricado[]> {
  const res = await request('/estoqueProdutoFabricado', {}, true);
  return (await parseResponse(res)) as EstoqueProdutoFabricado[];
}

export async function salvarEstoqueProduto(data: EstoqueProdutoFabricado): Promise<void> {
  const res = await request('/estoqueProdutoFabricado', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirEstoqueProduto(id: number): Promise<void> {
  const res = await request(`/estoqueProdutoFabricado?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarPerdasInsumo(): Promise<PerdaInsumo[]> {
  const res = await request('/perdaInsumo', {}, true);
  return (await parseResponse(res)) as PerdaInsumo[];
}

export async function salvarPerdaInsumo(data: PerdaInsumo): Promise<void> {
  const res = await request('/perdaInsumo', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirPerdaInsumo(id: number): Promise<void> {
  const res = await request(`/perdaInsumo?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarPerdasProduto(): Promise<PerdaProdutoFabricado[]> {
  const res = await request('/perdaProdutoFabricado', {}, true);
  return (await parseResponse(res)) as PerdaProdutoFabricado[];
}

export async function salvarPerdaProduto(data: PerdaProdutoFabricado): Promise<void> {
  const res = await request('/perdaProdutoFabricado', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirPerdaProduto(id: number): Promise<void> {
  const res = await request(`/perdaProdutoFabricado?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarUsoConsumos(): Promise<UsoConsumo[]> {
  const res = await request('/usoConsumo', {}, true);
  return (await parseResponse(res)) as UsoConsumo[];
}

export async function salvarUsoConsumo(data: UsoConsumo): Promise<void> {
  const res = await request('/usoConsumo', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirUsoConsumo(id: number): Promise<void> {
  const res = await request(`/usoConsumo?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function salvarInsumo(data: Insumo): Promise<void> {
  const res = await request('/insumo', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirInsumo(id: number): Promise<void> {
  const res = await request(`/insumo?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarFornecedores(): Promise<Fornecedor[]> {
  const res = await request('/fornecedor', {}, true);
  return (await parseResponse(res)) as Fornecedor[];
}

export async function listarMarcas(): Promise<Marca[]> {
  const res = await request('/marca', {}, true);
  return (await parseResponse(res)) as Marca[];
}

export async function salvarMarca(data: Marca): Promise<void> {
  const res = await request('/marca', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirMarca(id: number): Promise<void> {
  const res = await request(`/marca?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarClientes(): Promise<Cliente[]> {
  const res = await request('/cliente', {}, true);
  return (await parseResponse(res)) as Cliente[];
}

export async function salvarCliente(data: Cliente): Promise<void> {
  const res = await request('/cliente', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirCliente(id: number): Promise<void> {
  const res = await request(`/cliente?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function salvarFornecedor(data: Fornecedor): Promise<void> {
  const res = await request('/fornecedor', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirFornecedor(id: number): Promise<void> {
  const res = await request(`/fornecedor?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarProdutosFabricados(): Promise<ProdutoFabricado[]> {
  const res = await request('/produtoFabricado', {}, true);
  return (await parseResponse(res)) as ProdutoFabricado[];
}

export async function salvarProdutoFabricado(data: ProdutoFabricado): Promise<{ id?: number } | null> {
  const res = await request('/produtoFabricado', { method: 'POST', body: JSON.stringify(data) }, true);
  const parsed = (await parseResponse(res)) as Record<string, unknown> | null;
  if (!parsed) return null;
  const ids = Array.isArray(parsed.ids) ? parsed.ids : [];
  return {
    id: ids.length > 0 ? Number(ids[0]) : undefined,
  };
}

export async function enviarFotoProdutoFabricado(id: number, foto: string): Promise<void> {
  const res = await request('/produtoFoto', { method: 'POST', body: JSON.stringify({ id, foto }) }, true);
  await parseResponse(res);
}

export async function excluirProdutoFabricado(id: number): Promise<void> {
  const res = await request(`/produtoFabricado?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarReceitasIngrediente(produtoFabricadoId?: number): Promise<ReceitaIngrediente[]> {
  const q = produtoFabricadoId ? `?produto_fabricado_id=${produtoFabricadoId}` : '';
  const res = await request(`/receitaIngrediente${q}`, {}, true);
  return (await parseResponse(res)) as ReceitaIngrediente[];
}

export async function salvarReceitaIngrediente(data: ReceitaIngrediente): Promise<void> {
  const res = await request('/receitaIngrediente', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirReceitaIngrediente(id: number): Promise<void> {
  const res = await request(`/receitaIngrediente?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarCustosAdicionaisTipo(): Promise<CustoAdicionalTipo[]> {
  const res = await request('/custoAdicionalTipo', {}, true);
  return (await parseResponse(res)) as CustoAdicionalTipo[];
}

export async function salvarCustoAdicionalTipo(data: CustoAdicionalTipo): Promise<void> {
  const res = await request('/custoAdicionalTipo', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirCustoAdicionalTipo(id: number): Promise<void> {
  const res = await request(`/custoAdicionalTipo?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarFabricacoes(): Promise<Fabricacao[]> {
  const res = await request('/fabricacao', {}, true);
  return (await parseResponse(res)) as Fabricacao[];
}

export async function salvarFabricacao(data: Fabricacao): Promise<void> {
  const res = await request('/fabricacao', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirFabricacao(id: number): Promise<void> {
  const res = await request(`/fabricacao?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}

export async function listarCustosAdicionaisFabricacao(fabricacaoId: number): Promise<FabricacaoCustoAdicional[]> {
  const res = await request(`/fabricacaoCustoAdicional?fabricacao_id=${fabricacaoId}`, {}, true);
  return (await parseResponse(res)) as FabricacaoCustoAdicional[];
}

export async function salvarCustoAdicionalFabricacao(data: FabricacaoCustoAdicional): Promise<void> {
  const res = await request('/fabricacaoCustoAdicional', { method: 'POST', body: JSON.stringify(data) }, true);
  await parseResponse(res);
}

export async function excluirCustoAdicionalFabricacao(id: number): Promise<void> {
  const res = await request(`/fabricacaoCustoAdicional?id=${id}`, { method: 'DELETE' }, true);
  await parseResponse(res);
}
