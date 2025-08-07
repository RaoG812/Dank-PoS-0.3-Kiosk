// components/AdminConfirmModal.tsx
import React, { useState } from 'react';
import { useLoader } from '../contexts/LoaderContext';

// Define the types for the component's props
interface AdminConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    confirmationPhrase: string;
    onConfirm: (username: string, password: string) => void;
}

const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    confirmationPhrase,
    onConfirm
}) => {
    const [typedPhrase, setTypedPhrase] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [error, setError] = useState('');
    const { showLoader, hideLoader } = useLoader(); // Use the loader context
    const [isLoading, setIsLoading] = useState(false); // State for local loading

    if (!isOpen) return null;

    const handleConfirm = async () => { // Make handleConfirm async
        setError('');
        if (typedPhrase !== confirmationPhrase) {
            setError('The confirmation phrase does not match.');
            return;
        }

        setIsLoading(true); // Set local loading state to true
        showLoader(); // Show global loader
        try {
            await onConfirm(adminUsername, adminPassword);
        } finally {
            setIsLoading(false); // Set local loading state to false
            hideLoader(); // Hide global loader
            setTypedPhrase('');
            setAdminUsername('');
            setAdminPassword('');
            // NOTE: onClose() is handled by the parent component after the action is complete
            // The parent component should pass a function that closes the modal
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-bg-tertiary)] p-8 rounded-lg shadow-xl max-w-md w-full border border-[var(--color-border)]">
                <h3 className="text-xl font-semibold mb-4 text-[var(--color-danger)]">{title}</h3>
                <p className="mb-4 text-[var(--color-text-primary)]">{message}</p>
                <div className="space-y-4">
                    {/* Confirmation Phrase Input */}
                    <div>
                        <label htmlFor="confirmPhrase" className="block text-sm font-medium mb-1 text-[var(--color-text-primary)]">
                            Type &quot;<span className="font-mono text-[var(--color-danger)]">{confirmationPhrase}</span>&quot; to continue
                        </label>
                        <input
                            type="text"
                            id="confirmPhrase"
                            value={typedPhrase}
                            onChange={(e) => setTypedPhrase(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                        />
                    </div>

                    {/* Admin Credentials */}
                    <div>
                        <label htmlFor="adminUsername" className="block text-sm font-medium mb-1 text-[var(--color-text-primary)]">Admin Username</label>
                        <input
                            type="text"
                            id="adminUsername"
                            value={adminUsername}
                            onChange={(e) => setAdminUsername(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                        />
                    </div>
                    <div>
                        <label htmlFor="adminPassword" className="block text-sm font-medium mb-1 text-[var(--color-text-primary)]">Admin Password</label>
                        <input
                            type="password"
                            id="adminPassword"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                        />
                    </div>
                </div>

                {error && <p className="mt-4 text-[var(--color-danger)] text-sm">{error}</p>}

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] font-medium hover:bg-[var(--color-border)]"
                        disabled={isLoading} // Disable Cancel button when loading
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 rounded-lg bg-[var(--color-danger)] text-white font-medium disabled:opacity-50"
                        disabled={!typedPhrase || !adminUsername || !adminPassword || isLoading} // Disable confirm button when loading
                    >
                        {isLoading ? (
                            <div className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Confirming...
                            </div>
                        ) : (
                            'Confirm'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminConfirmModal;
