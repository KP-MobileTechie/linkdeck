'use client';

import { useActionState, useState } from 'react';
import { motion } from 'framer-motion';
import { createLinkAction, checkSlugAction, type CreateResult } from '@/app/actions';
import { CopyButton } from './CopyButton';
import { QrCode } from './QrCode';

export function CreateCard() {
  // "Shorten another" resets the flow by remounting the form (key change) —
  // useActionState has no reset API, and client-side <Link href="/"> on the
  // same route preserves state, leaving the success card stuck.
  const [formKey, setFormKey] = useState(0);
  return <CreateCardForm key={formKey} onReset={() => setFormKey((k) => k + 1)} />;
}

function CreateCardForm({ onReset }: { onReset: () => void }) {
  const [result, formAction, pending] = useActionState<CreateResult | null, FormData>(createLinkAction, null);
  const [slugNote, setSlugNote] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  async function onSlugBlur(e: React.FocusEvent<HTMLInputElement>) {
    const slug = e.target.value.trim();
    if (!slug) return setSlugNote(null);
    const check = await checkSlugAction(slug);
    setSlugNote(check.available ? '✓ available' : check.reason ?? 'Not available.');
  }

  if (result?.ok) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="card flex w-full max-w-lg flex-col items-center gap-5 p-8 text-center"
      >
        <h2 className="text-xl font-semibold">Your link is live</h2>
        <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-3">
          <span className="truncate font-mono text-sm">{result.shortUrl}</span>
          <CopyButton value={result.shortUrl!} />
        </div>
        <QrCode value={result.shortUrl!} />
        <div className="w-full rounded-xl border border-line p-4 text-left">
          <p className="text-sm font-semibold text-danger">Save your management link — it&apos;s shown only once.</p>
          <p className="mt-1 text-xs text-fg-dim">It&apos;s the only way to see stats or edit this link.</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="truncate font-mono text-xs">{result.mgmtUrl}</span>
            <CopyButton value={result.mgmtUrl!} />
          </div>
        </div>
        <button type="button" onClick={onReset} className="text-sm text-accent underline-offset-2 hover:underline">
          Shorten another
        </button>
      </motion.div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const tz = e.currentTarget.elements.namedItem('tzOffset');
        if (tz instanceof HTMLInputElement) tz.value = String(new Date().getTimezoneOffset());
      }}
      className="card flex w-full max-w-lg flex-col gap-4 p-8"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">linkdeck</h1>
        <p className="mt-1 text-sm text-fg-dim">Short links with private click analytics. No account needed.</p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Long URL</span>
        <input
          name="url" type="url" required placeholder="https://example.com/a/very/long/path"
          className="rounded-xl border border-line bg-bg px-3 py-2.5 font-mono text-sm"
        />
      </label>

      <button
        type="button"
        onClick={() => setShowOptions((s) => !s)}
        className="self-start text-sm text-fg-dim hover:text-fg"
        aria-expanded={showOptions}
      >
        {showOptions ? '− Hide options' : '+ Custom slug, expiry, click limit'}
      </button>

      {showOptions && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Custom slug <span className="text-fg-dim">(optional)</span></span>
            <input
              name="slug" placeholder="my-resume" onBlur={onSlugBlur}
              className="rounded-xl border border-line bg-bg px-3 py-2.5 font-mono text-sm"
            />
            {slugNote && <span className={`text-xs ${slugNote.startsWith('✓') ? 'text-ok' : 'text-danger'}`}>{slugNote}</span>}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Expires <span className="text-fg-dim">(optional)</span></span>
              <input name="expiresAt" type="datetime-local" className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm" />
              <input type="hidden" name="tzOffset" defaultValue="0" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Max clicks <span className="text-fg-dim">(optional)</span></span>
              <input name="maxClicks" type="number" min="1" placeholder="100" className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm" />
            </label>
          </div>
        </div>
      )}

      {result && !result.ok && <p className="text-sm text-danger" role="alert">{result.error}</p>}

      <button
        type="submit" disabled={pending}
        className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Shortening…' : 'Shorten'}
      </button>
    </form>
  );
}
