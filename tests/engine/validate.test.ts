import { describe, it, expect } from 'vitest';
import { validateTargetUrl, ipIsPublic } from '@/lib/validate';

describe('validateTargetUrl', () => {
  it('accepts http/https and normalizes', () => {
    const r = validateTargetUrl('https://example.com/page?q=1');
    expect(r).toEqual({ ok: true, url: 'https://example.com/page?q=1' });
    expect(validateTargetUrl('http://example.com').ok).toBe(true);
  });

  it('rejects other protocols, junk, and oversized URLs', () => {
    expect(validateTargetUrl('javascript:alert(1)').ok).toBe(false);
    expect(validateTargetUrl('ftp://example.com').ok).toBe(false);
    expect(validateTargetUrl('not a url').ok).toBe(false);
    expect(validateTargetUrl('').ok).toBe(false);
    expect(validateTargetUrl('https://example.com/' + 'a'.repeat(2050)).ok).toBe(false);
  });
});

describe('ipIsPublic', () => {
  it('rejects loopback, private, link-local, CGNAT ranges', () => {
    for (const ip of [
      '127.0.0.1', '10.1.2.3', '192.168.1.1', '172.16.0.1', '172.31.255.255',
      '169.254.10.10', '0.0.0.0', '100.64.0.1', '::1', 'fc00::1', 'fe80::1',
      '::ffff:127.0.0.1', '::ffff:10.0.0.5',
    ]) {
      expect(ipIsPublic(ip), ip).toBe(false);
    }
  });

  it('accepts public addresses', () => {
    for (const ip of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:2800:220:1::1']) {
      expect(ipIsPublic(ip), ip).toBe(true);
    }
  });
});
