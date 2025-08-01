'use client';
import { useEffect, useState } from 'react';
import { getClientSupabaseClient } from '../../lib/supabase/client';
import AdminConfirmModal from '../../components/AdminConfirmModal';
import NavBar from '../../components/NavBar';

export default function SettingsPage() {
  const supabase = getClientSupabaseClient();
  const [items, setItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    supabase.from('kiosk_items').select('*').then(({ data }) => {
      if (data) setItems(data as any[]);
    });
  }, [supabase]);

  const handleDelete = async (id: number, user: string, pass: string) => {
    await supabase.from('kiosk_items').delete().eq('id', id);
    setItems(items.filter(i => i.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="p-6 space-y-4 flex-1 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        {items.map(i => (
          <div key={i.id} className="border border-[var(--color-border)] p-4 rounded flex justify-between items-center">
            <div className="space-y-1">
              <p className="font-semibold">{i.name}</p>
            </div>
            <button className="text-[var(--color-danger)]" onClick={() => setShowModal(i.id)}>Delete</button>
            {showModal === i.id && (
              <AdminConfirmModal
                isOpen={true}
                onClose={() => setShowModal(false)}
                title="Confirm Delete"
                message="Enter admin credentials to delete item"
                confirmationPhrase="DELETE"
                onConfirm={(u,p) => {handleDelete(i.id,u,p); setShowModal(false);}}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
