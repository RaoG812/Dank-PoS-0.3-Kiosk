'use client';
import Link from 'next/link';

export default function NavBar() {
  return (
    <nav className="bg-gradient-to-r from-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)] text-[var(--color-text-primary)] px-6 py-3 shadow flex justify-center">
      <Link href="/" className="font-bold text-2xl tracking-wider">Dank Machine</Link>
    </nav>
  );
}
