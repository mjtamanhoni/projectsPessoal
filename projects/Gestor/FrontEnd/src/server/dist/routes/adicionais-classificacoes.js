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
        const result = (await horseApi_1.horseApi.listarAdicionaisClassificacoes(req.query));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.adicionalClassificacaoBodySchema), async (req, res) => {
    try {
        const result = await horseApi_1.horseApi.salvarAdicionaisClassificacoes(req.body);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.delete('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { adicional_id, produto_classificacao_id } = req.query;
        if (!adicional_id || !produto_classificacao_id) {
            res.status(400).json({ error: 'adicional_id e produto_classificacao_id sao obrigatorios' });
            return;
        }
        const result = await horseApi_1.horseApi.excluirAdicionalClassificacao(Number(adicional_id), Number(produto_classificacao_id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=adicionais-classificacoes.js.map