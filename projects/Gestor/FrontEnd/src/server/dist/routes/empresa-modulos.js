"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const horseApi_1 = require("../services/horseApi");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../schemas");
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const result = await horseApi_1.horseApi.listarEmpresaModulos(req.query);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.get('/test', auth_1.authMiddleware, async (req, res) => {
    const { empresa_id, modulo_id } = req.query;
    if (!empresa_id || !modulo_id) {
        res.status(400).json({ error: 'Informe empresa_id e modulo_id como query params' });
        return;
    }
    try {
        const result = await horseApi_1.horseApi.testEmpresaModulo(Number(empresa_id), Number(modulo_id));
        res.json(result);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            res.status(500).json({
                erro_go: error.response?.data,
                status_go: error.response?.status,
                mensagem: error.message,
            });
        }
        else {
            const err = error instanceof Error ? error : new Error('Erro desconhecido');
            res.status(500).json({ error: err.message });
        }
    }
});
router.post('/', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.empresaModuloBodySchema), async (req, res) => {
    try {
        const result = await horseApi_1.horseApi.salvarEmpresaModulos(req.body);
        res.json(result);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error('[empresa-modulos POST] AxiosError:', error.config?.url, error.response?.status, error.response?.data);
            const data = error.response?.data;
            const msg = data && typeof data === 'object' ? (data.erro || data.mensagem || 'Erro interno') : 'Erro interno';
            res.status(error.response?.status || 500).json({ error: msg, detalhe: data });
        }
        else {
            const err = error instanceof Error ? error : new Error('Erro desconhecido');
            console.error('[empresa-modulos POST] Erro:', err.message);
            res.status(500).json({ error: err.message });
        }
    }
});
router.delete('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            res.status(400).json({ error: 'ID e obrigatorio' });
            return;
        }
        const result = await horseApi_1.horseApi.excluirEmpresaModulo(Number(id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=empresa-modulos.js.map