import {
  pgTable, serial, bigserial, varchar, text, char, integer, boolean, timestamp, index,
} from 'drizzle-orm/pg-core';

export const links = pgTable('links', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 32 }).notNull().unique(),
  targetUrl: text('target_url').notNull(),
  title: text('title'),
  mgmtTokenHash: char('mgmt_token_hash', { length: 64 }).notNull(),
  creatorIpHash: char('creator_ip_hash', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  maxClicks: integer('max_clicks'),
  disabled: boolean('disabled').notNull().default(false),
  clickCount: integer('click_count').notNull().default(0),
}, (t) => [
  index('links_mgmt_token_hash_idx').on(t.mgmtTokenHash),
  index('links_creator_created_idx').on(t.creatorIpHash, t.createdAt),
]);

export const clicks = pgTable('clicks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  linkId: integer('link_id').notNull().references(() => links.id, { onDelete: 'cascade' }),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  referrerHost: text('referrer_host'),
  device: text('device').notNull(),
  browser: text('browser').notNull(),
  country: char('country', { length: 2 }),
}, (t) => [
  index('clicks_link_ts_idx').on(t.linkId, t.ts),
]);

export type Link = typeof links.$inferSelect;
export type Click = typeof clicks.$inferSelect;
