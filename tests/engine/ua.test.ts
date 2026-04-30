import { describe, it, expect } from 'vitest';
import { classifyUA } from '@/lib/ua';

const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const EDGE_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.51';
const SAFARI_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const ANDROID_TABLET = 'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const GOOGLEBOT_MOBILE = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const CURL = 'curl/8.4.0';

describe('classifyUA', () => {
  it('classifies desktop browsers', () => {
    expect(classifyUA(CHROME_WIN)).toEqual({ device: 'desktop', browser: 'Chrome' });
    expect(classifyUA(EDGE_WIN)).toEqual({ device: 'desktop', browser: 'Edge' });
    expect(classifyUA(SAFARI_MAC)).toEqual({ device: 'desktop', browser: 'Safari' });
    expect(classifyUA(FIREFOX_LINUX)).toEqual({ device: 'desktop', browser: 'Firefox' });
  });

  it('classifies mobile and tablet', () => {
    expect(classifyUA(CHROME_ANDROID)).toEqual({ device: 'mobile', browser: 'Chrome' });
    expect(classifyUA(SAFARI_IPHONE)).toEqual({ device: 'mobile', browser: 'Safari' });
    expect(classifyUA(IPAD).device).toBe('tablet');
    expect(classifyUA(ANDROID_TABLET).device).toBe('tablet'); // Android without "Mobile"
  });

  it('detects bots and handles null/empty', () => {
    expect(classifyUA(GOOGLEBOT).device).toBe('bot');
    expect(classifyUA(CURL).device).toBe('bot');
    expect(classifyUA(null)).toEqual({ device: 'bot', browser: 'Other' });
    expect(classifyUA('')).toEqual({ device: 'bot', browser: 'Other' });
  });

  it('bot takes precedence over mobile: mobile Googlebot classifies as bot', () => {
    expect(classifyUA(GOOGLEBOT_MOBILE).device).toBe('bot');
  });
});
