import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getDb } from '@/lib/db/client';
import {
  getLinkByTokenHash, clicksByDay, topReferrers, deviceSplit, countrySplit,
} from '@/lib/db/queries';
import { hashToken } from '@/lib/token';
import { linkStatus } from '@/lib/guards';
import { fillDays } from '@/lib/stats';
import { StatsCharts } from '@/components/StatsCharts';
import { LinkActions } from '@/components/LinkActions';
import { CopyButton } from '@/components/CopyButton';
import { QrCode } from '@/components/QrCode';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  active: 'text-ok', expired: 'text-danger', exhausted: 'text-danger', disabled: 'text-fg-dim',
};

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const link = await getLinkByTokenHash(db, hashToken(token));
  if (!link) notFound();

  const [byDay30, referrers, devices, countries] = await Promise.all([
    clicksByDay(db, link.id, 30),
    topReferrers(db, link.id, 8),
    deviceSplit(db, link.id),
    countrySplit(db, link.id),
  ]);
  const now = new Date();
  const days30 = fillDays(byDay30, 30, now);
  const days7 = days30.slice(-7);

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const shortUrl = `${proto}://${host}/${link.slug}`;
  const status = linkStatus(link, now);

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-4 p-4 py-8">
      <header className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{link.title ?? link.targetUrl}</h1>
          <div className="mt-1 flex items-center gap-2">
            <a href={shortUrl} className="font-mono text-sm text-accent underline-offset-2 hover:underline">{shortUrl}</a>
            <CopyButton value={shortUrl} />
          </div>
          <p className="mt-1 text-xs text-fg-dim">
            <span className={STATUS_BADGE[status]}>● {status}</span>
            {' · '}{link.clickCount} total clicks
            {link.maxClicks !== null && ` (limit ${link.maxClicks})`}
            {link.expiresAt && ` · expires ${link.expiresAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`}
          </p>
        </div>
        <QrCode value={shortUrl} />
      </header>

      <StatsCharts days7={days7} days30={days30} devices={devices} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold">Top referrers</h3>
          {referrers.length === 0 ? <p className="text-sm text-fg-dim">No clicks yet — share your link.</p> : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {referrers.map((r) => (
                <li key={r.name} className="flex justify-between"><span className="truncate">{r.name}</span><span className="text-fg-dim">{r.count}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold">Countries</h3>
          {countries.length === 0 ? <p className="text-sm text-fg-dim">No clicks yet.</p> : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {countries.map((c) => (
                <li key={c.name} className="flex justify-between"><span>{c.name === '??' ? 'Unknown' : c.name}</span><span className="text-fg-dim">{c.count}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <LinkActions token={token} targetUrl={link.targetUrl} disabled={link.disabled} />
    </main>
  );
}
