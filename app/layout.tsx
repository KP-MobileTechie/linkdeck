import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'linkdeck — short links with private analytics',
  description:
    'Shorten a URL, get a QR code and a private analytics dashboard: clicks over time, referrers, devices, countries. No account needed.',
  referrer: 'strict-origin-when-cross-origin',
  metadataBase: new URL('https://linkdeck.vercel.app'), // update to real URL after first deploy
  openGraph: {
    title: 'linkdeck — short links with private analytics',
    description: 'Shorten, share, and watch the clicks roll in. No account needed.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
