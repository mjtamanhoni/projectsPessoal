"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const horseApi_1 = require("../services/horseApi");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../schemas");
const router = (0, express_1.Router)();
router.get('/empresas', async (_req, res) => {
    try {
        const result = await horseApi_1.horseApi.listarEmpresasPublic();
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/login', rateLimit_1.authLimiter, (0, validate_1.validate)(schemas_1.loginBodySchema), async (req, res) => {
    try {
        const { login, senha, pin, empresa } = req.body;
        const empresaId = empresa || 1;
        if (pin) {
            const result = await horseApi_1.horseApi.login({ pin, empresa: empresaId });
            res.json({ ...result, empresaId });
            return;
        }
        const result = await horseApi_1.horseApi.login({ login, senha, empresa: empresaId });
        res.json({ ...result, empresaId });
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        const message = error instanceof Error ? error.message : 'Erro interno do servidor';
        res.status(status).json({ error: message });
    }
});
router.get('/permissoes', auth_1.authMiddleware, async (req, res) => {
    try {
        const data = await horseApi_1.horseApi.listarPermissoesUsuario(req.usuarioId);
        if (!data || !Array.isArray(data) || data.length === 0) {
            res.json({ irrestrito: true, formularios: [] });
            return;
        }
        res.json({ irrestrito: false, formularios: data });
    }
    catch (error) {
        console.error('[permissoes] Erro ao buscar permissoes:', error);
        res.json({ irrestrito: true, formularios: [] });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map