"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const crypto_1 = require("crypto");
const crypto_2 = require("../utils/crypto");
(0, vitest_1.describe)('crypto', () => {
    (0, vitest_1.describe)('criptografar', () => {
        (0, vitest_1.it)('should generate a hash with salt:hash format', () => {
            const senha = 'minhaSenha123';
            const hash = (0, crypto_2.criptografar)(senha);
            (0, vitest_1.expect)(hash).toContain(':');
            const [saltBase64, hashHex] = hash.split(':');
            (0, vitest_1.expect)(saltBase64).toBeTruthy();
            (0, vitest_1.expect)(hashHex).toHaveLength(64); // SHA256 hex = 64 chars
        });
        (0, vitest_1.it)('should generate different hashes for same password (different salt)', () => {
            const senha = 'minhaSenha123';
            const hash1 = (0, crypto_2.criptografar)(senha);
            const hash2 = (0, crypto_2.criptografar)(senha);
            (0, vitest_1.expect)(hash1).not.toBe(hash2);
        });
    });
    (0, vitest_1.describe)('validar', () => {
        (0, vitest_1.it)('should return true for correct password', () => {
            const senha = 'minhaSenha123';
            const hash = (0, crypto_2.criptografar)(senha);
            const result = (0, crypto_2.validar)(senha, hash);
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('should return false for incorrect password', () => {
            const senha = 'minhaSenha123';
            const senhaErrada = 'senhaErrada';
            const hash = (0, crypto_2.criptografar)(senha);
            const result = (0, crypto_2.validar)(senhaErrada, hash);
            (0, vitest_1.expect)(result).toBe(false);
        });
        (0, vitest_1.it)('should return false for invalid hash format', () => {
            const result = (0, crypto_2.validar)('senha', 'hashinvalido');
            (0, vitest_1.expect)(result).toBe(false);
        });
        (0, vitest_1.it)('should return false for hash with wrong number of parts', () => {
            const result = (0, crypto_2.validar)('senha', 'parte1:parte2:parte3');
            (0, vitest_1.expect)(result).toBe(false);
        });
        (0, vitest_1.it)('should return false for invalid base64 salt', () => {
            const result = (0, crypto_2.validar)('senha', '!!!invalido:::hashvalido');
            (0, vitest_1.expect)(result).toBe(false);
        });
        (0, vitest_1.it)('should work with Delphi-compatible hash format', () => {
            const senha = 'teste123';
            const salt = Buffer.from('abcdefghijklmnop', 'utf8'); // 16 bytes
            const combinado = Buffer.concat([salt, Buffer.from(senha, 'utf8')]);
            const hash = (0, crypto_1.createHash)('sha256').update(combinado).digest('hex');
            const hashDelphi = `${salt.toString('base64')}:${hash}`;
            const result = (0, crypto_2.validar)(senha, hashDelphi);
            (0, vitest_1.expect)(result).toBe(true);
        });
    });
});
//# sourceMappingURL=crypto.test.js.map