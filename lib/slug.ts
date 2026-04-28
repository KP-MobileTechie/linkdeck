const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

export const SLUG_RE = /^[A-Za-z0-9_-]{3,32}$/;

/** Path segments the app itself uses — can never be slugs. */
export const RESERVED = new Set([
  'm', 'api', 'gone', 'docs', 'favicon.ico', 'robots.txt', 'sitemap.xml',
  '_next', 'assets', 'icon.png', 'apple-icon.png', 'opengraph-image',
]);

function defaultRandom(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/** 64-char alphabet → each byte maps cleanly with & 63 (no modulo bias). */
export function generateSlug(length = 7, random: (n: number) => Uint8Array = defaultRandom): string {
  const bytes = random(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] & 63];
  return out;
}

export type SlugValidation = { ok: true } | { ok: false; reason: string };

export function validateCustomSlug(slug: string): SlugValidation {
  if (!SLUG_RE.test(slug)) {
    return { ok: false, reason: 'Use 3–32 letters, digits, "-" or "_".' };
  }
  if (RESERVED.has(slug.toLowerCase())) {
    return { ok: false, reason: 'That slug is reserved.' };
  }
  return { ok: true };
}
