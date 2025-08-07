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

interface InventoryRow {
  id: number;
  name: string;
  available_stock: number;
  pricing_options: { price: number }[] | null;
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
        console.error('Error fetching inventory:', error);
        setItems([]);
        return;
      }

      const mapped = (data as InventoryRow[] | null)?.map(row => ({
        id: row.id,
        name: row.name,
        available_stock: row.available_stock,
        price: Number(row.pricing_options?.[0]?.price ?? 0),
      })) ?? [];

      setItems(mapped);
    };
    fetchItems();
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {items.length > 0 ? (
          <table className="w-full table-auto">
            <caption className="sr-only">Available products</caption>
            <thead>
              <tr className="text-left">
                <th className="pb-2">Name</th>
                <th className="pb-2">Price</th>
                <th className="pb-2">Available</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t border-[var(--color-border)]">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2">${item.price.toFixed(2)}</td>
                  <td className="py-2">{item.available_stock}</td>
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
