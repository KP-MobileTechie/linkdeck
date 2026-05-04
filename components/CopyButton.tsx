'use client';

import { useState } from 'react';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — user can select manually
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition hover:bg-accent-soft"
      aria-live="polite"
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}
