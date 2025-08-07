'use client';
import { useEffect, useState } from 'react';
import AIConsultant from './AIConsultant';
import { getClientSupabaseClient } from '../lib/supabase/client';

interface Item {
  id: number;
  name: string;
  available_stock: number;
  price: number;
}

export default function ProductMenu() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      const supabase = getClientSupabaseClient();
      const { data, error } = await supabase
        .from('inventory')
        .select('id,name,available_stock,pricing_options')
        .gt('available_stock', 0);
      if (error) {
        console.error(error);
        return;
      }
      const mapped = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        available_stock: row.available_stock,
        price: Array.isArray(row.pricing_options) && row.pricing_options[0]
          ? Number(row.pricing_options[0].price) || 0
          : 0,
      }));
      setItems(mapped);
    };
    fetchItems();
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {items.length > 0 ? (
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left">
                <th className="pb-2">Name</th>
                <th className="pb-2">Price</th>
                <th className="pb-2">Available</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="border-t border-[var(--color-border)]">
                  <td className="py-2">{i.name}</td>
                  <td className="py-2">${i.price.toFixed(2)}</td>
                  <td className="py-2">{i.available_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-sm text-gray-500">No items available.</p>
        )}
      </div>
      <div className="border-t border-[var(--color-border)] p-2">
        <AIConsultant items={items} />
      </div>
    </div>
  );
}
