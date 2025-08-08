'use client';
import { useEffect, useState } from 'react';
import IdleScreen from '../components/IdleScreen';
import ProductMenu from '../components/ProductMenu';
import LoginForm from '../components/LoginForm';
import NavBar from '../components/NavBar';
import { initializeSupabaseClient } from '../lib/supabase/client';

export default function Home() {
  const [idle, setIdle] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // Restore login status and Supabase credentials
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('loggedIn');
      if (stored === 'true') {
        const url = localStorage.getItem('supabaseUrl');
        const key = localStorage.getItem('supabaseAnonKey');
        if (url && key) {
          try {
            initializeSupabaseClient(url, key);
          } catch (e) {
            console.error('Failed to restore Supabase client:', e);
          }
        }
        setLoggedIn(true);
        if (sessionStorage.getItem('forceIdle') === 'true') {
          setIdle(true);
          sessionStorage.removeItem('forceIdle');
        }
      }
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 30000);
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
