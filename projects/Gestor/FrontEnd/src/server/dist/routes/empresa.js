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
        const result = await horseApi_1.horseApi.listarEmpresas(req.query);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.empresaBodySchema), async (req, res) => {
    try {
        const body = req.body;
        const empresas = Array.isArray(body) ? body : [body];
        const result = await horseApi_1.horseApi.salvarEmpresas(empresas);
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
        const result = await horseApi_1.horseApi.excluirEmpresa(Number(id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/limpar-dados', auth_1.authMiddleware, async (req, res) => {
    try {
        const { empresa_id } = req.body;
        if (!empresa_id) {
            res.status(400).json({ error: 'empresa_id é obrigatório' });
            return;
        }
        const result = await horseApi_1.horseApi.limparDadosEmpresa(Number(empresa_id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/logomarca', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.logomarcaBodySchema), async (req, res) => {
    try {
        const { id, logomarca } = req.body;
        const result = await horseApi_1.horseApi.salvarEmpresaLogomarca(Number(id), String(logomarca ?? ''));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/atualizar-sequencias', auth_1.authMiddleware, async (_req, res) => {
    try {
        const result = await horseApi_1.horseApi.atualizarSequencias();
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=empresa.js.map