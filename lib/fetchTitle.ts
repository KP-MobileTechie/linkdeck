import { lookup } from 'node:dns/promises';
import { ipIsPublic } from '@/lib/validate';
import { updateTitle } from '@/lib/db/queries';
import type { DB } from '@/lib/db/client';

const FETCH_TIMEOUT_MS = 5_000;
const MAX_BODY_BYTES = 65_536;

/** Every resolved address must be public — one private A record fails the host. */
export async function resolvesToPublicIp(hostname: string): Promise<boolean> {
  try {
    const addrs = await lookup(hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => ipIsPublic(a.address));
  } catch {
    return false;
  }
}

export async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const { hostname } = new URL(url);
    if (!(await resolvesToPublicIp(hostname))) return null;

    const res = await fetch(url, {
      redirect: 'manual', // following redirects could re-enter private space
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'user-agent': 'linkdeck-title-fetch/1.0' },
    });
    if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = '';
    let bytes = 0;
    const decoder = new TextDecoder();
    while (bytes < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (/<\/title>/i.test(html)) break;
    }
    void reader.cancel().catch(() => {});

    const match = html.match(/<title[^>]*>([^<]{1,300})/i);
    if (!match) return null;
    return match[1].replace(/\s+/g, ' ').trim() || null;
  } catch {
    return null;
  }
}

/** Fire-and-forget after creation. Failure leaves title NULL — never an error. */
export async function fetchAndStoreTitle(db: DB, linkId: number, url: string): Promise<void> {
  const title = await fetchPageTitle(url);
  if (title) {
    try {
      await updateTitle(db, linkId, title);
    } catch {
      // best effort
    }
  }
}
