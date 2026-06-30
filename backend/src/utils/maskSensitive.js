/**
 * Mask sensitive fields before logging.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'hash',
  'key',
  'salt',
  'merchantSalt',
  'merchantKey',
  'secret',
  'client_secret',
  'x-client-secret',
  'CASHFREE_SECRET_KEY',
  'PAYU_SALT',
  'PAYU_KEY',
  'otp',
  'pin',
  'cvv',
  'card_number',
  'cardNumber',
]);

const PARTIAL_MASK_KEYS = new Set([
  'email',
  'phone',
  'phoneNumber',
  'whatsapp_number',
  'customer_phone',
  'firstname',
  'firstName',
  'lastname',
  'lastName',
]);

function maskValue(key, value) {
  if (value === undefined || value === null) return value;
  const lowerKey = String(key).toLowerCase();

  if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(lowerKey)) {
    return '[REDACTED]';
  }

  const str = String(value);
  if (lowerKey.includes('hash') || lowerKey === 'key' || lowerKey.includes('secret') || lowerKey.includes('salt')) {
    if (str.length <= 8) return '[REDACTED]';
    return `${str.substring(0, 4)}…${str.substring(str.length - 4)}`;
  }

  if (PARTIAL_MASK_KEYS.has(key) || PARTIAL_MASK_KEYS.has(lowerKey)) {
    if (str.length <= 4) return '****';
    if (str.includes('@')) {
      const [local, domain] = str.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    }
    return `${str.substring(0, 2)}****${str.slice(-2)}`;
  }

  return value;
}

function maskSensitive(input, depth = 0) {
  if (input === null || input === undefined) return input;
  if (depth > 8) return '[MAX_DEPTH]';

  if (Array.isArray(input)) {
    return input.map((item) => maskSensitive(item, depth + 1));
  }

  if (Buffer.isBuffer(input)) {
    return '[BUFFER]';
  }

  if (typeof input !== 'object') {
    return input;
  }

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      out[key] = maskSensitive(value, depth + 1);
    } else if (Array.isArray(value)) {
      out[key] = maskSensitive(value, depth + 1);
    } else {
      out[key] = maskValue(key, value);
    }
  }
  return out;
}

function sanitizeHeaders(headers = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (lower === 'authorization' || lower.includes('token') || lower.includes('secret')) {
      safe[key] = '[REDACTED]';
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

module.exports = {
  maskSensitive,
  sanitizeHeaders,
  maskValue,
};
