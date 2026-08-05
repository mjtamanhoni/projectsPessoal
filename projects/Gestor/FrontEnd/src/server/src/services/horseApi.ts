import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';
import { AppError } from '../types';
import type { Cliente, Fornecedor, Categoria, ContaPagar, ContaReceber, BaixaRequest, LoginRequest, LoginResponse, DashboardData, DashboardFilters, HorasDashboardData, ProducaoDashboardData, Formulario, UsuarioFormulario, HoraTrabalhada, Servico, HoraAbatida, HoraExcedida, Permissao, FormularioPermissao, Insumo, CompraInsumo, ProdutoFabricado, ReceitaIngrediente, CustoAdicionalTipo, Fabricacao, FabricacaoCustoAdicional, VendaProduto, Encomenda, EstoqueInsumo, EstoqueProdutoFabricado, Empresa, Modulo, ModuloFormulario, EmpresaModulo, PerdaInsumo, PerdaProdutoFabricado, UsoConsumo } from '../types';
import { getFinanceiroEmpresa } from './settings';

function ceilTo2(value: number): number {
  return Math.ceil(value * 100) / 100;
}

function normalizeDate(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400000);
    return date.toISOString().split('T')[0];
  }
  const s = String(val);
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : s;
}

class HorseApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: config.horseApi.baseUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private getAuthHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status || 500;
      const data = axiosError.response?.data;
      let message = 'Erro interno do servidor';

      if (typeof data === 'string' && data) {
        message = data;
      } else if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        message = (obj.erro as string) || (obj.mensagem as string) || message;
      } else {
        message = axiosError.message || message;
      }

      if (!message) {
        message = `Requisição falhou com status ${status}`;
      }

      console.error(`[HorseAPI] ${axiosError.config?.method?.toUpperCase()} ${axiosError.config?.url} -> ${status}: ${message}`, data);
      throw new AppError(message, status);
    }
    if (error instanceof AppError) throw error;
    console.error('[HorseAPI] Erro inesperado:', error);
    throw new AppError('Erro inesperado', 500);
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const res = await this.api.post('/usuario/login', data);
      this.setToken(res.data.token);
      return res.data as LoginResponse;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarClientes(params?: Record<string, unknown>): Promise<Cliente[]> {
    try {
      const res = await this.api.get('/cliente', { params, headers: this.getAuthHeaders() });
      return res.data as Cliente[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarClientes(clientes: Cliente[]): Promise<unknown> {
    try {
      const res = await this.api.post('/cliente', clientes, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirCliente(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/cliente', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarFornecedores(params?: Record<string, unknown>): Promise<Fornecedor[]> {
    try {
      const res = await this.api.get('/fornecedor', { params, headers: this.getAuthHeaders() });
      return res.data as Fornecedor[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarFornecedores(fornecedores: Fornecedor[]): Promise<unknown> {
    try {
      const res = await this.api.post('/fornecedor', fornecedores, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirFornecedor(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/fornecedor', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarCategoriasPagar(params?: Record<string, unknown>): Promise<Categoria[]> {
    try {
      const res = await this.api.get('/categoriaPagar', { params, headers: this.getAuthHeaders() });
      return res.data as Categoria[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarCategoriasPagar(categorias: Categoria[]): Promise<unknown> {
    try {
      const res = await this.api.post('/categoriaPagar', categorias, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirCategoriaPagar(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/categoriaPagar', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarCategoriasReceber(params?: Record<string, unknown>): Promise<Categoria[]> {
    try {
      const res = await this.api.get('/categoriaReceber', { params, headers: this.getAuthHeaders() });
      return res.data as Categoria[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarCategoriasReceber(categorias: Categoria[]): Promise<unknown> {
    try {
      const res = await this.api.post('/categoriaReceber', categorias, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirCategoriaReceber(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/categoriaReceber', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarFormularios(params?: Record<string, unknown>): Promise<Formulario[]> {
    try {
      const res = await this.api.get('/formulario', { params, headers: this.getAuthHeaders() });
      return res.data as Formulario[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarFormularios(formularios: Formulario[]): Promise<unknown> {
    try {
      const res = await this.api.post('/formulario', formularios, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirFormulario(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/formulario', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  private mapSnakeToCamel<T>(data: Record<string, unknown>): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = value;
    }
    return result as T;
  }

  private mapArray<T>(data: unknown): T[] {
    if (Array.isArray(data)) return data.map((item: Record<string, unknown>) => this.mapSnakeToCamel<T>(item));
    return [];
  }

  async listarContasPagar(params?: Record<string, unknown>): Promise<ContaPagar[]> {
    try {
      const res = await this.api.get('/contasPagar', { params, headers: this.getAuthHeaders() });
      return this.mapArray<ContaPagar>(res.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarContasPagar(contas: ContaPagar[]): Promise<unknown> {
    try {
      const mapConta = (c: ContaPagar) => {
        const { lancamentoOrigemId, ...rest } = c as unknown as Record<string, unknown>;
        return {
          ...rest,
          ...(lancamentoOrigemId != null ? { lancamentoOrigemId, lancamento_origem_id: lancamentoOrigemId } : {}),
        };
      };
      const mapped = contas.map(mapConta);
      const payload = mapped.length === 1 ? mapped[0] : mapped;
      const res = await this.api.post('/contasPagar', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirContaPagar(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/contasPagar', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async pagarConta(data: BaixaRequest): Promise<unknown> {
    try {
      const payload = {
        id: data.id,
        data_pagamento: data.data_pagamento,
        valorBaixa: data.valorBaixa,
        desconto: data.desconto,
        acrescimo: data.acrescimo,
      };
      const res = await this.api.put('/contasPagar/pagar', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async estornarContaPagar(id: number): Promise<unknown> {
    try {
      const res = await this.api.put('/contasPagar/estornar', { id }, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarContasReceber(params?: Record<string, unknown>): Promise<ContaReceber[]> {
    try {
      const res = await this.api.get('/contasReceber', { params, headers: this.getAuthHeaders() });
      return this.mapArray<ContaReceber>(res.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarContasReceber(contas: ContaReceber[]): Promise<unknown> {
    try {
      const mapConta = (c: ContaReceber) => {
        const { lancamentoOrigemId, dataVencimento, clienteId, idCategoria, dataRecebimento, ...rest } = c as unknown as Record<string, unknown>;
        return {
          ...rest,
          codigo: rest.codigo ?? rest.id ?? 0,
          cliente_id: clienteId,
          data_vencimento: dataVencimento,
          id_categoria: idCategoria,
          recebido: false,
          data_recebimento: dataRecebimento,
          ...(lancamentoOrigemId != null ? { lancamento_origem_id: lancamentoOrigemId } : {}),
        };
      };
      const mapped = contas.map(mapConta);
      const payload = mapped.length === 1 ? mapped[0] : mapped;
      const res = await this.api.post('/contasReceber', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirContaReceber(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/contasReceber', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async receberConta(data: BaixaRequest): Promise<unknown> {
    try {
      const payload = {
        id: data.id,
        data_recebimento: data.data_recebimento,
        valorBaixa: data.valorBaixa,
        desconto: data.desconto,
        acrescimo: data.acrescimo,
      };
      const res = await this.api.put('/contasReceber/receber', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async estornarContaReceber(id: number): Promise<unknown> {
    try {
      const res = await this.api.put('/contasReceber/estornar', { id }, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async obterDashboard(filtros?: DashboardFilters): Promise<DashboardData> {
    let pagar: ContaPagar[] = [];
    let receber: ContaReceber[] = [];

    try {
      const pRes = await this.api.get('/contasPagar', { headers: this.getAuthHeaders() });
      pagar = Array.isArray(pRes.data) ? pRes.data as ContaPagar[] : [];
    } catch (e) {
      console.error('[obterDashboard] Erro ao buscar contas a pagar:', e);
    }

    try {
      const rRes = await this.api.get('/contasReceber', { headers: this.getAuthHeaders() });
      receber = Array.isArray(rRes.data) ? rRes.data as ContaReceber[] : [];
    } catch (e) {
      console.error('[obterDashboard] Erro ao buscar contas a receber:', e);
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const status = filtros?.status || 'aberto';

    const getVenc = (o: unknown) => (o as Record<string, unknown>)['data_vencimento'] as string;

    if (filtros?.dataInicio) {
      const inicio = new Date(filtros.dataInicio);
      pagar = pagar.filter((c) => new Date(getVenc(c)) >= inicio);
      receber = receber.filter((c) => new Date(getVenc(c)) >= inicio);
    }
    if (filtros?.dataFim) {
      const fim = new Date(filtros.dataFim);
      pagar = pagar.filter((c) => new Date(getVenc(c)) <= fim);
      receber = receber.filter((c) => new Date(getVenc(c)) <= fim);
    }

    const pagarFiltrado = status === 'baixado'
      ? pagar.filter((c) => c.pago)
      : status === 'aberto'
        ? pagar.filter((c) => !c.pago)
        : pagar;

    const receberFiltrado = status === 'baixado'
      ? receber.filter((c) => c.recebido)
      : status === 'aberto'
        ? receber.filter((c) => !c.recebido)
        : receber;

    const receitasPorMes = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(currentYear, currentMonth - 5 + i, 1);
      const mes = d.toLocaleDateString('pt-BR', { month: 'short' });
      const valor = receber
        .filter((c) => {
          const v = new Date(getVenc(c));
          return v.getMonth() === d.getMonth() && v.getFullYear() === d.getFullYear();
        })
        .reduce((acc, c) => acc + Number(c.valor), 0);
      return { mes, valor };
    });

    const despesasPorMes = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(currentYear, currentMonth - 5 + i, 1);
      const mes = d.toLocaleDateString('pt-BR', { month: 'short' });
      const valor = pagar
        .filter((c) => {
          const v = new Date(getVenc(c));
          return v.getMonth() === d.getMonth() && v.getFullYear() === d.getFullYear();
        })
        .reduce((acc, c) => acc + Number(c.valor), 0);
      return { mes, valor };
    });

    const lucroPorMes = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(currentYear, i, 1);
      const mes = d.toLocaleDateString('pt-BR', { month: 'short' });
      const receita = receber
        .filter((c) => {
          const v = new Date(getVenc(c));
          return v.getMonth() === i && v.getFullYear() === currentYear;
        })
        .reduce((acc, c) => acc + Number(c.valor), 0);
      const despesa = pagar
        .filter((c) => {
          const v = new Date(getVenc(c));
          return v.getMonth() === i && v.getFullYear() === currentYear;
        })
        .reduce((acc, c) => acc + Number(c.valor), 0);
      return { mes, lucro: receita - despesa };
    });

    const receberAberto = receber.filter((c) => !c.recebido).reduce((acc, c) => acc + Number(c.valor), 0);
    const receberRecebido = receber.filter((c) => c.recebido).reduce((acc, c) => acc + Number(c.valor), 0);
    const pagarAberto = pagar.filter((c) => !c.pago).reduce((acc, c) => acc + Number(c.valor), 0);
    const pagarPago = pagar.filter((c) => c.pago).reduce((acc, c) => acc + Number(c.valor), 0);

    return {
      totalAReceber: receberFiltrado.filter((c) => !c.recebido).reduce((acc, c) => acc + Number(c.valor), 0),
      totalAPagar: pagarFiltrado.filter((c) => !c.pago).reduce((acc, c) => acc + Number(c.valor), 0),
      totalRecebido: receberFiltrado.filter((c) => c.recebido).reduce((acc, c) => acc + Number(c.valor), 0),
      totalPago: pagarFiltrado.filter((c) => c.pago).reduce((acc, c) => acc + Number(c.valor), 0),
      saldo: receberFiltrado.filter((c) => !c.recebido).reduce((acc, c) => acc + Number(c.valor), 0) - pagarFiltrado.filter((c) => !c.pago).reduce((acc, c) => acc + Number(c.valor), 0),
      contasPendentesPagar: pagar.filter((c) => !c.pago).length,
      contasPendentesReceber: receber.filter((c) => !c.recebido).length,
      contasAtrasadasPagar: pagar.filter((c) => !c.pago && new Date(getVenc(c)) < now).length,
      contasAtrasadasReceber: receber.filter((c) => !c.recebido && new Date(getVenc(c)) < now).length,
      receitasPorMes,
      despesasPorMes,
      receberAberto,
      receberRecebido,
      pagarAberto,
      pagarPago,
      lucroPorMes,
      filtrosAplicados: {
        dataInicio: filtros?.dataInicio,
        dataFim: filtros?.dataFim,
        status,
      },
    };
  }

  async obterProducaoDashboard(params?: Record<string, unknown>): Promise<ProducaoDashboardData> {
    try {
      const res = await this.api.get('/producaoDashboard', { params, headers: this.getAuthHeaders() });
      const raw = res.data as Record<string, unknown>;
      const kpisRaw = raw.kpis as Record<string, unknown> || {};
      const mensalVendasRaw = raw.mensal_vendas as Record<string, unknown>[] || [];
      const mensalComprasRaw = raw.mensal_compras as Record<string, unknown>[] || [];
      const mensalFabricacaoRaw = raw.mensal_fabricacao as Record<string, unknown>[] || [];
      const diarioFabricacaoRaw = raw.diario_fabricacao as Record<string, unknown>[] || [];
      const diarioVendasRaw = raw.diario_vendas as Record<string, unknown>[] || [];
      return {
        kpis: {
          total_vendas: Number(kpisRaw.total_vendas ?? 0),
          qtd_vendida: Number(kpisRaw.qtd_vendida ?? 0),
          qtd_vendas: Number(kpisRaw.qtd_vendas ?? 0),
          total_compras: Number(kpisRaw.total_compras ?? 0),
          qtd_compras: Number(kpisRaw.qtd_compras ?? 0),
          qtd_fabricada: Number(kpisRaw.qtd_fabricada ?? 0),
          custo_total: Number(kpisRaw.custo_total ?? 0),
          qtd_fabricacoes: Number(kpisRaw.qtd_fabricacoes ?? 0),
          lucro_bruto: Number(kpisRaw.lucro_bruto ?? 0),
          lucro_liquido: Number(kpisRaw.lucro_liquido ?? 0),
        },
        mensal_vendas: mensalVendasRaw.map((m: Record<string, unknown>) => ({
          mes: Number(m.mes ?? 0),
          valor: Number(m.valor ?? 0),
          qtd: Number(m.qtd ?? 0),
          qtd_vendas: Number(m.qtd_vendas ?? 0),
        })),
        mensal_compras: mensalComprasRaw.map((m: Record<string, unknown>) => ({
          mes: Number(m.mes ?? 0),
          valor: Number(m.valor ?? 0),
          qtd: Number(m.qtd ?? 0),
        })),
        mensal_fabricacao: mensalFabricacaoRaw.map((m: Record<string, unknown>) => ({
          mes: Number(m.mes ?? 0),
          qtd_fabricada: Number(m.qtd_fabricada ?? 0),
          custo_total: Number(m.custo_total ?? 0),
          qtd: Number(m.qtd ?? 0),
        })),
        diario_fabricacao: diarioFabricacaoRaw.map((d: Record<string, unknown>) => ({
          dia: String(d.dia ?? ''),
          qtd_fabricada: Number(d.qtd_fabricada ?? 0),
        })),
        diario_vendas: diarioVendasRaw.map((d: Record<string, unknown>) => ({
          dia: String(d.dia ?? ''),
          valor: Number(d.valor ?? 0),
        })),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        console.error('[ProducaoDashboard] erro HTTP:', status);
      }
      return {
        kpis: {
          total_vendas: 0, qtd_vendida: 0, qtd_vendas: 0,
          total_compras: 0, qtd_compras: 0,
          qtd_fabricada: 0, custo_total: 0, qtd_fabricacoes: 0,
          lucro_bruto: 0, lucro_liquido: 0,
        },
        mensal_vendas: [],
        mensal_compras: [],
        mensal_fabricacao: [],
        diario_fabricacao: [],
        diario_vendas: [],
      };
    }
  }

  async obterHorasDashboard(params?: Record<string, unknown>): Promise<HorasDashboardData> {
    try {
      const res = await this.api.get('/horasDashboard', { params, headers: this.getAuthHeaders() });
      const raw = res.data as Record<string, unknown>;
      const kpisRaw = raw.kpis as Record<string, unknown> || {};
      const diarioRaw = raw.diario as Record<string, unknown>[] || [];
      const mensalRaw = raw.mensal as Record<string, unknown>[] || [];
      const abatidoRaw = raw.abatido_mensal as Record<string, unknown>[] || [];
      return {
        kpis: {
          totalHoras: Number(kpisRaw.total_horas ?? 0),
          totalValor: Number(kpisRaw.total_valor ?? 0),
          totalAbatido: Number(kpisRaw.total_abatido ?? 0),
          diasTrabalhados: Number(kpisRaw.dias_trabalhados ?? 0),
        },
        diario: diarioRaw.map((d: Record<string, unknown>) => ({
          dia: String(d.dia ?? ''),
          horas: Number(d.horas ?? 0),
          valor: Number(d.valor ?? 0),
        })),
        mensal: mensalRaw.map((m: Record<string, unknown>) => ({
          mes: Number(m.mes ?? 0),
          horas: Number(m.horas ?? 0),
          valor: Number(m.valor ?? 0),
        })),
        abatidoMensal: abatidoRaw.map((a: Record<string, unknown>) => ({
          mes: Number(a.mes ?? 0),
          horas_abatidas: Number(a.horas_abatidas ?? 0),
        })),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        console.error('[HorasDashboard] erro HTTP:', status);
      }
      return {
        kpis: { totalHoras: 0, totalValor: 0, totalAbatido: 0, diasTrabalhados: 0 },
        diario: [],
        mensal: [],
        abatidoMensal: [],
      };
    }
  }

  async listarUsuarios(params?: Record<string, unknown>): Promise<unknown[]> {
    try {
      const res = await this.api.get('/usuario', { params, headers: this.getAuthHeaders() });
      return res.data as unknown[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarUsuarios(usuarios: unknown[]): Promise<unknown> {
    try {
      const res = await this.api.post('/usuario', usuarios, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirUsuario(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/usuario', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async alterarSenhaUsuario(id: number, novaSenha: string): Promise<unknown> {
    try {
      const res = await this.api.put('/usuario/alterarSenha', { id, nova_senha: novaSenha }, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async alterarPinUsuario(id: number, novoPin: string): Promise<unknown> {
    try {
      const res = await this.api.put('/usuario/alterarPin', { id, novo_pin: novoPin }, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarUsuarioFormularios(params?: Record<string, unknown>): Promise<UsuarioFormulario[]> {
    try {
      const res = await this.api.get('/usuarioFormulario', { params, headers: this.getAuthHeaders() });
      return this.mapArray<UsuarioFormulario>(res.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarUsuarioFormularios(itens: UsuarioFormulario[]): Promise<unknown> {
    try {
      const mapped = itens.map((item) => ({
        codigo: item.codigo ?? item.id ?? 0,
        usuario_id: item.usuarioId,
        formulario_id: item.formularioId,
      }));
      const payload = mapped.length === 1 ? mapped[0] : mapped;
      const res = await this.api.post('/usuarioFormulario', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirUsuarioFormulario(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/usuarioFormulario', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarPermissoes(): Promise<Permissao[]> {
    try {
      const res = await this.api.get('/permissao', { headers: this.getAuthHeaders() });
      return res.data as Permissao[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarPermissoesPorFormulario(usuarioFormularioId: number): Promise<string[]> {
    try {
      const res = await this.api.get('/usuarioFormularioPermissao', {
        params: { usuario_formulario_id: usuarioFormularioId },
        headers: this.getAuthHeaders(),
      });
      return res.data as string[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarPermissoesFormulario(usuarioFormularioId: number, permissoes: string[]): Promise<unknown> {
    try {
      const res = await this.api.post('/usuarioFormularioPermissao', {
        usuario_formulario_id: usuarioFormularioId,
        permissoes,
      }, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarPermissoesUsuario(usuarioId: number): Promise<FormularioPermissao[]> {
    try {
      const res = await this.api.get('/usuarioPermissoes', {
        params: { usuario_id: usuarioId },
        headers: this.getAuthHeaders(),
      });
      return res.data as FormularioPermissao[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarHorasTrabalhadas(params?: Record<string, unknown>): Promise<HoraTrabalhada[]> {
    try {
      const res = await this.api.get('/horasTrabalhadas', { params, headers: this.getAuthHeaders() });
      const rawData = res.data;
      console.log('[HorseAPI] /horasTrabalhadas status:', res.status, 'type:', typeof rawData, 'isArray:', Array.isArray(rawData));

      if (!Array.isArray(rawData)) {
        console.log('[HorseAPI] /horasTrabalhadas dados nao sao array:', JSON.stringify(rawData).substring(0, 500));
        return [];
      }

      if (rawData.length === 0) {
        console.log('[HorseAPI] /horasTrabalhadas array vazio');
        return [];
      }

      console.log('[HorseAPI] /horasTrabalhadas primeiro item keys:', Object.keys(rawData[0]));
      console.log('[HorseAPI] /horasTrabalhadas primeiro item:', JSON.stringify(rawData[0]));

      const mapped = rawData.map((item: Record<string, unknown>) => ({
        id: Number(item.id ?? item.codigo ?? 0),
        usuarioId: Number(item.usuario_id ?? item.usuarioId ?? 0),
        clienteId: Number(item.cliente_id ?? item.clienteId ?? 0),
        clienteNome: String(item.cliente_nome ?? item.clienteNome ?? ''),
        servicoId: Number(item.servico_id ?? item.servicoId ?? 0),
        servicoNome: String(item.servico_nome ?? item.servicoNome ?? ''),
        valorHora: Number(item.valor_hora ?? item.valorHora ?? 0),
        dataServico: normalizeDate(item.data_servico ?? item.dataServico ?? ''),
        horaInicio: String(item.hora_inicio ?? item.horaInicio ?? ''),
        horaTermino: String(item.hora_termino ?? item.horaTermino ?? ''),
        quantidadeHoras: Number(item.quantidade_horas ?? item.quantidadeHoras ?? 0),
        totalHoras: Number(item.total_horas ?? item.totalHoras ?? 0),
        observacoes: String(item.observacoes ?? ''),
      }));

      console.log('[HorseAPI] /horasTrabalhadas mapeados:', mapped.length, 'registros');
      return mapped;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        console.error('[HorseAPI] /horasTrabalhadas erro HTTP:', status, JSON.stringify(data).substring(0, 500));
        if (status === 404) {
          return [];
        }
      } else {
        console.error('[HorseAPI] /horasTrabalhadas erro:', error);
      }
      return this.handleError(error);
    }
  }

  async salvarHorasTrabalhadas(horas: HoraTrabalhada[]): Promise<unknown> {
    try {
      const calcHorasDecimal = (inicio: string, termino: string): number => {
        if (!inicio || !termino) return 0;
        const [hI, mI] = inicio.split(':').map(Number);
        const [hT, mT] = termino.split(':').map(Number);
        const minInicio = hI * 60 + mI;
        const minTermino = hT * 60 + mT;
        if (minTermino > minInicio) {
          return (minTermino - minInicio) / 60;
        }
        return (1440 - minInicio + minTermino) / 60;
      };

      const mapHora = (h: HoraTrabalhada) => {
        const qtdHoras = h.quantidadeHoras ?? calcHorasDecimal(h.horaInicio, h.horaTermino);
        const vHora = Number(h.valorHora);
        return {
          codigo: h.id ?? h.codigo ?? 0,
          usuario_id: h.usuarioId ?? 0,
          cliente_id: h.clienteId ?? 0,
          servico_id: h.servicoId ?? 0,
          valor_hora: vHora,
          data_servico: h.dataServico,
          hora_inicio: h.horaInicio,
          hora_termino: h.horaTermino,
          quantidade_horas: qtdHoras,
          total_horas: ceilTo2(qtdHoras * vHora),
          observacoes: h.observacoes ?? '',
        };
      };
      const mapped = horas.map(mapHora);
      const payload = mapped.length === 1 ? mapped[0] : mapped;
      const res = await this.api.post('/horasTrabalhadas', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirHoraTrabalhada(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/horasTrabalhadas', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarServicos(params?: Record<string, unknown>): Promise<Servico[]> {
    try {
      const res = await this.api.get('/servico', { params, headers: this.getAuthHeaders() });
      const raw = (Array.isArray(res.data) ? res.data : []) as Record<string, unknown>[];
      return raw.map((item) => {
        const vh = item.valor_hora ?? item.valorHora ?? item.ValorHora ?? 0;
        const hm = item.horas_minimas ?? item.horasMinimas ?? item.HorasMinimas ?? '0';
        return {
          id: Number(item.id ?? item.codigo ?? item.Codigo ?? 0),
          nome: String(item.nome ?? item.Nome ?? ''),
          valorHora: Number(vh) || 0,
          horasMinimas: String(hm || '0'),
        };
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarServicos(servicos: Servico[]): Promise<unknown> {
    try {
      const mapServico = (s: Servico) => ({
        id: s.id ?? s.codigo ?? 0,
        nome: s.nome,
        valor_hora: s.valorHora,
        horas_minimas: s.horasMinimas || '0',
      });
      const mapped = servicos.map(mapServico);
      const payload = mapped.length === 1 ? mapped[0] : mapped;
      const res = await this.api.post('/servico', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirServico(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/servico', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarHorasAbatidas(params?: Record<string, unknown>): Promise<HoraAbatida[]> {
    try {
      const res = await this.api.get('/horasAbatidas', { params, headers: this.getAuthHeaders() });
      const rawData = res.data;
      console.log('[HorseAPI] /horasAbatidas status:', res.status, 'type:', typeof rawData, 'isArray:', Array.isArray(rawData));

      if (!Array.isArray(rawData)) {
        console.log('[HorseAPI] /horasAbatidas dados nao sao array:', JSON.stringify(rawData).substring(0, 500));
        return [];
      }

      if (rawData.length > 0) {
        console.log('[HorseAPI] /horasAbatidas primeiro item:', JSON.stringify(rawData[0]));
      }

      const mapped = rawData.map((item: Record<string, unknown>) => ({
        id: Number(item.id ?? item.codigo ?? 0),
        usuarioId: Number(item.usuario_id ?? item.usuarioId ?? 0),
        usuarioNome: String(item.usuario_nome ?? item.usuarioNome ?? ''),
        clienteId: Number(item.cliente_id ?? item.clienteId ?? 0),
        clienteNome: String(item.cliente_nome ?? item.clienteNome ?? ''),
        servicoId: Number(item.servico_id ?? item.servicoId ?? 0),
        servicoNome: String(item.servico_nome ?? item.servicoNome ?? ''),
        dataAbatimento: normalizeDate(item.data_abatimento ?? item.dataAbatimento ?? ''),
        valor: Number(item.valor ?? 0),
        valorHora: Number(item.valor_hora ?? item.valorHora ?? 0),
        quantidadeHoras: Number(item.quantidade_horas ?? item.quantidadeHoras ?? 0),
        observacoes: String(item.observacoes ?? ''),
      }));

      return mapped;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404) {
          return [];
        }
      }
      return this.handleError(error);
    }
  }

  async salvarHorasAbatidas(horas: HoraAbatida[]): Promise<unknown> {
    try {
      const mapHora = (h: HoraAbatida) => ({
        codigo: h.id ?? h.codigo ?? 0,
        usuario_id: h.usuarioId ?? 0,
        cliente_id: h.clienteId ?? 0,
        servico_id: h.servicoId ?? 0,
        data_abatimento: h.dataAbatimento,
        valor: h.valor,
        valor_hora: h.valorHora,
        quantidade_horas: h.quantidadeHoras,
        observacoes: h.observacoes ?? '',
      });
      const mapped = horas.map(mapHora);
      const payload = mapped.length === 1 ? mapped[0] : mapped;
      const res = await this.api.post('/horasAbatidas', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirHoraAbatida(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/horasAbatidas', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarHorasExcedidas(params?: Record<string, unknown>): Promise<HoraExcedida[]> {
    try {
      const res = await this.api.get('/horasExcedidas', { params, headers: this.getAuthHeaders() });
      const rawData = res.data;
      if (!Array.isArray(rawData)) {
        return [];
      }
      return rawData.map((item: Record<string, unknown>) => ({
        id: Number(item.id ?? item.codigo ?? 0),
        usuarioId: Number(item.usuario_id ?? item.usuarioId ?? 0),
        usuarioNome: String(item.usuario_nome ?? item.usuarioNome ?? ''),
        clienteId: Number(item.cliente_id ?? item.clienteId ?? 0),
        clienteNome: String(item.cliente_nome ?? item.clienteNome ?? ''),
        servicoId: Number(item.servico_id ?? item.servicoId ?? 0),
        servicoNome: String(item.servico_nome ?? item.servicoNome ?? ''),
        mesOrigem: Number(item.mes_origem ?? item.mesOrigem ?? 0),
        anoOrigem: Number(item.ano_origem ?? item.anoOrigem ?? 0),
        deltaHoras: Number(item.delta_horas ?? item.deltaHoras ?? 0),
        dataCriacao: String(item.data_criacao ?? item.dataCriacao ?? ''),
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404) {
          return [];
        }
      }
      return this.handleError(error);
    }
  }

  async salvarHorasExcedidas(horas: HoraExcedida[]): Promise<unknown> {
    try {
      const mapHora = (h: HoraExcedida) => ({
        codigo: h.id ?? h.codigo ?? 0,
        usuario_id: h.usuarioId ?? 0,
        cliente_id: h.clienteId ?? 0,
        servico_id: h.servicoId ?? 0,
        mes_origem: h.mesOrigem,
        ano_origem: h.anoOrigem,
        delta_horas: h.deltaHoras,
      });
      const mapped = horas.map(mapHora);
      const payload = mapped.length === 1 ? mapped[0] : mapped;
      const res = await this.api.post('/horasExcedidas', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarInsumos(params?: Record<string, unknown>): Promise<Insumo[]> {
    try {
      const res = await this.api.get('/insumo', { params, headers: this.getAuthHeaders() });
      return res.data as Insumo[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarInsumos(items: Insumo[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/insumo', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirInsumo(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/insumo', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async recalcularInsumos(insumoId?: string): Promise<unknown> {
    try {
      const params = insumoId ? { id: insumoId } : {};
      const res = await this.api.get('/insumoRecalcular', { params, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarMarcas(params?: Record<string, unknown>): Promise<unknown[]> {
    try {
      const res = await this.api.get('/marca', { params, headers: this.getAuthHeaders() });
      return res.data as unknown[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarMarcas(items: unknown[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/marca', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirMarca(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/marca', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarMigracoes(): Promise<unknown> {
    try {
      const res = await this.api.get('/migracoes', { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async aplicarMigracao(nome: string): Promise<unknown> {
    try {
      const res = await this.api.post('/migracoes/aplicar', { nome }, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarComprasInsumo(params?: Record<string, unknown>): Promise<CompraInsumo[]> {
    try {
      const res = await this.api.get('/compraInsumo', { params, headers: this.getAuthHeaders() });
      return res.data as CompraInsumo[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarComprasInsumo(items: CompraInsumo[], empresaId?: number): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/compraInsumo', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirCompraInsumo(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/compraInsumo', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarProdutosFabricados(params?: Record<string, unknown>): Promise<ProdutoFabricado[]> {
    try {
      const res = await this.api.get('/produtoFabricado', { params, headers: this.getAuthHeaders() });
      return res.data as ProdutoFabricado[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarProdutosFabricados(items: ProdutoFabricado[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/produtoFabricado', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirProdutoFabricado(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/produtoFabricado', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarReceitasIngrediente(params?: Record<string, unknown>): Promise<ReceitaIngrediente[]> {
    try {
      const res = await this.api.get('/receitaIngrediente', { params, headers: this.getAuthHeaders() });
      return res.data as ReceitaIngrediente[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarReceitasIngrediente(items: ReceitaIngrediente[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/receitaIngrediente', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirReceitaIngrediente(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/receitaIngrediente', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarCustosAdicionaisTipo(params?: Record<string, unknown>): Promise<CustoAdicionalTipo[]> {
    try {
      const res = await this.api.get('/custoAdicionalTipo', { params, headers: this.getAuthHeaders() });
      return res.data as CustoAdicionalTipo[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarCustosAdicionaisTipo(items: CustoAdicionalTipo[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/custoAdicionalTipo', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirCustoAdicionalTipo(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/custoAdicionalTipo', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarFabricacoes(params?: Record<string, unknown>): Promise<Fabricacao[]> {
    try {
      const res = await this.api.get('/fabricacao', { params, headers: this.getAuthHeaders() });
      return res.data as Fabricacao[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarFabricacoes(items: Fabricacao[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/fabricacao', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirFabricacao(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/fabricacao', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarVendasProduto(params?: Record<string, unknown>): Promise<VendaProduto[]> {
    try {
      const res = await this.api.get('/vendaProduto', { params, headers: this.getAuthHeaders() });
      return res.data as VendaProduto[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarVendasProduto(items: VendaProduto[], empresaId?: number): Promise<unknown> {
    try {
      const header = (Array.isArray(items) ? items : [items])[0] ?? {} as VendaProduto;
      const categoriaReceberPadrao = empresaId ? getFinanceiroEmpresa(empresaId)?.categoriaReceberVendaPadrao : undefined;
      const payload = {
        id: header.id ?? header.codigo ?? 0,
        cliente_id: header.cliente_id,
        data_venda: header.data_venda,
        observacao: header.observacao ?? '',
        recebido: header.recebido ?? true,
        categoria_receber_id: header.categoria_receber_id ?? categoriaReceberPadrao ?? 0,
        itens: (header.itens ?? []).map((i) => ({
          produto_fabricado_id: i.produto_fabricado_id,
          quantidade: Number(i.quantidade),
          valor_unitario: Number(i.valor_unitario),
          valor_total: Number(i.valor_total),
        })),
      };
      const res = await this.api.post('/vendaProduto', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirVendaProduto(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/vendaProduto', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarEncomendas(params?: Record<string, unknown>): Promise<Encomenda[]> {
    try {
      const res = await this.api.get('/encomenda', { params, headers: this.getAuthHeaders() });
      return res.data as Encomenda[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarEncomendas(items: Encomenda[], empresaId?: number): Promise<unknown> {
    try {
      const header = (Array.isArray(items) ? items : [items])[0] ?? {} as Encomenda;
      const payload = {
        id: header.id ?? header.codigo ?? 0,
        cliente_id: header.cliente_id,
        data_encomenda: header.data_encomenda,
        observacao: header.observacao ?? '',
        itens: (header.itens ?? []).map((i) => ({
          produto_fabricado_id: i.produto_fabricado_id,
          quantidade: Number(i.quantidade),
          valor_unitario: Number(i.valor_unitario),
          valor_total: Number(i.valor_total),
        })),
      };
      const res = await this.api.post('/encomenda', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirEncomenda(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/encomenda', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async gerarVendaDeEncomenda(data: { id: number; data_venda: string; recebido?: boolean; categoria_receber_id?: number }): Promise<unknown> {
    try {
      const res = await this.api.post('/encomenda/gerarVenda', data, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarFabricacoesCustoAdicional(params?: Record<string, unknown>): Promise<FabricacaoCustoAdicional[]> {
    try {
      const res = await this.api.get('/fabricacaoCustoAdicional', { params, headers: this.getAuthHeaders() });
      return res.data as FabricacaoCustoAdicional[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarFabricacoesCustoAdicional(items: FabricacaoCustoAdicional[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/fabricacaoCustoAdicional', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirFabricacaoCustoAdicional(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/fabricacaoCustoAdicional', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarEstoqueInsumo(params?: Record<string, unknown>): Promise<EstoqueInsumo[]> {
    try {
      const res = await this.api.get('/estoqueInsumo', { params, headers: this.getAuthHeaders() });
      return res.data as EstoqueInsumo[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarEstoqueInsumo(items: EstoqueInsumo[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/estoqueInsumo', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirEstoqueInsumo(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/estoqueInsumo', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarEstoqueProdutoFabricado(params?: Record<string, unknown>): Promise<EstoqueProdutoFabricado[]> {
    try {
      const res = await this.api.get('/estoqueProdutoFabricado', { params, headers: this.getAuthHeaders() });
      return res.data as EstoqueProdutoFabricado[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarEstoqueProdutoFabricado(items: EstoqueProdutoFabricado[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/estoqueProdutoFabricado', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirEstoqueProdutoFabricado(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/estoqueProdutoFabricado', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarEmpresasPublic(): Promise<Empresa[]> {
    try {
      const res = await this.api.get('/empresaPublic');
      return res.data as Empresa[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarEmpresas(params?: Record<string, unknown>): Promise<Empresa[]> {
    try {
      const res = await this.api.get('/empresa', { params, headers: this.getAuthHeaders() });
      return res.data as Empresa[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarEmpresas(empresas: Empresa[]): Promise<unknown> {
    try {
      const payload = empresas.length === 1 ? empresas[0] : empresas;
      const res = await this.api.post('/empresa', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarModulos(params?: Record<string, unknown>): Promise<Modulo[]> {
    try {
      const res = await this.api.get('/modulo', { params, headers: this.getAuthHeaders() });
      return res.data as Modulo[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarModulos(items: Modulo[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/modulo', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirModulo(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/modulo', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarModuloFormularios(params?: Record<string, unknown>): Promise<ModuloFormulario[]> {
    try {
      const res = await this.api.get('/moduloFormulario', { params, headers: this.getAuthHeaders() });
      return res.data as ModuloFormulario[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarModuloFormularios(data: { modulo_id: number; formularios: number[]; abertura?: number }): Promise<unknown> {
    try {
      const existing = await this.listarModuloFormularios({ modulo_id: data.modulo_id });
      const existingMap = new Map<number, ModuloFormulario>();
      for (const r of existing) {
        if (r.formulario_id != null) existingMap.set(r.formulario_id, r);
      }
      const newSet = new Set(data.formularios);
      const toDelete = existing.filter((r) => r.formulario_id != null && !newSet.has(r.formulario_id));
      for (const r of toDelete) {
        const id = r.id ?? r.codigo;
        if (id) await this.api.delete('/moduloFormulario', { params: { id }, headers: this.getAuthHeaders() });
      }
      const toUpsert = data.formularios.map((fid) => {
        const existingRecord = existingMap.get(fid);
        return {
          id: existingRecord?.id ?? 0,
          modulo_id: data.modulo_id,
          formulario_id: fid,
          abertura: data.abertura === fid ? 1 : 0,
        };
      });
      const res = await this.api.post('/moduloFormulario', toUpsert, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[horseApi] salvarModuloFormularios erro:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          body: data,
        });
      }
      return this.handleError(error);
    }
  }

  async listarEmpresaModulos(params?: Record<string, unknown>): Promise<EmpresaModulo[]> {
    try {
      const res = await this.api.get('/empresaModulo', { params, headers: this.getAuthHeaders() });
      return res.data as EmpresaModulo[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirModuloFormulario(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/moduloFormulario', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarLancamentoAutomaticoConfig(params?: Record<string, unknown>): Promise<unknown> {
    try {
      const res = await this.api.get('/lancamentoAutomaticoConfig', { params, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarLancamentoAutomaticoConfig(items: unknown): Promise<unknown> {
    try {
      const payload = Array.isArray(items) ? items : [items];
      const res = await this.api.post('/lancamentoAutomaticoConfig', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirLancamentoAutomaticoConfig(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/lancamentoAutomaticoConfig', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirEmpresaModulo(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/empresaModulo', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarEmpresaModulos(data: { empresa_id: number; modulos: number[] }): Promise<unknown> {
    try {
      console.log('[salvarEmpresaModulos] data:', JSON.stringify(data));
      const existing = await this.listarEmpresaModulos({ empresa_id: data.empresa_id });
      console.log('[salvarEmpresaModulos] existing:', JSON.stringify(existing));
      const existingMap = new Map<number, EmpresaModulo>();
      if (Array.isArray(existing)) {
        for (const r of existing) {
          if (r.modulo_id != null) existingMap.set(r.modulo_id, r);
        }
      } else {
        console.error('[salvarEmpresaModulos] existing nao e array:', typeof existing, existing);
        throw new Error('Resposta inesperada do servidor: existing nao e array');
      }
      const newSet = new Set(data.modulos);
      const toDelete = existing.filter((r) => r.modulo_id != null && !newSet.has(r.modulo_id));
      console.log('[salvarEmpresaModulos] toDelete:', toDelete.length, 'toUpsert:', data.modulos.length);
      for (const r of toDelete) {
        const id = r.id ?? r.codigo;
        if (id) {
          console.log('[salvarEmpresaModulos] deletando id:', id, 'empresa:', data.empresa_id);
          await this.api.delete('/empresaModulo', { params: { id, empresa_id: data.empresa_id }, headers: this.getAuthHeaders() });
        }
      }
      const toUpsert = data.modulos.map((mid) => {
        const existingRecord = existingMap.get(mid);
        return {
          id: existingRecord?.id ?? 0,
          empresa_id: data.empresa_id,
          modulo_id: mid,
        };
      });
      console.log('[salvarEmpresaModulos] toUpsert payload:', JSON.stringify(toUpsert));
      const res = await this.api.post('/empresaModulo', toUpsert, { headers: this.getAuthHeaders() });
      console.log('[salvarEmpresaModulos] POST /empresaModulo sucesso:', res.status);
      return res.data;
    } catch (error) {
      console.error('[salvarEmpresaModulos] catch error:', error);
      if (error instanceof Error) console.error('[salvarEmpresaModulos] stack:', error.stack);
      return this.handleError(error);
    }
  }

  async testEmpresaModulo(empresa_id: number, modulo_id: number): Promise<unknown> {
    const body = [{ id: 0, empresa_id, modulo_id }];
    const res = await this.api.post('/empresaModulo', body, { headers: this.getAuthHeaders() });
    return { status: res.status, data: res.data };
  }

  async excluirEmpresa(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/empresa', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async limparDadosEmpresa(empresaId: number): Promise<unknown> {
    try {
      const res = await this.api.post('/empresa/limpar-dados', { empresa_id: empresaId }, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarPerdasInsumo(params?: Record<string, unknown>): Promise<PerdaInsumo[]> {
    try {
      const res = await this.api.get('/perdaInsumo', { params, headers: this.getAuthHeaders() });
      return res.data as PerdaInsumo[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarPerdasInsumo(items: PerdaInsumo[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/perdaInsumo', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirPerdaInsumo(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/perdaInsumo', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarPerdasProdutoFabricado(params?: Record<string, unknown>): Promise<PerdaProdutoFabricado[]> {
    try {
      const res = await this.api.get('/perdaProdutoFabricado', { params, headers: this.getAuthHeaders() });
      return res.data as PerdaProdutoFabricado[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarPerdasProdutoFabricado(items: PerdaProdutoFabricado[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/perdaProdutoFabricado', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirPerdaProdutoFabricado(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/perdaProdutoFabricado', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listarUsoConsumo(params?: Record<string, unknown>): Promise<UsoConsumo[]> {
    try {
      const res = await this.api.get('/usoConsumo', { params, headers: this.getAuthHeaders() });
      return res.data as UsoConsumo[];
    } catch (error) {
      return this.handleError(error);
    }
  }

  async salvarUsoConsumo(items: UsoConsumo[]): Promise<unknown> {
    try {
      const payload = items.length === 1 ? items[0] : items;
      const res = await this.api.post('/usoConsumo', payload, { headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async excluirUsoConsumo(id: number): Promise<unknown> {
    try {
      const res = await this.api.delete('/usoConsumo', { params: { id }, headers: this.getAuthHeaders() });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async atualizarSequencias(): Promise<{ mensagem: string; total: number }> {
    try {
      const res = await this.api.post('/empresa/atualizar-sequencias', {}, { headers: this.getAuthHeaders() });
      return res.data as { mensagem: string; total: number };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export const horseApi = new HorseApiService();
