import { describe, it, expect } from 'vitest';
import { generateToken, hashToken } from '@/lib/token';

describe('token', () => {
  it('generates 24-char url-safe tokens, unique across calls', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toHaveLength(24);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
  });

  it('hashes deterministically to 64 hex chars', () => {
    const h = hashToken('secret123');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('secret123')).toBe(h);
    expect(hashToken('secret124')).not.toBe(h);
  });
});
