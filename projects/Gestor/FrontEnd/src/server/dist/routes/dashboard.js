"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const horseApi_1 = require("../services/horseApi");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { dataInicio, dataFim, status } = req.query;
        const filtros = {
            ...(dataInicio && { dataInicio }),
            ...(dataFim && { dataFim }),
            ...(status && { status: status }),
        };
        const result = await horseApi_1.horseApi.obterDashboard(Object.keys(filtros).length > 0 ? filtros : undefined);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map