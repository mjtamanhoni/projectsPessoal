"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const horseApi_1 = require("../services/horseApi");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { dataInicio, dataFim, status, fornecedorId, categoriaId, id: queryId } = req.query;
        const horseParams = {};
        if (queryId)
            horseParams.id = queryId;
        if (req.empresaId)
            horseParams.empresa_id = req.empresaId;
        const result = await horseApi_1.horseApi.listarContasPagar(horseParams);
        let contas = result;
        const inicio = dataInicio ? new Date(dataInicio) : null;
        const fim = dataFim ? new Date(dataFim) : null;
        contas = contas.filter((c) => {
            const v = new Date(c.dataVencimento);
            if (inicio && v < inicio)
                return false;
            if (fim && v > fim)
                return false;
            if (status === 'pago')
                return c.pago;
            if (status === 'aberto')
                return !c.pago;
            if (fornecedorId && c.fornecedorId != null && Number(c.fornecedorId) !== Number(fornecedorId))
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
        const result = await horseApi_1.horseApi.salvarContasPagar(contas);
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
        const result = await horseApi_1.horseApi.excluirContaPagar(Number(id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.put('/pagar', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id, dataPagamento, valor, desconto, acrescimo } = req.body;
        if (!id) {
            res.status(400).json({ error: 'ID é obrigatório' });
            return;
        }
        const result = await horseApi_1.horseApi.pagarConta({
            id,
            data_pagamento: dataPagamento,
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
        const allContas = await horseApi_1.horseApi.listarContasPagar();
        const related = allContas.filter(c => c.lancamentoOrigemId === contaId);
        for (const conta of related) {
            await horseApi_1.horseApi.excluirContaPagar(conta.id || conta.codigo);
        }
        const result = await horseApi_1.horseApi.estornarContaPagar(contaId);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=contasPagar.js.map