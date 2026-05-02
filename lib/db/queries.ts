import { and, count, eq, gt, sql } from 'drizzle-orm';
import { links, clicks, type Link } from './schema';
import type { DB } from './client';
import { generateSlug } from '@/lib/slug';

export interface NewLink {
  targetUrl: string;
  mgmtTokenHash: string;
  creatorIpHash: string;
  slug?: string;
  expiresAt?: Date | null;
  maxClicks?: number | null;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
}

/**
 * Insert a link. Custom slug conflict → null (caller shows "taken").
 * Generated slugs retry up to 3 times on the (vanishingly rare) collision.
 */
export async function createLink(db: DB, input: NewLink, slugGen: () => string = generateSlug): Promise<Link | null> {
  const attempts = input.slug ? 1 : 3;
  for (let i = 0; i < attempts; i++) {
    const slug = input.slug ?? slugGen();
    try {
      const [row] = await db.insert(links).values({
        slug,
        targetUrl: input.targetUrl,
        mgmtTokenHash: input.mgmtTokenHash,
        creatorIpHash: input.creatorIpHash,
        expiresAt: input.expiresAt ?? null,
        maxClicks: input.maxClicks ?? null,
      }).returning();
      return row;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  return null;
}

export async function getLinkBySlug(db: DB, slug: string): Promise<Link | null> {
  const [row] = await db.select().from(links).where(eq(links.slug, slug)).limit(1);
  return row ?? null;
}

export async function getLinkByTokenHash(db: DB, tokenHash: string): Promise<Link | null> {
  const [row] = await db.select().from(links).where(eq(links.mgmtTokenHash, tokenHash)).limit(1);
  return row ?? null;
}

export interface NewClick {
  linkId: number;
  referrerHost: string | null;
  device: string;
  browser: string;
  country: string | null;
}

/**
 * Two sequential statements, no transaction — the neon-http driver doesn't support
 * transactions, and a click counter being off by one in a crash is acceptable.
 */
export async function recordClick(db: DB, click: NewClick): Promise<void> {
  await db.insert(clicks).values(click);
  await db.update(links)
    .set({ clickCount: sql`${links.clickCount} + 1` })
    .where(eq(links.id, click.linkId));
}

export async function countRecentByCreator(db: DB, creatorIpHash: string, since: Date): Promise<number> {
  const [row] = await db.select({ n: count() }).from(links)
    .where(and(eq(links.creatorIpHash, creatorIpHash), gt(links.createdAt, since)));
  return row.n;
}

export async function updateTitle(db: DB, id: number, title: string): Promise<void> {
  await db.update(links).set({ title }).where(eq(links.id, id));
}

export async function updateDestination(db: DB, id: number, targetUrl: string): Promise<void> {
  await db.update(links).set({ targetUrl }).where(eq(links.id, id));
}

export async function setDisabled(db: DB, id: number, disabled: boolean): Promise<void> {
  await db.update(links).set({ disabled }).where(eq(links.id, id));
}

export async function deleteLink(db: DB, id: number): Promise<void> {
  await db.delete(links).where(eq(links.id, id));
}

export interface NamedCount {
  name: string;
  count: number;
}

/** Normalize the result of db.execute() across pglite (Results<T>) and neon-http (has .rows). */
function toRows<T>(result: unknown): T[] {
  // Both pglite Results and neon-http FullQueryResults expose .rows
  const r = result as { rows?: T[] };
  if (r && Array.isArray(r.rows)) {
    return r.rows.map((row) => {
      // Coerce count fields that may arrive as strings from either driver
      const obj = row as Record<string, unknown>;
      if ('count' in obj) obj.count = Number(obj.count);
      return row;
    });
  }
  // Fallback: result itself is the array (unlikely but safe)
  if (Array.isArray(result)) {
    return (result as T[]).map((row) => {
      const obj = row as Record<string, unknown>;
      if ('count' in obj) obj.count = Number(obj.count);
      return row;
    });
  }
  return [];
}

export async function clicksByDay(db: DB, linkId: number, days: number): Promise<{ day: string; count: number }[]> {
  const result = await db.execute(sql`
    select to_char(date_trunc('day', ${clicks.ts}), 'YYYY-MM-DD') as day, count(*)::int as count
    from ${clicks}
    where ${clicks.linkId} = ${linkId}
      and ${clicks.device} <> 'bot'
      and ${clicks.ts} >= date_trunc('day', now()) - make_interval(days => ${days} - 1)
    group by 1
    order by 1
  `);
  return toRows<{ day: string; count: number }>(result);
}

export async function topReferrers(db: DB, linkId: number, limit: number): Promise<NamedCount[]> {
  const result = await db.execute(sql`
    select coalesce(${clicks.referrerHost}, 'direct') as name, count(*)::int as count
    from ${clicks}
    where ${clicks.linkId} = ${linkId} and ${clicks.device} <> 'bot'
    group by 1
    order by 2 desc, 1
    limit ${limit}
  `);
  return toRows<NamedCount>(result);
}

export async function deviceSplit(db: DB, linkId: number): Promise<NamedCount[]> {
  const result = await db.execute(sql`
    select ${clicks.device} as name, count(*)::int as count
    from ${clicks}
    where ${clicks.linkId} = ${linkId} and ${clicks.device} <> 'bot'
    group by 1
    order by 2 desc
  `);
  return toRows<NamedCount>(result);
}

export async function countrySplit(db: DB, linkId: number): Promise<NamedCount[]> {
  const result = await db.execute(sql`
    select coalesce(${clicks.country}, '??') as name, count(*)::int as count
    from ${clicks}
    where ${clicks.linkId} = ${linkId} and ${clicks.device} <> 'bot'
    group by 1
    order by 2 desc
  `);
  return toRows<NamedCount>(result);
}
