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
        const result = await horseApi_1.horseApi.listarUsuarios(req.query);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.usuarioBodySchema), async (req, res) => {
    try {
        const body = req.body;
        const isNew = !body.codigo && !body.id;
        const usuarios = Array.isArray(body) ? body : [body];
        const result = await horseApi_1.horseApi.salvarUsuarios(usuarios);
        if (isNew && body.senha && body.pin) {
            const codigoResp = result?.codigo;
            const userId = Number(codigoResp ?? 0);
            if (userId > 0) {
                await Promise.all([
                    horseApi_1.horseApi.alterarSenhaUsuario(userId, body.senha),
                    horseApi_1.horseApi.alterarPinUsuario(userId, body.pin),
                ]);
            }
        }
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
        const result = await horseApi_1.horseApi.excluirUsuario(Number(id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.put('/senha', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.usuarioSenhaBodySchema), async (req, res) => {
    try {
        const { id, novaSenha } = req.body;
        const result = await horseApi_1.horseApi.alterarSenhaUsuario(id, novaSenha);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.put('/pin', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.usuarioPinBodySchema), async (req, res) => {
    try {
        const { id, novoPin } = req.body;
        const result = await horseApi_1.horseApi.alterarPinUsuario(id, novoPin);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=usuarios.js.map