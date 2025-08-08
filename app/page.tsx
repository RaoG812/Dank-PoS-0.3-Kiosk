'use client';
import { useEffect, useState } from 'react';
import IdleScreen from '../components/IdleScreen';
import ProductMenu from '../components/ProductMenu';
import LoginForm from '../components/LoginForm';
import NavBar from '../components/NavBar';

export default function Home() {
  const [idle, setIdle] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // Restore login status so navigation doesn't bounce back to the login screen
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('loggedIn');
      if (stored === 'true') setLoggedIn(true);
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
        onLoggedIn={() => {
          localStorage.setItem('loggedIn', 'true');
          setLoggedIn(true);
        }}
      />
    );
  }

  return idle ? (
    <IdleScreen onWake={() => setIdle(false)} />
  ) : (
    <div className="h-screen flex flex-col">
      <NavBar />
      <ProductMenu />
    </div>
  );
}
