import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { criptografar, validar } from '../utils/crypto';

describe('crypto', () => {
  describe('criptografar', () => {
    it('should generate a hash with salt:hash format', () => {
      const senha = 'minhaSenha123';
      const hash = criptografar(senha);
      
      expect(hash).toContain(':');
      const [saltBase64, hashHex] = hash.split(':');
      expect(saltBase64).toBeTruthy();
      expect(hashHex).toHaveLength(64); // SHA256 hex = 64 chars
    });

    it('should generate different hashes for same password (different salt)', () => {
      const senha = 'minhaSenha123';
      const hash1 = criptografar(senha);
      const hash2 = criptografar(senha);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validar', () => {
    it('should return true for correct password', () => {
      const senha = 'minhaSenha123';
      const hash = criptografar(senha);
      
      const result = validar(senha, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', () => {
      const senha = 'minhaSenha123';
      const senhaErrada = 'senhaErrada';
      const hash = criptografar(senha);
      
      const result = validar(senhaErrada, hash);
      expect(result).toBe(false);
    });

    it('should return false for invalid hash format', () => {
      const result = validar('senha', 'hashinvalido');
      expect(result).toBe(false);
    });

    it('should return false for hash with wrong number of parts', () => {
      const result = validar('senha', 'parte1:parte2:parte3');
      expect(result).toBe(false);
    });

    it('should return false for invalid base64 salt', () => {
      const result = validar('senha', '!!!invalido:::hashvalido');
      expect(result).toBe(false);
    });

    it('should work with Delphi-compatible hash format', () => {
      const senha = 'teste123';
      const salt = Buffer.from('abcdefghijklmnop', 'utf8'); // 16 bytes
      const combinado = Buffer.concat([salt, Buffer.from(senha, 'utf8')]);
      const hash = createHash('sha256').update(combinado).digest('hex');
      const hashDelphi = `${salt.toString('base64')}:${hash}`;
      
      const result = validar(senha, hashDelphi);
      expect(result).toBe(true);
    });
  });
});