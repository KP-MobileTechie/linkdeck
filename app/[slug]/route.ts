import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getLinkBySlug, recordClick } from '@/lib/db/queries';
import { linkStatus } from '@/lib/guards';
import { classifyUA } from '@/lib/ua';
import { SLUG_RE, RESERVED } from '@/lib/slug';
import { errorPage } from '@/lib/errorPage';

const HTML = { 'content-type': 'text/html; charset=utf-8' };

const GONE_COPY: Record<string, string> = {
  expired: 'This link has expired.',
  exhausted: 'This link reached its click limit.',
  disabled: 'This link was turned off by its owner.',
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!SLUG_RE.test(slug) || RESERVED.has(slug.toLowerCase())) {
    return new Response(errorPage('404', 'No such link.'), { status: 404, headers: HTML });
  }

  let link;
  try {
    link = await getLinkBySlug(getDb(), slug);
  } catch {
    return new Response(errorPage('503', 'Temporarily unavailable — try again shortly.'), { status: 503, headers: HTML });
  }
  if (!link) {
    return new Response(errorPage('404', 'No such link.'), { status: 404, headers: HTML });
  }

  const status = linkStatus(link, new Date());
  if (status !== 'active') {
    return new Response(errorPage('410', GONE_COPY[status]), { status: 410, headers: HTML });
  }

  // Collect analytics BEFORE returning; write AFTER the response is sent.
  const ua = classifyUA(req.headers.get('user-agent'));
  let referrerHost: string | null = null;
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      referrerHost = new URL(referer).hostname || null;
    } catch { /* malformed referer — ignore */ }
  }
  const country = req.headers.get('x-vercel-ip-country');
  const linkId = link.id;

  after(async () => {
    try {
      await recordClick(getDb(), {
        linkId,
        referrerHost,
        device: ua.device,
        browser: ua.browser,
        country: country && country.length === 2 ? country : null,
      });
    } catch {
      // analytics must never break a redirect
    }
  });

  return NextResponse.redirect(link.targetUrl, 302);
}
