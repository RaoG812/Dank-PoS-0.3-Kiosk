'use client';
import { useEffect, useState } from 'react';
import AIConsultant from './AIConsultant';
import { getClientSupabaseClient } from '../lib/supabase/client';

interface Item {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
}

export default function ProductMenu() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const supabase = getClientSupabaseClient();
      const { data, error } = await supabase.from('kiosk_items').select('*');
      if (error) setError(error.message);
      if (data) setItems(data as Item[]);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-xl">
        Loading menu...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--color-danger)]">
        {error}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar grid grid-cols-3 gap-6">
        {items.map(i => (
          <div
            key={i.id}
            className="bg-[var(--color-bg-secondary)] rounded-lg p-4 flex flex-col items-center shadow-lg hover:shadow-[var(--color-primary)] transition"
          >
            {i.image_url && (
              <img src={i.image_url} alt={i.name} className="mb-2 w-full h-48 object-cover rounded" />
            )}
            <p className="text-xl font-semibold">{i.name}</p>
            <p className="text-[var(--color-primary)] text-lg">${i.price.toFixed(2)}</p>
          </div>
        ))}
        {items.length === 0 && (
          <p className="col-span-3 text-center text-[var(--color-text-secondary)]">No products available</p>
        )}
      </div>
      <div className="border-t border-[var(--color-border)] p-2">
        <AIConsultant items={items} />
      </div>
    </div>
  );
}
