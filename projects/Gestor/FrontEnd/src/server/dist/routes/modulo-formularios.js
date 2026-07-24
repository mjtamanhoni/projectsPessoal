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
        const result = await horseApi_1.horseApi.listarModuloFormularios(req.query);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.moduloFormularioBodySchema), async (req, res) => {
    try {
        const result = await horseApi_1.horseApi.salvarModuloFormularios(req.body);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        const message = error instanceof Error ? error.message : 'Erro interno';
        console.error('[modulo-formularios] Erro ao salvar:', { status, message, body: req.body });
        if (error instanceof Error && 'status' in error) {
            const appErr = error;
            if (appErr.details)
                console.error('[modulo-formularios] detalhes:', appErr.details);
        }
        res.status(status).json({ error: message });
    }
});
router.delete('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            res.status(400).json({ error: 'ID e obrigatorio' });
            return;
        }
        const result = await horseApi_1.horseApi.excluirModuloFormulario(Number(id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=modulo-formularios.js.map