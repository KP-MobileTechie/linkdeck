'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { DayCount } from '@/lib/stats';

const PIE_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#f43f5e'];

interface Props {
  days7: DayCount[];
  days30: DayCount[];
  devices: { name: string; count: number }[];
}

export function StatsCharts({ days7, days30, devices }: Props) {
  const [range, setRange] = useState<7 | 30>(7);
  const series = range === 7 ? days7 : days30;

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Clicks</h3>
          <div className="flex gap-1 text-xs" role="group" aria-label="Range">
            {([7, 30] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-lg px-2.5 py-1 ${range === r ? 'bg-accent text-white' : 'text-fg-dim hover:text-fg'}`}
                aria-pressed={range === r}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f133" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">Devices</h3>
        {devices.length === 0 ? (
          <p className="text-sm text-fg-dim">No clicks yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={devices} dataKey="count" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>
                {devices.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
