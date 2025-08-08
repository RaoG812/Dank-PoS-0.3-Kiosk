'use client';
import { useEffect, useState } from 'react';
import IdleScreen from '../components/IdleScreen';
import ProductMenu from '../components/ProductMenu';
import LoginForm from '../components/LoginForm';
import NavBar from '../components/NavBar';
import { initializeSupabaseClient } from '../lib/supabase/client';

export default function Home() {
  const [idle, setIdle] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('loggedIn') === 'true') {
      const url = localStorage.getItem('supabaseUrl');
      const key = localStorage.getItem('supabaseAnonKey');
      if (url && key) {
        try {
          initializeSupabaseClient(url, key);
        } catch (e) {
          console.error('Failed to restore Supabase client:', e);
        }
      }
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (loggedIn && typeof window !== 'undefined' && sessionStorage.getItem('forceIdle') === 'true') {
      setIdle(true);
      sessionStorage.removeItem('forceIdle');
    }
  }, [loggedIn]);

  useEffect(() => {
    const getTimeout = () => {
      if (typeof window === 'undefined') return 60000;
      const stored = localStorage.getItem('kioskSettings');
      if (stored) {
        try {
          const s = JSON.parse(stored);
          if (typeof s.idleTimeout === 'number') return s.idleTimeout * 1000;
        } catch {}
      }
      return 60000;
    };

    let timer: NodeJS.Timeout;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), getTimeout());
      setIdle(false);
    };
    window.addEventListener('mousemove', reset);
    window.addEventListener('touchstart', reset);
    reset();
    return () => {
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('touchstart', reset);
      clearTimeout(timer);
    };
  }, []);

  if (!loggedIn) {
    return (
      <LoginForm
        onLoggedIn={(url, key) => {
          localStorage.setItem('loggedIn', 'true');
          localStorage.setItem('supabaseUrl', url);
          localStorage.setItem('supabaseAnonKey', key);
          setLoggedIn(true);
        }}
      />
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('supabaseUrl');
    localStorage.removeItem('supabaseAnonKey');
    setLoggedIn(false);
  };

  return idle ? (
    <IdleScreen onWake={() => setIdle(false)} />
  ) : (
    <div className="h-screen flex flex-col">
      <NavBar onLogout={handleLogout} onIdle={() => setIdle(true)} />
      <ProductMenu />
    </div>
  );
}
