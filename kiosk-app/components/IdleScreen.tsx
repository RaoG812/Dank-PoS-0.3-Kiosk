'use client';
import { useEffect } from 'react';

export default function IdleScreen({ onWake }: { onWake: () => void }) {
  useEffect(() => {
    const handler = () => onWake();
    window.addEventListener('touchstart', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [onWake]);

  return (
    <div className="flex items-center justify-center h-screen bg-[var(--color-bg-primary)] text-[var(--color-primary)]">
      <h1 className="text-5xl animate-pulse">Dank Machine</h1>
    </div>
  );
}
