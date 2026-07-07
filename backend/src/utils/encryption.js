const crypto = require('crypto');
const env = require('../config/env');

const ALGO = 'aes-256-gcm';
const KEY = crypto
  .createHash('sha256')
  .update(process.env.ENCRYPTION_KEY || env.jwt.accessSecret)
  .digest();

function encrypt(plainText) {
  if (!plainText) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encryptedData: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

function decrypt(payload) {
  if (!payload?.encryptedData || !payload?.iv) return null;
  const decipher = crypto.createDecipheriv(
    ALGO,
    KEY,
    Buffer.from(payload.iv, 'base64')
  );
  if (payload.tag) decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encryptedData, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function maskAccountNumber(value) {
  if (!value) return '';
  const s = String(value);
  if (s.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

function maskIfsc(value) {
  if (!value) return '';
  const s = String(value);
  if (s.length <= 4) return '****';
  return `${s.slice(0, 2)}****${s.slice(-2)}`;
}

module.exports = { encrypt, decrypt, maskAccountNumber, maskIfsc };
