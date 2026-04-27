# linkdeck — Design Spec

**Date:** 2026-04-27
**Status:** Approved

## What

linkdeck is a link shortener with click analytics. Paste a long URL, get a short link and a QR code, and watch clicks roll in on a private dashboard: when, from where, on what device, referred by whom. No accounts — each link comes with a one-time secret management URL.

This is the first full-stack project in the portfolio (keyflow and dropfour are pure-frontend): a real Postgres schema, migrations, server-side authorization, non-blocking writes, and rate limiting.

## Why

- Demonstrate backend/full-stack skills the existing portfolio lacks: relational schema design, indexed hot-path queries, async write patterns, token-based authorization, abuse prevention.
- A shortener is small enough to finish well, but every layer has a real engineering decision to explain.

## Core decisions

1. **Single Next.js app, route-handler redirect + `waitUntil` analytics** — `GET /[slug]` does one indexed Postgres lookup, issues a 302 immediately, and records the click asynchronously via `waitUntil()`. Analytics must never slow or break a redirect.
2. **Neon Postgres only** (Vercel Marketplace) — no Redis cache. A serverless Postgres lookup is fast enough; one service means one failure mode.
3. **No accounts — secret management URL** — creating a link returns `/m/<secret>` exactly once. Only `sha256(secret)` is stored; possession of the URL is ownership (Google-Docs-link model).
4. **Privacy-safe analytics** — no IPs stored on clicks, referrer reduced to host, country from Vercel's geo header, device/browser as coarse families. Creator IP stored only as a hash, only for rate limiting.
5. **Drizzle ORM + PGlite-tested DB layer** — typed schema and real migrations; all queries (including analytics GROUP BYs) run against in-memory Postgres in CI. Zero external services needed to test.

## Data model

**`links`**
| column | type | notes |
|---|---|---|
| id | serial PK | |
| slug | varchar(32) unique | custom or generated (nanoid alphabet, 7 chars), `[a-zA-Z0-9_-]`, case-sensitive |
| targetUrl | text | validated http/https only |
| title | text NULL | fetched server-side after creation (dashboard display) |
| mgmtTokenHash | char(64) | sha256 of management secret; raw secret never stored |
| creatorIpHash | char(64) | sha256(IP), rate limiting only |
| createdAt | timestamptz | |
| expiresAt | timestamptz NULL | optional |
| maxClicks | int NULL | optional |
| disabled | boolean default false | owner toggle |
| clickCount | int default 0 | denormalized; cheap max-clicks check on hot path |

**`clicks`**
| column | type | notes |
|---|---|---|
| id | bigserial PK | |
| linkId | FK → links ON DELETE CASCADE | |
| ts | timestamptz | |
| referrerHost | text NULL | host only |
| device | text | `desktop \| mobile \| tablet \| bot` |
| browser | text | Chrome / Safari / Firefox / Edge / Other |
| country | char(2) NULL | `x-vercel-ip-country` |

Indexes: unique `links.slug`; `links.mgmtTokenHash`; composite `clicks(linkId, ts)`.

## Routes

| route | kind | behavior |
|---|---|---|
| `/` | page + server action | create form: URL, optional custom slug (live availability check), optional expiry date and max clicks. Success view shows short URL, QR code (PNG/SVG download), and the one-time management URL with a "shown once — save it" warning. |
| `/[slug]` | route handler (hot path) | indexed lookup → `linkStatus` guard → 302 + `waitUntil` click write. Unknown slug → branded 404. Expired/exhausted/disabled → branded 410 "gone" page. Bots recorded with `device='bot'`, excluded from dashboard stats. |
| `/m/[token]` | server-component dashboard | lookup by `sha256(token)`. Stats: clicks-over-time chart (7/30-day toggle), top referrers, device donut, country list (bot clicks excluded). Actions: edit destination, disable/enable, delete, QR download. Bad token → branded 404 (no token oracle). |

**Rate limiting:** link creation capped at 20/hour per `creatorIpHash`, counted directly on `links` (no extra table). Over limit → 429 with friendly message.

**SSRF guard:** the post-create title fetch only runs if the target host resolves to a public IP — blocks localhost, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, link-local, and IPv6 loopback/private ranges. Fetch failure leaves `title` NULL; never an error to the user.

## Module layout (pure, Vitest-covered)

```
lib/slug.ts       generate + validate slugs; reserved words (m, api, gone, …)
lib/validate.ts   URL validation (http/https only, no javascript:, length caps); public-IP guard
lib/ua.ts         UA classifier → device + browser family; bot detection (tested on real UA strings)
lib/token.ts      secret generation (crypto random, 24 chars) + sha256 hashing
lib/guards.ts     linkStatus(link, now) → active | expired | exhausted | disabled
lib/db/schema.ts  Drizzle schema
lib/db/queries.ts all DB access (create, lookup, click insert, analytics aggregates, rate-limit count)
```

DB layer tested against PGlite (in-memory Postgres) — Drizzle queries, analytics GROUP BYs, and the rate-limit count all run in CI without secrets.

## Error handling

- Invalid URL / taken slug / bad custom slug → inline form errors.
- DB unreachable on redirect → branded 503 (never a stack trace).
- Click-write failure → swallowed; a redirect must never break because analytics hiccuped.
- Wrong management token → 404, identical to unknown-page response.

## UI

Clean SaaS dashboard: zinc neutrals + indigo accent, light/dark via `prefers-color-scheme`, Inter font, card layout, Recharts (time series + donut), Framer Motion micro-transitions only (copy confirmation, card entrance). Mobile-friendly. Keyboard/focus accessible.

## Stack

Next.js (App Router) · TypeScript · Drizzle ORM · Neon Postgres · Tailwind CSS · Recharts · Framer Motion · Vitest + PGlite

## Deployment

GitHub `KP-MobileTechie/linkdeck` · CI (Vitest + build; no DB secrets needed) · Vercel with Neon Marketplace integration · `drizzle-kit` migrations against Neon.

## Out of scope (v1)

Accounts/auth, custom domains, public JSON API, link editing of slug (destination is editable, slug is not), team features, paid tiers, UTM builders.

## Success criteria

- Redirect p50 under ~150 ms from a warm region; analytics write never blocks it.
- All engine + DB tests green in CI with zero external services.
- A created link survives the full lifecycle: create → QR scan → clicks appear on dashboard → expiry flips it to 410.
- Live Vercel URL, README explaining the waitUntil/SSRF/token-hash decisions.
