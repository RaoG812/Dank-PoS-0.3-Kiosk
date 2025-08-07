'use client';
import { useEffect } from 'react';

export default function IdleScreen({ onWake }: { onWake: () => void }) {
  useEffect(() => {
    const handler = () => onWake();
    window.addEventListener('touchstart', handler);
    window.addEventListener('keydown', handler);
    window.addEventListener('mousemove', handler);
    return () => {
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('mousemove', handler);
    };
  }, [onWake]);

  return (
    <div
      onClick={onWake}
      className="flex flex-col items-center justify-center h-screen select-none bg-gradient-to-br from-[var(--color-bg-primary)] to-[var(--color-bg-secondary)] text-[var(--color-primary)]"
    >
      <h1 className="text-6xl font-bold mb-6 animate-pulse">Dank Machine</h1>
      <p className="text-xl animate-bounce">Tap to start</p>
    </div>
  );
}
