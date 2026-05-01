import { describe, it, expect } from 'vitest';
import { fillDays } from '@/lib/stats';

describe('fillDays', () => {
  it('fills missing days with zero over the window, ending today (UTC)', () => {
    const today = new Date('2026-05-05T09:30:00Z');
    const rows = [
      { day: '2026-05-03', count: 4 },
      { day: '2026-05-05', count: 1 },
    ];
    expect(fillDays(rows, 5, today)).toEqual([
      { day: '2026-05-01', count: 0 },
      { day: '2026-05-02', count: 0 },
      { day: '2026-05-03', count: 4 },
      { day: '2026-05-04', count: 0 },
      { day: '2026-05-05', count: 1 },
    ]);
  });

  it('handles empty input', () => {
    const today = new Date('2026-05-05T00:00:00Z');
    const out = fillDays([], 3, today);
    expect(out).toEqual([
      { day: '2026-05-03', count: 0 },
      { day: '2026-05-04', count: 0 },
      { day: '2026-05-05', count: 0 },
    ]);
  });
});

describe('fillDays — DST immunity', () => {
  it('steps whole UTC days across a DST transition (UTC has no DST)', () => {
    // Window spanning the EU spring-forward (Mar 29 2026): fixed 24h UTC steps
    // must still land on consecutive calendar days.
    const today = new Date('2026-03-31T12:00:00Z');
    const out = fillDays([], 5, today);
    expect(out.map((r) => r.day)).toEqual([
      '2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31',
    ]);
  });
});
