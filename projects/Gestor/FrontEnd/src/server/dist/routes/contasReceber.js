"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const horseApi_1 = require("../services/horseApi");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { dataInicio, dataFim, status, clienteId, categoriaId, id: queryId } = req.query;
        const horseParams = {};
        if (queryId)
            horseParams.id = queryId;
        if (req.empresaId)
            horseParams.empresa_id = req.empresaId;
        const result = await horseApi_1.horseApi.listarContasReceber(horseParams);
        let contas = result;
        const inicio = dataInicio ? new Date(dataInicio) : null;
        const fim = dataFim ? new Date(dataFim) : null;
        contas = contas.filter((c) => {
            const v = new Date(c.dataVencimento);
            if (inicio && v < inicio)
                return false;
            if (fim && v > fim)
                return false;
            if (status === 'recebido')
                return c.recebido;
            if (status === 'aberto')
                return !c.recebido;
            if (clienteId && c.clienteId != null && Number(c.clienteId) !== Number(clienteId))
                return false;
            if (categoriaId && c.idCategoria != null && Number(c.idCategoria) !== Number(categoriaId))
                return false;
            return true;
        });
        res.json(contas);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const body = req.body;
        const contas = Array.isArray(body) ? body : [body];
        if (!contas.length || !contas[0].descricao) {
            res.status(400).json({ error: 'Descrição da conta é obrigatória' });
            return;
        }
        const result = await horseApi_1.horseApi.salvarContasReceber(contas);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.delete('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            res.status(400).json({ error: 'ID é obrigatório' });
            return;
        }
        const result = await horseApi_1.horseApi.excluirContaReceber(Number(id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.put('/receber', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id, dataRecebimento, valor, desconto, acrescimo } = req.body;
        if (!id) {
            res.status(400).json({ error: 'ID é obrigatório' });
            return;
        }
        const result = await horseApi_1.horseApi.receberConta({
            id,
            data_recebimento: dataRecebimento,
            valorBaixa: valor ? Number(valor) : undefined,
            desconto: desconto ? Number(desconto) : undefined,
            acrescimo: acrescimo ? Number(acrescimo) : undefined,
        });
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.put('/estornar', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            res.status(400).json({ error: 'ID é obrigatório' });
            return;
        }
        const contaId = Number(id);
        const allContas = await horseApi_1.horseApi.listarContasReceber();
        const related = allContas.filter(c => c.lancamentoOrigemId === contaId);
        for (const conta of related) {
            await horseApi_1.horseApi.excluirContaReceber(conta.id || conta.codigo);
        }
        const result = await horseApi_1.horseApi.estornarContaReceber(contaId);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=contasReceber.js.map