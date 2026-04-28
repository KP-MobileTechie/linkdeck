import { describe, it, expect } from 'vitest';
import { generateSlug, validateCustomSlug, RESERVED, SLUG_RE } from '@/lib/slug';

describe('generateSlug', () => {
  it('produces 7-char slugs matching the slug charset', () => {
    for (let i = 0; i < 50; i++) {
      const s = generateSlug();
      expect(s).toHaveLength(7);
      expect(s).toMatch(SLUG_RE);
    }
  });

  it('is injectable for determinism', () => {
    const fixed = (n: number) => new Uint8Array(n); // all zeros → first alphabet char
    expect(generateSlug(7, fixed)).toBe('AAAAAAA');
  });
});

describe('validateCustomSlug', () => {
  it('accepts simple slugs', () => {
    expect(validateCustomSlug('my-resume')).toEqual({ ok: true });
    expect(validateCustomSlug('abc')).toEqual({ ok: true });
  });

  it('rejects bad charset, length, and reserved words', () => {
    expect(validateCustomSlug('has space').ok).toBe(false);
    expect(validateCustomSlug('ab').ok).toBe(false);               // too short
    expect(validateCustomSlug('x'.repeat(33)).ok).toBe(false);     // too long
    expect(validateCustomSlug('héllo').ok).toBe(false);
    for (const r of ['m', 'api', 'gone']) {
      expect(validateCustomSlug(r).ok).toBe(false);
    }
    expect(RESERVED.has('m')).toBe(true);
  });
});
