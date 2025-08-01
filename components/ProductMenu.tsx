'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import AIConsultant from './AIConsultant';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Item {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
}

export default function ProductMenu() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    supabase.from('kiosk_items').select('*').then(({ data }) => {
      if (data) setItems(data as Item[]);
    });
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar grid grid-cols-2 gap-4">
        {items.map(i => (
          <div key={i.id} className="bg-[var(--color-bg-secondary)] rounded p-2 flex flex-col items-center">
            {i.image_url && <img src={i.image_url} alt={i.name} className="mb-2 w-full h-40 object-cover" />}
            <p className="text-lg font-bold">{i.name}</p>
            <p>${i.price.toFixed(2)}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--color-border)] p-2">
        <AIConsultant items={items} />
      </div>
    </div>
  );
}
