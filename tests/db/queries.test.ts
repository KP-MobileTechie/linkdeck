import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/lib/db/schema';
import type { DB } from '@/lib/db/client';
import {
  createLink, getLinkBySlug, getLinkByTokenHash, recordClick,
  countRecentByCreator, updateTitle, updateDestination, setDisabled, deleteLink,
  clicksByDay, topReferrers, deviceSplit, countrySplit,
} from '@/lib/db/queries';
import { fillDays } from '@/lib/stats';

let db: DB;

beforeAll(async () => {
  const client = new PGlite();
  const pgliteDb = drizzle(client, { schema });
  db = pgliteDb as unknown as DB;
  await migrate(pgliteDb as PgliteDatabase<typeof schema>, { migrationsFolder: './drizzle' });
});

beforeEach(async () => {
  await db.delete(schema.clicks);
  await db.delete(schema.links);
});

const BASE = { targetUrl: 'https://example.com', mgmtTokenHash: 'a'.repeat(64), creatorIpHash: 'b'.repeat(64) };

describe('createLink', () => {
  it('creates with a generated slug', async () => {
    const link = await createLink(db, BASE);
    expect(link).not.toBeNull();
    expect(link!.slug).toMatch(/^[A-Za-z0-9_-]{7}$/);
  });

  it('creates with a custom slug; returns null when taken', async () => {
    const a = await createLink(db, { ...BASE, slug: 'my-link' });
    expect(a!.slug).toBe('my-link');
    const dup = await createLink(db, { ...BASE, slug: 'my-link' });
    expect(dup).toBeNull();
  });

  it('retries generated slugs on collision and gives up after 3', async () => {
    // Pre-insert a link occupying 'stuck' slug
    await createLink(db, { ...BASE, slug: 'stuck' });

    // slugGen returns 'stuck' twice then 'free-1' → succeeds on 3rd attempt
    let callCount = 0;
    const slugGen1 = () => {
      callCount++;
      if (callCount <= 2) return 'stuck';
      return 'free-1';
    };
    const ok = await createLink(db, BASE, slugGen1);
    expect(ok).not.toBeNull();
    expect(ok!.slug).toBe('free-1');

    // slugGen always returns 'stuck' → all 3 attempts collide → returns null
    const slugGen2 = () => 'stuck';
    const fail = await createLink(db, BASE, slugGen2);
    expect(fail).toBeNull();
  });
});

describe('lookups', () => {
  it('finds by slug and by token hash; misses return null', async () => {
    const link = await createLink(db, { ...BASE, slug: 'find-me' });
    expect((await getLinkBySlug(db, 'find-me'))!.id).toBe(link!.id);
    expect((await getLinkByTokenHash(db, 'a'.repeat(64)))!.id).toBe(link!.id);
    expect(await getLinkBySlug(db, 'nope')).toBeNull();
    expect(await getLinkByTokenHash(db, 'f'.repeat(64))).toBeNull();
  });
});

describe('recordClick', () => {
  it('inserts a click row and increments clickCount', async () => {
    const link = await createLink(db, BASE);
    await recordClick(db, { linkId: link!.id, referrerHost: 'news.ycombinator.com', device: 'desktop', browser: 'Chrome', country: 'IN' });
    const after = await getLinkBySlug(db, link!.slug);
    expect(after!.clickCount).toBe(1);
  });
});

describe('countRecentByCreator (rate limit)', () => {
  it('counts only this creator within the window', async () => {
    await createLink(db, BASE);
    await createLink(db, BASE);
    await createLink(db, { ...BASE, creatorIpHash: 'c'.repeat(64) });
    const since = new Date(Date.now() - 3_600_000);
    expect(await countRecentByCreator(db, 'b'.repeat(64), since)).toBe(2);
  });
});

describe('mutations', () => {
  it('updateTitle, updateDestination, setDisabled, deleteLink', async () => {
    const link = await createLink(db, BASE);
    await updateTitle(db, link!.id, 'Example Domain');
    await updateDestination(db, link!.id, 'https://example.org');
    await setDisabled(db, link!.id, true);
    const updated = await getLinkBySlug(db, link!.slug);
    expect(updated!.title).toBe('Example Domain');
    expect(updated!.targetUrl).toBe('https://example.org');
    expect(updated!.disabled).toBe(true);

    await deleteLink(db, link!.id);
    expect(await getLinkBySlug(db, link!.slug)).toBeNull();
  });
});

describe('aggregates', () => {
  it('clicksByDay groups non-bot clicks; topReferrers/deviceSplit/countrySplit aggregate correctly', async () => {
    const link = await createLink(db, BASE);
    const add = (over: Partial<Parameters<typeof recordClick>[1]>) =>
      recordClick(db, { linkId: link!.id, referrerHost: null, device: 'desktop', browser: 'Chrome', country: null, ...over });

    await add({ referrerHost: 'x.com', country: 'IN' });
    await add({ referrerHost: 'x.com', device: 'mobile', browser: 'Safari', country: 'US' });
    await add({});                       // direct, no country
    await add({ device: 'bot' });        // must be excluded everywhere

    const days = await clicksByDay(db, link!.id, 7);
    expect(days.reduce((s, r) => s + r.count, 0)).toBe(3);

    const filled = fillDays(days, 7, new Date());
    expect(filled.reduce((s, r) => s + r.count, 0)).toBe(3);

    const refs = await topReferrers(db, link!.id, 5);
    expect(refs).toEqual([
      { name: 'x.com', count: 2 },
      { name: 'direct', count: 1 },
    ]);

    const devices = await deviceSplit(db, link!.id);
    expect(devices).toEqual(expect.arrayContaining([
      { name: 'desktop', count: 2 },
      { name: 'mobile', count: 1 },
    ]));
    expect(devices.find((d) => d.name === 'bot')).toBeUndefined();

    const countries = await countrySplit(db, link!.id);
    expect(countries).toEqual(expect.arrayContaining([
      { name: 'IN', count: 1 },
      { name: 'US', count: 1 },
      { name: '??', count: 1 },
    ]));
  });
});

describe('recordClick — repeated', () => {
  it('accumulates the counter once per click', async () => {
    const link = await createLink(db, BASE);
    for (let i = 0; i < 3; i++) {
      await recordClick(db, { linkId: link!.id, referrerHost: null, device: 'desktop', browser: 'Chrome', country: null });
    }
    expect((await getLinkBySlug(db, link!.slug))!.clickCount).toBe(3);
  });
});
