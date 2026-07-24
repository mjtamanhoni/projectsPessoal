"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const horseApi_1 = require("../services/horseApi");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token de autenticação não fornecido' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.horseApi.jwtSecret);
        req.usuarioId = decoded.id;
        req.empresaId = decoded.empresa || 1;
        horseApi_1.horseApi.setToken(token);
        next();
    }
    catch {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}
//# sourceMappingURL=auth.js.map