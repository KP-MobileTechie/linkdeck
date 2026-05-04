'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { getDb } from '@/lib/db/client';
import { createLink, countRecentByCreator, getLinkBySlug } from '@/lib/db/queries';
import { validateTargetUrl } from '@/lib/validate';
import { validateCustomSlug } from '@/lib/slug';
import { generateToken, hashToken } from '@/lib/token';
import { fetchAndStoreTitle } from '@/lib/fetchTitle';

const RATE_LIMIT_PER_HOUR = 20;
const MAX_MAX_CLICKS = 1_000_000;

export interface CreateResult {
  ok: boolean;
  error?: string;
  shortUrl?: string;
  slug?: string;
  mgmtUrl?: string;
}

async function requestBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

async function clientIpHash(): Promise<string> {
  const h = await headers();
  // x-vercel-forwarded-for is set by Vercel's proxy and not client-forgeable;
  // fall back for local dev. Leftmost XFF alone is trivially spoofable.
  const ip =
    h.get('x-vercel-forwarded-for')?.split(',')[0].trim() ??
    h.get('x-real-ip')?.trim() ??
    (h.get('x-forwarded-for') ?? '0.0.0.0').split(',')[0].trim();
  return createHash('sha256').update(ip).digest('hex');
}

export async function createLinkAction(_prev: CreateResult | null, formData: FormData): Promise<CreateResult> {
  const urlCheck = validateTargetUrl(String(formData.get('url') ?? ''));
  if (!urlCheck.ok) return { ok: false, error: urlCheck.reason };

  const customSlug = String(formData.get('slug') ?? '').trim();
  if (customSlug) {
    const slugCheck = validateCustomSlug(customSlug);
    if (!slugCheck.ok) return { ok: false, error: slugCheck.reason };
  }

  let expiresAt: Date | null = null;
  const expiresRaw = String(formData.get('expiresAt') ?? '').trim();
  if (expiresRaw) {
    // datetime-local is zoneless; interpret it in the USER's timezone using the
    // submitted offset (minutes, as from Date.prototype.getTimezoneOffset).
    const tzOffset = Number(formData.get('tzOffset') ?? 0);
    const offsetMin = Number.isFinite(tzOffset) ? tzOffset : 0;
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(expiresRaw) ? `${expiresRaw}Z` : expiresRaw;
    const asUtc = new Date(iso);
    if (Number.isNaN(asUtc.getTime())) return { ok: false, error: 'Invalid expiry date.' };
    expiresAt = new Date(asUtc.getTime() + offsetMin * 60_000);
    if (expiresAt.getTime() <= Date.now()) return { ok: false, error: 'Expiry must be in the future.' };
  }

  let maxClicks: number | null = null;
  const maxRaw = String(formData.get('maxClicks') ?? '').trim();
  if (maxRaw) {
    maxClicks = Number(maxRaw);
    if (!Number.isInteger(maxClicks) || maxClicks < 1 || maxClicks > MAX_MAX_CLICKS) {
      return { ok: false, error: 'Max clicks must be a whole number ≥ 1.' };
    }
  }

  const db = getDb();
  const ipHash = await clientIpHash();
  const recent = await countRecentByCreator(db, ipHash, new Date(Date.now() - 3_600_000));
  if (recent >= RATE_LIMIT_PER_HOUR) {
    return { ok: false, error: 'Rate limit reached — try again in an hour.' };
  }

  const token = generateToken();
  const link = await createLink(db, {
    targetUrl: urlCheck.url,
    slug: customSlug || undefined,
    expiresAt,
    maxClicks,
    mgmtTokenHash: hashToken(token),
    creatorIpHash: ipHash,
  });
  if (!link) return { ok: false, error: 'That slug is already taken.' };

  after(() => fetchAndStoreTitle(db, link.id, link.targetUrl));

  const base = await requestBaseUrl();
  return {
    ok: true,
    slug: link.slug,
    shortUrl: `${base}/${link.slug}`,
    mgmtUrl: `${base}/m/${token}`,
  };
}

export async function checkSlugAction(slug: string): Promise<{ available: boolean; reason?: string }> {
  const check = validateCustomSlug(slug);
  if (!check.ok) return { available: false, reason: check.reason };
  const existing = await getLinkBySlug(getDb(), slug);
  return existing ? { available: false, reason: 'Already taken.' } : { available: true };
}
