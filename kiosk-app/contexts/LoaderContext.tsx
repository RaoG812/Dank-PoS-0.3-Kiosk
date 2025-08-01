// contexts/LoaderContext.tsx
'use client'; // This is a Client Component

import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import Loader from '../components/Loader/Loader'; // Adjust path if necessary

interface LoaderContextType {
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

interface LoaderProviderProps {
  children: ReactNode;
}

export const LoaderProvider: React.FC<LoaderProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showLoader = useCallback((msg = 'Loading...') => {
    setLoading(true);
    setMessage(msg);
  }, []);

  const hideLoader = useCallback(() => {
    setLoading(false);
    setMessage('');
  }, []);

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader }}>
      {children}
      {loading && <Loader message={message} />}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
};
