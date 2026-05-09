# linkdeck

Short links with private click analytics. Paste a URL, get a short link + QR code, and a one-time secret dashboard URL showing clicks over time, referrers, devices, and countries.

<!-- TODO(manual): record demo GIF and replace this line -->
![demo](docs/demo.gif)

**Live demo:** https://linkdeck.vercel.app <!-- update after deploy -->

## Features

- 🔗 Short links with optional **custom slugs**, **expiry dates**, and **click limits**
- 📱 **QR code** per link (PNG/SVG download)
- 📊 Private dashboard: clicks-over-time (7/30d), top referrers, device split, countries
- 🔐 **No accounts** — each link returns a one-time management URL; only its sha256 hash is stored
- 🤖 Bot clicks detected and excluded from stats
- 🚦 Rate limiting (20 links/hour/IP) and SSRF-guarded title fetching

## How it works

The redirect is the hot path: `GET /[slug]` does one indexed Postgres lookup and returns a
302 immediately. The click row (referrer host, device, browser family, country — never an
IP) is written **after the response** with Next.js `after()`, so analytics can never slow
or break a redirect. Expiry/click-limit/disabled checks share one pure function
(`lib/guards.ts`) between the redirect and the dashboard.

Ownership is possession: creating a link returns `/m/<secret>` exactly once, and only
`sha256(secret)` is stored — the same model as a private share link.

The whole DB layer (Drizzle) is tested against **PGlite**, an in-memory Postgres — every
query, including the analytics `GROUP BY`s, runs in CI with zero external services.

## Decisions

- **`after()` over a queue** — at this scale a background write after the response is the
  honest version of "async analytics pipeline"; a queue would be résumé-driven complexity.
- **Token hash over accounts** — auth would gate a demo behind signup. A 144-bit secret in
  the URL is the Google-Docs model, and storing only its hash means a DB leak leaks nothing.
- **Postgres only, no Redis** — a serverless Postgres point-read is plenty fast for a
  portfolio-scale shortener; one service means one failure mode.
- **SSRF guard on title fetch** — the server fetches user-supplied URLs, so every resolved
  IP must be public (blocks localhost/RFC-1918/link-local/CGNAT, and redirects aren't followed).

## Stack

Next.js (App Router) · TypeScript · Drizzle ORM · Neon Postgres · Tailwind CSS · Recharts · Vitest + PGlite

## Run locally

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL (any Postgres works)
npm run db:migrate
npm run dev                  # http://localhost:3000
npm test                     # engine + DB suites (no DB needed — PGlite)
```

## License

MIT
