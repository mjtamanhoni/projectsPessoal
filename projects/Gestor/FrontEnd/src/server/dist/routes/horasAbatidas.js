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
        console.log('[HorasAbatidas] GET recebido, query:', JSON.stringify(req.query));
        const result = await horseApi_1.horseApi.listarHorasAbatidas(req.query);
        console.log('[HorasAbatidas] Resultado:', result.length, 'registros');
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.horaAbatidaBodySchema), async (req, res) => {
    try {
        console.log('[HorasAbatidas] POST recebido, body:', JSON.stringify(req.body));
        const body = req.body;
        const horas = Array.isArray(body) ? body : [body];
        console.log('[HorasAbatidas] Enviando para Horse:', JSON.stringify(horas[0]));
        const result = await horseApi_1.horseApi.salvarHorasAbatidas(horas);
        console.log('[HorasAbatidas] Resultado do Horse:', result);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        console.error('[HorasAbatidas] Erro:', error instanceof Error ? error.message : error);
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
        const result = await horseApi_1.horseApi.excluirHoraAbatida(Number(id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=horasAbatidas.js.map