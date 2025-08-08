'use client';
import { useEffect, useState } from 'react';
import NavBar from '../../components/NavBar';

export default function SettingsPage() {
  const [showPictures, setShowPictures] = useState(true);
  const [showAttributes, setShowAttributes] = useState(true);
  const [idleTimeout, setIdleTimeout] = useState(60);

  useEffect(() => {
    const stored = localStorage.getItem('kioskSettings');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        if (typeof s.showPictures === 'boolean') setShowPictures(s.showPictures);
        if (typeof s.showAttributes === 'boolean') setShowAttributes(s.showAttributes);
        if (typeof s.idleTimeout === 'number') setIdleTimeout(s.idleTimeout);
      } catch {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(
      'kioskSettings',
      JSON.stringify({ showPictures, showAttributes, idleTimeout })
    );
    alert('Settings saved');
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('supabaseUrl');
    localStorage.removeItem('supabaseAnonKey');
    window.location.href = '/';
  };

  const handleIdle = () => {
    sessionStorage.setItem('forceIdle', 'true');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar onLogout={handleLogout} onIdle={handleIdle} />
      <div className="p-6 space-y-4 flex-1 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showPictures}
            onChange={(e) => setShowPictures(e.target.checked)}
          />
          <span>Display Pictures</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showAttributes}
            onChange={(e) => setShowAttributes(e.target.checked)}
          />
          <span>Display Product Attributes</span>
        </label>
        <div>
          <label className="block mb-1">Idle Timeout (seconds)</label>
          <input
            type="number"
            value={idleTimeout}
            onChange={(e) => setIdleTimeout(parseInt(e.target.value, 10))}
            className="p-2 rounded bg-[var(--color-bg-secondary)]"
          />
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-[var(--color-primary)] text-black rounded"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
