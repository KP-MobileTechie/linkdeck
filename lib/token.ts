import { createHash, randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/** 24 chars from a 64-symbol alphabet ≈ 144 bits — unguessable management secret. */
export function generateToken(length = 24): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] & 63];
  return out;
}

/** Only this hash is ever stored; possession of the raw token is ownership. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
