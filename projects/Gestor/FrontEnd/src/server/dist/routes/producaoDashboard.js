"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const horseApi_1 = require("../services/horseApi");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { ano, mes } = req.query;
        const params = {};
        if (ano)
            params.ano = ano;
        if (mes)
            params.mes = mes;
        const result = await horseApi_1.horseApi.obterProducaoDashboard(Object.keys(params).length > 0 ? params : undefined);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=producaoDashboard.js.map