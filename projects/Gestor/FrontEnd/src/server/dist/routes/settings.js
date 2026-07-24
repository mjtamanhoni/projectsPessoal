"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const settings_1 = require("../services/settings");
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, (_req, res) => {
    res.json((0, settings_1.getSettings)());
});
router.put('/', auth_1.authMiddleware, (req, res) => {
    const updated = (0, settings_1.saveSettings)(req.body);
    res.json(updated);
});
exports.default = router;
//# sourceMappingURL=settings.js.map