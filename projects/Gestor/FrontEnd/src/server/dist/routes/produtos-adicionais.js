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
        const result = (await horseApi_1.horseApi.listarProdutosAdicionais(req.query));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.produtoAdicionalBodySchema), async (req, res) => {
    try {
        const result = await horseApi_1.horseApi.salvarProdutosAdicionais(req.body);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.delete('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { produto_fabricado_id, adicional_id } = req.query;
        if (!produto_fabricado_id || !adicional_id) {
            res.status(400).json({ error: 'produto_fabricado_id e adicional_id sao obrigatorios' });
            return;
        }
        const result = await horseApi_1.horseApi.excluirProdutoAdicional(Number(produto_fabricado_id), Number(adicional_id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=produtos-adicionais.js.map