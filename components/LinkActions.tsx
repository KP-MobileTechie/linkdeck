'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateDestinationAction, setDisabledAction, deleteLinkAction } from '@/app/m/actions';

interface Props {
  token: string;
  targetUrl: string;
  disabled: boolean;
}

export function LinkActions({ token, targetUrl, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState(targetUrl);
  const [error, setError] = useState<string | null>(null);

  function saveDestination(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateDestinationAction(token, url);
      setError(res.ok ? null : res.error ?? 'Failed.');
    });
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <h3 className="text-sm font-semibold">Manage</h3>
      <form onSubmit={saveDestination} className="flex gap-2">
        <input
          value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Destination URL"
          className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 font-mono text-sm"
        />
        <button type="submit" disabled={pending || url === targetUrl}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Save
        </button>
      </form>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button" disabled={pending}
          onClick={() => startTransition(async () => { await setDisabledAction(token, !disabled); })}
          className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-accent-soft"
        >
          {disabled ? 'Enable link' : 'Disable link'}
        </button>
        <button
          type="button" disabled={pending}
          onClick={() => {
            if (!confirm('Delete this link and all its stats? This cannot be undone.')) return;
            startTransition(async () => {
              const res = await deleteLinkAction(token);
              if (res.ok) router.push('/');
            });
          }}
          className="rounded-xl border border-danger/40 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
        >
          Delete link
        </button>
      </div>
    </div>
  );
}
