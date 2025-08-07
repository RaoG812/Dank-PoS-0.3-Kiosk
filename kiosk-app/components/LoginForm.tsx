'use client';
import { useState } from 'react';
import { initializeSupabaseClient } from '../lib/supabase/client';
import { useLoader } from '../contexts/LoaderContext';
import { useCustomAlert } from '../contexts/CustomAlertContext';

export default function LoginForm({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [uid, setUid] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { showLoader, hideLoader } = useLoader();
  const { showCustomAlert } = useCustomAlert();

  const handleLogin = async () => {
    setError('');
    showLoader();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      initializeSupabaseClient(data.supabase_url, data.supabase_anon_key);
      showCustomAlert('Welcome', `Logged in as ${data.username || 'User'}`);
      onLoggedIn();
    } catch (err: any) {
      setError(err.message);
    } finally {
      hideLoader();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-6 rounded-lg w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold text-center text-[var(--color-primary)]">Kiosk Login</h2>
        {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
        <input
          type="text"
          placeholder="NFC UID"
          value={uid}
          onChange={e => setUid(e.target.value)}
          className="w-full p-2 rounded bg-[var(--color-bg-tertiary)]"
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full p-2 rounded bg-[var(--color-bg-tertiary)]"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-[var(--color-bg-tertiary)]"
        />
        <button onClick={handleLogin} className="w-full py-2 bg-[var(--color-primary)] text-black rounded">Login</button>
      </div>
    </div>
  );
}
