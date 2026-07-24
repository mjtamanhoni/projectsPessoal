"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criptografar = criptografar;
exports.validar = validar;
const crypto_1 = require("crypto");
function criptografar(senha) {
    const salt = (0, crypto_1.randomBytes)(16);
    const senhaBytes = Buffer.from(senha, 'utf8');
    const combinado = Buffer.concat([salt, senhaBytes]);
    const hash = (0, crypto_1.createHash)('sha256').update(combinado).digest('hex');
    const saltBase64 = salt.toString('base64');
    return `${saltBase64}:${hash}`;
}
function validar(senha, hashArmazenado) {
    const partes = hashArmazenado.split(':');
    if (partes.length !== 2) {
        return false;
    }
    const saltBase64 = partes[0];
    const hashOriginal = partes[1];
    let salt;
    try {
        salt = Buffer.from(saltBase64, 'base64');
    }
    catch {
        return false;
    }
    const senhaBytes = Buffer.from(senha, 'utf8');
    const combinado = Buffer.concat([salt, senhaBytes]);
    const hashCalculado = (0, crypto_1.createHash)('sha256').update(combinado).digest('hex');
    if (hashCalculado.length !== hashOriginal.length) {
        return false;
    }
    return (0, crypto_1.timingSafeEqual)(Buffer.from(hashCalculado), Buffer.from(hashOriginal));
}
//# sourceMappingURL=crypto.js.map