'use client';
import { useEffect, useState } from 'react';
import IdleScreen from '../components/IdleScreen';
import ProductMenu from '../components/ProductMenu';

export default function Home() {
  const [idle, setIdle] = useState(false);


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
    return <LoginForm onLoggedIn={() => setLoggedIn(true)} />;
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
