// app/contexts/CustomAlertContext.tsx
'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the type for the context
interface CustomAlertContextType {
    showCustomAlert: (title: string, message: string) => void;
}

// Create the context with an initial undefined value
const CustomAlertContext = createContext<CustomAlertContextType | undefined>(undefined);

// Custom hook to use the context
export function useCustomAlert() {
    const context = useContext(CustomAlertContext);
    if (context === undefined) {
        throw new Error('useCustomAlert must be used within a CustomAlertProvider');
    }
    return context;
}

// CustomAlertProvider component
export function CustomAlertProvider({ children }: { children: ReactNode }) {
    const [alert, setAlert] = useState<{ title: string; message: string; } | null>(null);

    const showCustomAlert = (title: string, message: string) => {
        setAlert({ title, message });
    };

    const closeAlert = () => {
        setAlert(null);
    };

    const value = { showCustomAlert };

    return (
        <CustomAlertContext.Provider value={value}>
            {children}
            {alert && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 alert-backdrop">
                    <div className="relative p-6 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg shadow-2xl max-w-sm mx-4 transform transition-all duration-300 scale-100 opacity-100">
                        <h3 className="text-xl font-bold">{alert.title}</h3>
                        <p className="mt-2 text-[var(--color-text-secondary)]">{alert.message}</p>
                        <button
                            onClick={closeAlert}
                            className="mt-4 w-full px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-text-tertiary)] font-medium hover:bg-[var(--color-secondary)] transition-colors duration-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </CustomAlertContext.Provider>
    );
}
