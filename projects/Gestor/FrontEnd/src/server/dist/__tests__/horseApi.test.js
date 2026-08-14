"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)('Auth Middleware', () => {
    (0, vitest_1.it)('deve rejeitar requisição sem token', async () => {
        const { authMiddleware } = await Promise.resolve().then(() => __importStar(require('../middleware/auth')));
        const req = { headers: {} };
        const res = {
            status: vitest_1.vi.fn().mockReturnThis(),
            json: vitest_1.vi.fn(),
        };
        const next = vitest_1.vi.fn();
        authMiddleware(req, res, next);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Token de autenticação não fornecido' });
        (0, vitest_1.expect)(next).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('deve chamar next() com token válido', async () => {
        const jwt = await Promise.resolve().then(() => __importStar(require('jsonwebtoken')));
        const token = jwt.sign({ id: 1, empresa: 1 }, 'c7f9a1b2-48d3-4e6a-9d8a-2f1e6c4a9b7d', { expiresIn: '1h' });
        const { authMiddleware } = await Promise.resolve().then(() => __importStar(require('../middleware/auth')));
        const req = { headers: { authorization: `Bearer ${token}` }, query: {} };
        const res = {
            status: vitest_1.vi.fn().mockReturnThis(),
            json: vitest_1.vi.fn(),
        };
        const next = vitest_1.vi.fn();
        authMiddleware(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalled();
        (0, vitest_1.expect)(req.usuarioId).toBe(1);
        (0, vitest_1.expect)(req.empresaId).toBe(1);
    });
});
//# sourceMappingURL=horseApi.test.js.map