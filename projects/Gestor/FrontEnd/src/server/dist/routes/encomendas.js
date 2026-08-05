"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const horseApi_1 = require("../services/horseApi");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../schemas");
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const result = await horseApi_1.horseApi.listarEncomendas(req.query);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.encomendaBodySchema), async (req, res) => {
    try {
        const body = req.body;
        const items = Array.isArray(body) ? body : [body];
        const result = await horseApi_1.horseApi.salvarEncomendas(items, req.empresaId);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/gerar-venda', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.encomendaBaixaSchema), async (req, res) => {
    try {
        const { id, id_encomenda, data_venda, recebido, categoria_receber_id } = req.body;
        const result = await horseApi_1.horseApi.gerarVendaDeEncomenda({
            id: id ?? id_encomenda ?? 0,
            data_venda,
            recebido,
            categoria_receber_id,
        });
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
            res.status(400).json({ error: 'ID e obrigatorio' });
            return;
        }
        const result = await horseApi_1.horseApi.excluirEncomenda(Number(id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=encomendas.js.map