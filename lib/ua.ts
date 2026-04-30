export type Device = 'desktop' | 'mobile' | 'tablet' | 'bot';
export type Browser = 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Other';

export interface UAInfo {
  device: Device;
  browser: Browser;
}

const BOT_RE = /bot|crawl|spider|slurp|curl|wget|python-requests|httpclient|headless|facebookexternalhit|whatsapp|telegrambot|discordbot/i;

function detectBrowser(ua: string): Browser {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua) || /CriOS\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}

/** Coarse, privacy-safe classification. Unknown/empty UA counts as bot. */
export function classifyUA(ua: string | null): UAInfo {
  if (!ua) return { device: 'bot', browser: 'Other' };
  if (BOT_RE.test(ua)) return { device: 'bot', browser: detectBrowser(ua) };

  const browser = detectBrowser(ua);
  if (/iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) || /Tablet/i.test(ua)) {
    return { device: 'tablet', browser };
  }
  if (/Mobi|iPhone|Android/.test(ua)) return { device: 'mobile', browser };
  return { device: 'desktop', browser };
}
