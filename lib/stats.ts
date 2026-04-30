export interface DayCount {
  day: string; // 'YYYY-MM-DD' (UTC)
  count: number;
}

function toDayString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** SQL GROUP BY skips empty days; charts need a continuous series. */
export function fillDays(rows: DayCount[], days: number, today: Date): DayCount[] {
  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  const out: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const day = toDayString(d);
    out.push({ day, count: byDay.get(day) ?? 0 });
  }
  return out;
}
