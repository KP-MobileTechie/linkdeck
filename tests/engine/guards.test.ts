import { describe, it, expect } from 'vitest';
import { linkStatus } from '@/lib/guards';

const NOW = new Date('2026-05-01T12:00:00Z');
const base = { disabled: false, expiresAt: null as Date | null, maxClicks: null as number | null, clickCount: 0 };

describe('linkStatus', () => {
  it('active by default', () => {
    expect(linkStatus(base, NOW)).toBe('active');
  });

  it('disabled wins over everything', () => {
    expect(linkStatus({ ...base, disabled: true, expiresAt: new Date('2020-01-01') }, NOW)).toBe('disabled');
  });

  it('expired when past expiresAt (boundary: exact moment is expired)', () => {
    expect(linkStatus({ ...base, expiresAt: new Date('2026-04-30T12:00:00Z') }, NOW)).toBe('expired');
    expect(linkStatus({ ...base, expiresAt: NOW }, NOW)).toBe('expired');
    expect(linkStatus({ ...base, expiresAt: new Date('2026-05-02T12:00:00Z') }, NOW)).toBe('active');
  });

  it('exhausted when clickCount reaches maxClicks', () => {
    expect(linkStatus({ ...base, maxClicks: 10, clickCount: 10 }, NOW)).toBe('exhausted');
    expect(linkStatus({ ...base, maxClicks: 10, clickCount: 9 }, NOW)).toBe('active');
  });
});
