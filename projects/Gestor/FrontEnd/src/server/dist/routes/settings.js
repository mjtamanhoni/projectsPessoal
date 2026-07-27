"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const settings_1 = require("../services/settings");
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, (req, res) => {
    const file = (0, settings_1.getSettings)();
    const authReq = req;
    const empresaId = authReq.empresaId;
    const empresaSettings = empresaId ? (0, settings_1.getEmpresaSettings)(empresaId) : settings_1.DEFAULT_EMPRESA;
    res.json({ horseApi: file.horseApi, rateLimit: file.rateLimit, ...empresaSettings });
});
router.put('/', auth_1.authMiddleware, (req, res) => {
    const authReq = req;
    const empresaId = authReq.empresaId;
    const body = req.body;
    if (body.horseApi) {
        (0, settings_1.saveSettings)(body);
    }
    if (empresaId) {
        const { horseApi: _, ...empresaData } = body;
        (0, settings_1.saveEmpresaSettings)(empresaId, empresaData);
    }
    const file = (0, settings_1.getSettings)();
    const empresaSettings = empresaId ? (0, settings_1.getEmpresaSettings)(empresaId) : settings_1.DEFAULT_EMPRESA;
    res.json({ horseApi: file.horseApi, ...empresaSettings });
});
exports.default = router;
//# sourceMappingURL=settings.js.map