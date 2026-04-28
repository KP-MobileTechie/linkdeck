const MAX_URL_LENGTH = 2048;

export type UrlValidation = { ok: true; url: string } | { ok: false; reason: string };

export function validateTargetUrl(raw: string): UrlValidation {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'Enter a URL.' };
  if (trimmed.length > MAX_URL_LENGTH) return { ok: false, reason: 'URL is too long.' };
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'That doesn’t look like a valid URL.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'Only http(s) URLs are allowed.' };
  }
  if (!url.hostname) return { ok: false, reason: 'URL needs a host.' };
  return { ok: true, url: url.toString() };
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

/** [base, prefixLength] CIDR blocks that are NOT public. */
const PRIVATE_V4: [string, number][] = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16],
];

function inCidr(ipInt: number, base: string, prefix: number): boolean {
  const baseInt = ipv4ToInt(base)!;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

/** True only for globally routable addresses — the SSRF guard for title fetching. */
export function ipIsPublic(ip: string): boolean {
  const lower = ip.toLowerCase();

  // IPv4-mapped IPv6 → recurse on the v4 part.
  if (lower.startsWith('::ffff:')) return ipIsPublic(lower.slice(7));

  const v4 = ipv4ToInt(lower);
  if (v4 !== null) {
    return !PRIVATE_V4.some(([base, prefix]) => inCidr(v4, base, prefix));
  }

  // IPv6: reject loopback, unspecified, ULA fc00::/7, link-local fe80::/10.
  if (lower === '::1' || lower === '::') return false;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return false;
  if (/^fe[89ab]/.test(lower)) return false;
  return true;
}
