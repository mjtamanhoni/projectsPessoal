"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.horseApi = void 0;
const axios_1 = __importDefault(require("axios"));
const node_async_hooks_1 = require("node:async_hooks");
const config_1 = require("../config");
const types_1 = require("../types");
const settings_1 = require("./settings");
function ceilTo2(value) {
    return Math.ceil(value * 100) / 100;
}
function normalizeDate(val) {
    if (!val)
        return '';
    if (typeof val === 'number') {
        const date = new Date((val - 25569) * 86400000);
        return date.toISOString().split('T')[0];
    }
    const s = String(val);
    const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : s;
}
// Cada requisicao autenticada carrega seu proprio token (via AsyncLocalStorage),
// evitando que sessoes de empresas/usuarios diferentes se sobrescrevam.
const tokenStore = new node_async_hooks_1.AsyncLocalStorage();
class HorseApiService {
    api;
    token = null;
    constructor() {
        this.api = axios_1.default.create({
            baseURL: config_1.config.horseApi.baseUrl,
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    setToken(token) {
        this.token = token;
    }
    clearToken() {
        this.token = null;
    }
    runWithToken(token, fn) {
        tokenStore.run(token, fn);
    }
    getAuthHeaders() {
        const token = tokenStore.getStore() ?? this.token;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
    handleError(error) {
        if (axios_1.default.isAxiosError(error)) {
            const axiosError = error;
            const status = axiosError.response?.status || 500;
            const data = axiosError.response?.data;
            let message = 'Erro interno do servidor';
            if (typeof data === 'string' && data) {
                message = data;
            }
            else if (data && typeof data === 'object') {
                const obj = data;
                message = obj.erro || obj.mensagem || message;
            }
            else {
                message = axiosError.message || message;
            }
            if (!message) {
                message = `Requisição falhou com status ${status}`;
            }
            console.error(`[HorseAPI] ${axiosError.config?.method?.toUpperCase()} ${axiosError.config?.url} -> ${status}: ${message}`, data);
            throw new types_1.AppError(message, status);
        }
        if (error instanceof types_1.AppError)
            throw error;
        console.error('[HorseAPI] Erro inesperado:', error);
        throw new types_1.AppError('Erro inesperado', 500);
    }
    async login(data) {
        try {
            const res = await this.api.post('/usuario/login', data);
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarClientes(params) {
        try {
            const res = await this.api.get('/cliente', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarClientes(clientes) {
        try {
            const payload = clientes.map(({ cpf_cnpj, ...rest }) => cpf_cnpj ? { ...rest, cnpj_cpf: cpf_cnpj } : rest);
            const res = await this.api.post('/cliente', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirCliente(id) {
        try {
            const res = await this.api.delete('/cliente', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarFornecedores(params) {
        try {
            const res = await this.api.get('/fornecedor', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarFornecedores(fornecedores) {
        try {
            const res = await this.api.post('/fornecedor', fornecedores, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirFornecedor(id) {
        try {
            const res = await this.api.delete('/fornecedor', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarCategoriasPagar(params) {
        try {
            const res = await this.api.get('/categoriaPagar', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarCategoriasPagar(categorias) {
        try {
            const res = await this.api.post('/categoriaPagar', categorias, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirCategoriaPagar(id) {
        try {
            const res = await this.api.delete('/categoriaPagar', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarCategoriasReceber(params) {
        try {
            const res = await this.api.get('/categoriaReceber', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarCategoriasReceber(categorias) {
        try {
            const res = await this.api.post('/categoriaReceber', categorias, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirCategoriaReceber(id) {
        try {
            const res = await this.api.delete('/categoriaReceber', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarFormularios(params) {
        try {
            const res = await this.api.get('/formulario', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarFormularios(formularios) {
        try {
            const res = await this.api.post('/formulario', formularios, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirFormulario(id) {
        try {
            const res = await this.api.delete('/formulario', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    mapSnakeToCamel(data) {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = value;
        }
        return result;
    }
    mapArray(data) {
        if (Array.isArray(data))
            return data.map((item) => this.mapSnakeToCamel(item));
        return [];
    }
    async listarContasPagar(params) {
        try {
            const res = await this.api.get('/contasPagar', { params, headers: this.getAuthHeaders() });
            return this.mapArray(res.data);
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarContasPagar(contas) {
        try {
            const mapConta = (c) => {
                const { lancamentoOrigemId, ...rest } = c;
                return {
                    ...rest,
                    ...(lancamentoOrigemId != null ? { lancamentoOrigemId, lancamento_origem_id: lancamentoOrigemId } : {}),
                };
            };
            const mapped = contas.map(mapConta);
            const payload = mapped.length === 1 ? mapped[0] : mapped;
            const res = await this.api.post('/contasPagar', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirContaPagar(id) {
        try {
            const res = await this.api.delete('/contasPagar', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async pagarConta(data) {
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
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async estornarContaPagar(id) {
        try {
            const res = await this.api.put('/contasPagar/estornar', { id }, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarContasReceber(params) {
        try {
            const res = await this.api.get('/contasReceber', { params, headers: this.getAuthHeaders() });
            return this.mapArray(res.data);
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarContasReceber(contas) {
        try {
            const mapConta = (c) => {
                const { lancamentoOrigemId, dataVencimento, clienteId, idCategoria, dataRecebimento, ...rest } = c;
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
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirContaReceber(id) {
        try {
            const res = await this.api.delete('/contasReceber', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async receberConta(data) {
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
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async estornarContaReceber(id) {
        try {
            const res = await this.api.put('/contasReceber/estornar', { id }, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async obterDashboard(filtros) {
        let pagar = [];
        let receber = [];
        try {
            const pRes = await this.api.get('/contasPagar', { headers: this.getAuthHeaders() });
            pagar = Array.isArray(pRes.data) ? pRes.data : [];
        }
        catch (e) {
            console.error('[obterDashboard] Erro ao buscar contas a pagar:', e);
        }
        try {
            const rRes = await this.api.get('/contasReceber', { headers: this.getAuthHeaders() });
            receber = Array.isArray(rRes.data) ? rRes.data : [];
        }
        catch (e) {
            console.error('[obterDashboard] Erro ao buscar contas a receber:', e);
        }
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const status = filtros?.status || 'aberto';
        const getVenc = (o) => o['data_vencimento'];
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
    async obterProducaoDashboard(params) {
        try {
            const res = await this.api.get('/producaoDashboard', { params, headers: this.getAuthHeaders() });
            const raw = res.data;
            const kpisRaw = raw.kpis || {};
            const mensalVendasRaw = raw.mensal_vendas || [];
            const mensalComprasRaw = raw.mensal_compras || [];
            const mensalFabricacaoRaw = raw.mensal_fabricacao || [];
            const diarioFabricacaoRaw = raw.diario_fabricacao || [];
            const diarioVendasRaw = raw.diario_vendas || [];
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
                mensal_vendas: mensalVendasRaw.map((m) => ({
                    mes: Number(m.mes ?? 0),
                    valor: Number(m.valor ?? 0),
                    qtd: Number(m.qtd ?? 0),
                    qtd_vendas: Number(m.qtd_vendas ?? 0),
                })),
                mensal_compras: mensalComprasRaw.map((m) => ({
                    mes: Number(m.mes ?? 0),
                    valor: Number(m.valor ?? 0),
                    qtd: Number(m.qtd ?? 0),
                })),
                mensal_fabricacao: mensalFabricacaoRaw.map((m) => ({
                    mes: Number(m.mes ?? 0),
                    qtd_fabricada: Number(m.qtd_fabricada ?? 0),
                    custo_total: Number(m.custo_total ?? 0),
                    qtd: Number(m.qtd ?? 0),
                })),
                diario_fabricacao: diarioFabricacaoRaw.map((d) => ({
                    dia: String(d.dia ?? ''),
                    qtd_fabricada: Number(d.qtd_fabricada ?? 0),
                })),
                diario_vendas: diarioVendasRaw.map((d) => ({
                    dia: String(d.dia ?? ''),
                    valor: Number(d.valor ?? 0),
                })),
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
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
    async obterHorasDashboard(params) {
        try {
            const res = await this.api.get('/horasDashboard', { params, headers: this.getAuthHeaders() });
            const raw = res.data;
            const kpisRaw = raw.kpis || {};
            const diarioRaw = raw.diario || [];
            const mensalRaw = raw.mensal || [];
            const abatidoRaw = raw.abatido_mensal || [];
            return {
                kpis: {
                    totalHoras: Number(kpisRaw.total_horas ?? 0),
                    totalValor: Number(kpisRaw.total_valor ?? 0),
                    totalAbatido: Number(kpisRaw.total_abatido ?? 0),
                    diasTrabalhados: Number(kpisRaw.dias_trabalhados ?? 0),
                },
                diario: diarioRaw.map((d) => ({
                    dia: String(d.dia ?? ''),
                    horas: Number(d.horas ?? 0),
                    valor: Number(d.valor ?? 0),
                })),
                mensal: mensalRaw.map((m) => ({
                    mes: Number(m.mes ?? 0),
                    horas: Number(m.horas ?? 0),
                    valor: Number(m.valor ?? 0),
                })),
                abatidoMensal: abatidoRaw.map((a) => ({
                    mes: Number(a.mes ?? 0),
                    horas_abatidas: Number(a.horas_abatidas ?? 0),
                })),
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
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
    async listarUsuarios(params) {
        try {
            const res = await this.api.get('/usuario', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarUsuarios(usuarios) {
        try {
            const res = await this.api.post('/usuario', usuarios, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirUsuario(id) {
        try {
            const res = await this.api.delete('/usuario', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async alterarSenhaUsuario(id, novaSenha) {
        try {
            const res = await this.api.put('/usuario/alterarSenha', { id, nova_senha: novaSenha }, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async alterarPinUsuario(id, novoPin) {
        try {
            const res = await this.api.put('/usuario/alterarPin', { id, novo_pin: novoPin }, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarUsuarioFormularios(params) {
        try {
            const res = await this.api.get('/usuarioFormulario', { params, headers: this.getAuthHeaders() });
            return this.mapArray(res.data);
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarUsuarioFormularios(itens) {
        try {
            const mapped = itens.map((item) => ({
                codigo: item.codigo ?? item.id ?? 0,
                usuario_id: item.usuarioId,
                formulario_id: item.formularioId,
            }));
            const payload = mapped.length === 1 ? mapped[0] : mapped;
            const res = await this.api.post('/usuarioFormulario', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirUsuarioFormulario(id) {
        try {
            const res = await this.api.delete('/usuarioFormulario', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarPermissoes() {
        try {
            const res = await this.api.get('/permissao', { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarPermissoesPorFormulario(usuarioFormularioId) {
        try {
            const res = await this.api.get('/usuarioFormularioPermissao', {
                params: { usuario_formulario_id: usuarioFormularioId },
                headers: this.getAuthHeaders(),
            });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarPermissoesFormulario(usuarioFormularioId, permissoes) {
        try {
            const res = await this.api.post('/usuarioFormularioPermissao', {
                usuario_formulario_id: usuarioFormularioId,
                permissoes,
            }, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarPermissoesUsuario(usuarioId) {
        try {
            const res = await this.api.get('/usuarioPermissoes', {
                params: { usuario_id: usuarioId },
                headers: this.getAuthHeaders(),
            });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarHorasTrabalhadas(params) {
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
            const mapped = rawData.map((item) => ({
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
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const status = error.response?.status;
                const data = error.response?.data;
                console.error('[HorseAPI] /horasTrabalhadas erro HTTP:', status, JSON.stringify(data).substring(0, 500));
                if (status === 404) {
                    return [];
                }
            }
            else {
                console.error('[HorseAPI] /horasTrabalhadas erro:', error);
            }
            return this.handleError(error);
        }
    }
    async salvarHorasTrabalhadas(horas) {
        try {
            const calcHorasDecimal = (inicio, termino) => {
                if (!inicio || !termino)
                    return 0;
                const [hI, mI] = inicio.split(':').map(Number);
                const [hT, mT] = termino.split(':').map(Number);
                const minInicio = hI * 60 + mI;
                const minTermino = hT * 60 + mT;
                if (minTermino > minInicio) {
                    return (minTermino - minInicio) / 60;
                }
                return (1440 - minInicio + minTermino) / 60;
            };
            const mapHora = (h) => {
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
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirHoraTrabalhada(id) {
        try {
            const res = await this.api.delete('/horasTrabalhadas', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarServicos(params) {
        try {
            const res = await this.api.get('/servico', { params, headers: this.getAuthHeaders() });
            const raw = (Array.isArray(res.data) ? res.data : []);
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
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarServicos(servicos) {
        try {
            const mapServico = (s) => ({
                id: s.id ?? s.codigo ?? 0,
                nome: s.nome,
                valor_hora: s.valorHora,
                horas_minimas: s.horasMinimas || '0',
            });
            const mapped = servicos.map(mapServico);
            const payload = mapped.length === 1 ? mapped[0] : mapped;
            const res = await this.api.post('/servico', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirServico(id) {
        try {
            const res = await this.api.delete('/servico', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarHorasAbatidas(params) {
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
            const mapped = rawData.map((item) => ({
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
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 404) {
                    return [];
                }
            }
            return this.handleError(error);
        }
    }
    async salvarHorasAbatidas(horas) {
        try {
            const mapHora = (h) => ({
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
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirHoraAbatida(id) {
        try {
            const res = await this.api.delete('/horasAbatidas', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarHorasExcedidas(params) {
        try {
            const res = await this.api.get('/horasExcedidas', { params, headers: this.getAuthHeaders() });
            const rawData = res.data;
            if (!Array.isArray(rawData)) {
                return [];
            }
            return rawData.map((item) => ({
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
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 404) {
                    return [];
                }
            }
            return this.handleError(error);
        }
    }
    async salvarHorasExcedidas(horas) {
        try {
            const mapHora = (h) => ({
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
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarInsumos(params) {
        try {
            const res = await this.api.get('/insumo', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarInsumos(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/insumo', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirInsumo(id) {
        try {
            const res = await this.api.delete('/insumo', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async recalcularInsumos(insumoId) {
        try {
            const params = insumoId ? { id: insumoId } : {};
            const res = await this.api.get('/insumoRecalcular', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarMarcas(params) {
        try {
            const res = await this.api.get('/marca', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarMarcas(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/marca', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirMarca(id) {
        try {
            const res = await this.api.delete('/marca', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarMigracoes() {
        try {
            const res = await this.api.get('/migracoes', { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async aplicarMigracao(nome) {
        try {
            const res = await this.api.post('/migracoes/aplicar', { nome }, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarComprasInsumo(params) {
        try {
            const res = await this.api.get('/compraInsumo', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarComprasInsumo(items, empresaId) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/compraInsumo', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirCompraInsumo(id) {
        try {
            const res = await this.api.delete('/compraInsumo', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarProdutosFabricados(params) {
        try {
            const res = await this.api.get('/produtoFabricado', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarProdutosFabricados(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/produtoFabricado', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirProdutoFabricado(id) {
        try {
            const res = await this.api.delete('/produtoFabricado', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarFotoProdutoFabricado(id, foto) {
        try {
            const res = await this.api.post('/produtoFoto', { id, foto }, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarReceitasIngrediente(params) {
        try {
            const res = await this.api.get('/receitaIngrediente', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarReceitasIngrediente(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/receitaIngrediente', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirReceitaIngrediente(id) {
        try {
            const res = await this.api.delete('/receitaIngrediente', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarCustosAdicionaisTipo(params) {
        try {
            const res = await this.api.get('/custoAdicionalTipo', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarCustosAdicionaisTipo(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/custoAdicionalTipo', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirCustoAdicionalTipo(id) {
        try {
            const res = await this.api.delete('/custoAdicionalTipo', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarFabricacoes(params) {
        try {
            const res = await this.api.get('/fabricacao', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarFabricacoes(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/fabricacao', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirFabricacao(id) {
        try {
            const res = await this.api.delete('/fabricacao', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarVendasProduto(params) {
        try {
            const res = await this.api.get('/vendaProduto', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarVendasProduto(items, empresaId) {
        try {
            const header = (Array.isArray(items) ? items : [items])[0] ?? {};
            const categoriaReceberPadrao = empresaId ? (0, settings_1.getFinanceiroEmpresa)(empresaId)?.categoriaReceberVendaPadrao : undefined;
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
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirVendaProduto(id) {
        try {
            const res = await this.api.delete('/vendaProduto', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarEncomendas(params) {
        try {
            const res = await this.api.get('/encomenda', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarEncomendas(items, empresaId) {
        try {
            const header = (Array.isArray(items) ? items : [items])[0] ?? {};
            const payload = {
                id: header.id ?? header.codigo ?? 0,
                cliente_id: header.cliente_id,
                data_encomenda: header.data_encomenda,
                data_entrega: header.data_entrega ?? '',
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
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirEncomenda(id) {
        try {
            const res = await this.api.delete('/encomenda', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async gerarVendaDeEncomenda(data) {
        try {
            const res = await this.api.post('/encomenda/gerarVenda', data, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async alterarStatusEncomenda(data) {
        try {
            const res = await this.api.post('/encomenda', data, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarFabricacoesCustoAdicional(params) {
        try {
            const res = await this.api.get('/fabricacaoCustoAdicional', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarFabricacoesCustoAdicional(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/fabricacaoCustoAdicional', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirFabricacaoCustoAdicional(id) {
        try {
            const res = await this.api.delete('/fabricacaoCustoAdicional', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarEstoqueInsumo(params) {
        try {
            const res = await this.api.get('/estoqueInsumo', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarEstoqueInsumo(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/estoqueInsumo', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirEstoqueInsumo(id) {
        try {
            const res = await this.api.delete('/estoqueInsumo', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarEstoqueProdutoFabricado(params) {
        try {
            const res = await this.api.get('/estoqueProdutoFabricado', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarEstoqueProdutoFabricado(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/estoqueProdutoFabricado', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirEstoqueProdutoFabricado(id) {
        try {
            const res = await this.api.delete('/estoqueProdutoFabricado', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarEmpresasPublic() {
        try {
            const res = await this.api.get('/empresaPublic');
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarEmpresas(params) {
        try {
            const res = await this.api.get('/empresa', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarEmpresas(empresas) {
        try {
            const payload = empresas.length === 1 ? empresas[0] : empresas;
            const res = await this.api.post('/empresa', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarEmpresaLogomarca(id, logomarca) {
        try {
            const res = await this.api.post('/empresa/logomarca', { id, logomarca }, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarModulos(params) {
        try {
            const res = await this.api.get('/modulo', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarModulos(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/modulo', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirModulo(id) {
        try {
            const res = await this.api.delete('/modulo', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarModuloFormularios(params) {
        try {
            const res = await this.api.get('/moduloFormulario', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarModuloFormularios(data) {
        try {
            const existing = await this.listarModuloFormularios({ modulo_id: data.modulo_id });
            const existingMap = new Map();
            for (const r of existing) {
                if (r.formulario_id != null)
                    existingMap.set(r.formulario_id, r);
            }
            const newSet = new Set(data.formularios);
            const toDelete = existing.filter((r) => r.formulario_id != null && !newSet.has(r.formulario_id));
            for (const r of toDelete) {
                const id = r.id ?? r.codigo;
                if (id)
                    await this.api.delete('/moduloFormulario', { params: { id }, headers: this.getAuthHeaders() });
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
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
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
    async listarEmpresaModulos(params) {
        try {
            const res = await this.api.get('/empresaModulo', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirModuloFormulario(id) {
        try {
            const res = await this.api.delete('/moduloFormulario', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarLancamentoAutomaticoConfig(params) {
        try {
            const res = await this.api.get('/lancamentoAutomaticoConfig', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarLancamentoAutomaticoConfig(items) {
        try {
            const payload = Array.isArray(items) ? items : [items];
            const res = await this.api.post('/lancamentoAutomaticoConfig', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirLancamentoAutomaticoConfig(id) {
        try {
            const res = await this.api.delete('/lancamentoAutomaticoConfig', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirEmpresaModulo(id) {
        try {
            const res = await this.api.delete('/empresaModulo', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarEmpresaModulos(data) {
        try {
            console.log('[salvarEmpresaModulos] data:', JSON.stringify(data));
            const existing = await this.listarEmpresaModulos({ empresa_id: data.empresa_id });
            console.log('[salvarEmpresaModulos] existing:', JSON.stringify(existing));
            const existingMap = new Map();
            if (Array.isArray(existing)) {
                for (const r of existing) {
                    if (r.modulo_id != null)
                        existingMap.set(r.modulo_id, r);
                }
            }
            else {
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
        }
        catch (error) {
            console.error('[salvarEmpresaModulos] catch error:', error);
            if (error instanceof Error)
                console.error('[salvarEmpresaModulos] stack:', error.stack);
            return this.handleError(error);
        }
    }
    async testEmpresaModulo(empresa_id, modulo_id) {
        const body = [{ id: 0, empresa_id, modulo_id }];
        const res = await this.api.post('/empresaModulo', body, { headers: this.getAuthHeaders() });
        return { status: res.status, data: res.data };
    }
    async excluirEmpresa(id) {
        try {
            const res = await this.api.delete('/empresa', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async limparDadosEmpresa(empresaId) {
        try {
            const res = await this.api.post('/empresa/limpar-dados', { empresa_id: empresaId }, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarPerdasInsumo(params) {
        try {
            const res = await this.api.get('/perdaInsumo', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarPerdasInsumo(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/perdaInsumo', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirPerdaInsumo(id) {
        try {
            const res = await this.api.delete('/perdaInsumo', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarPerdasProdutoFabricado(params) {
        try {
            const res = await this.api.get('/perdaProdutoFabricado', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarPerdasProdutoFabricado(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/perdaProdutoFabricado', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirPerdaProdutoFabricado(id) {
        try {
            const res = await this.api.delete('/perdaProdutoFabricado', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async listarUsoConsumo(params) {
        try {
            const res = await this.api.get('/usoConsumo', { params, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async salvarUsoConsumo(items) {
        try {
            const payload = items.length === 1 ? items[0] : items;
            const res = await this.api.post('/usoConsumo', payload, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async excluirUsoConsumo(id) {
        try {
            const res = await this.api.delete('/usoConsumo', { params: { id }, headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async atualizarSequencias() {
        try {
            const res = await this.api.post('/empresa/atualizar-sequencias', {}, { headers: this.getAuthHeaders() });
            return res.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
}
exports.horseApi = new HorseApiService();
//# sourceMappingURL=horseApi.js.map