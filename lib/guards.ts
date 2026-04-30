export type LinkStatus = 'active' | 'expired' | 'exhausted' | 'disabled';

export interface GuardedLink {
  disabled: boolean;
  expiresAt: Date | null;
  maxClicks: number | null;
  clickCount: number;
}

/** Single source of truth for "can this link redirect?" — used by the hot path and the dashboard. */
export function linkStatus(link: GuardedLink, now: Date): LinkStatus {
  if (link.disabled) return 'disabled';
  if (link.expiresAt && now.getTime() >= link.expiresAt.getTime()) return 'expired';
  if (link.maxClicks !== null && link.clickCount >= link.maxClicks) return 'exhausted';
  return 'active';
}
