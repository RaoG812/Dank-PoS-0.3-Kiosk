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

  const placeOrder = async (itemId: number) => {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, machine_id: 'kiosk-1' })
    });
  };

  useEffect(() => {
    const supabase = getClientSupabaseClient();
    supabase.from('kiosk_items').select('*').then(({ data }) => {
      if (data) setItems(data as Item[]);
    });
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar grid grid-cols-3 gap-6">
        {items.map(i => (
          <div key={i.id} className="bg-[var(--color-bg-secondary)] rounded-lg p-4 flex flex-col items-center shadow-lg">
            {i.image_url && <img src={i.image_url} alt={i.name} className="mb-2 w-full h-48 object-cover rounded" />}
            <p className="text-xl font-semibold">{i.name}</p>
            <p className="text-[var(--color-primary)] text-lg mb-2">${i.price.toFixed(2)}</p>
            <button onClick={() => placeOrder(i.id)} className="bg-[var(--color-primary)] text-black px-3 py-1 rounded">Order</button>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--color-border)] p-2">
        <AIConsultant items={items} />
      </div>
    </div>
  );
}
