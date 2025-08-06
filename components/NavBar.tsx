'use client';
import Link from 'next/link';

export default function NavBar() {
  return (
    <nav className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] px-4 py-2 flex justify-between items-center">
      <Link href="/" className="font-bold text-xl">Dank Machine</Link>
      <div className="space-x-4 text-lg">
        <Link href="/" className="hover:text-[var(--color-primary)]">Menu</Link>
      </div>
    </nav>
  );
}
