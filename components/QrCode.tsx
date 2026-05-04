'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrCode({ value }: { value: string }) {
  const [pngUrl, setPngUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(value, { width: 192, margin: 1 })
      .then(setPngUrl)
      .catch(() => setPngUrl(null));
  }, [value]);

  async function downloadSvg() {
    const svg = await QRCode.toString(value, { type: 'svg', margin: 1 });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'linkdeck-qr.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!pngUrl) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pngUrl} alt={`QR code for ${value}`} className="rounded-lg border border-line bg-white p-1" />
      <div className="flex gap-2 text-sm">
        <a href={pngUrl} download="linkdeck-qr.png" className="text-accent underline-offset-2 hover:underline">PNG</a>
        <button type="button" onClick={downloadSvg} className="text-accent underline-offset-2 hover:underline">SVG</button>
      </div>
    </div>
  );
}
