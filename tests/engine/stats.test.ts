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
