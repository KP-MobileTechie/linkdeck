import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="card flex flex-col items-center gap-3 px-12 py-10 text-center">
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-fg-dim">There&apos;s nothing here.</p>
        <Link href="/" className="text-accent underline-offset-2 hover:underline">linkdeck home</Link>
      </div>
    </main>
  );
}
