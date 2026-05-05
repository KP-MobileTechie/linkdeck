/** Minimal branded HTML for non-React responses (real 404/410/503 status codes). */
export function errorPage(heading: string, message: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${heading} — linkdeck</title>
<style>
  :root { color-scheme: light dark; }
  body { min-height: 100dvh; display: grid; place-items: center; margin: 0;
         font-family: ui-sans-serif, system-ui, sans-serif;
         background: #fafafa; color: #18181b; }
  @media (prefers-color-scheme: dark) { body { background: #09090b; color: #fafafa; } }
  .card { border: 1px solid #71717a44; border-radius: 16px; padding: 40px 48px; text-align: center; }
  h1 { margin: 0 0 8px; font-size: 28px; }
  p { margin: 0; color: #71717a; }
  a { color: #6366f1; }
</style></head>
<body><div class="card"><h1>${heading}</h1><p>${message}</p><p style="margin-top:16px"><a href="/">linkdeck</a></p></div></body></html>`;
}
