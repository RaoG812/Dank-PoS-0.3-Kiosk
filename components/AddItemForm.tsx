'use client';
import { useState } from 'react';
import { useLoader } from '../contexts/LoaderContext';
import { useCustomAlert } from '../contexts/CustomAlertContext';

export default function AddItemForm({ onAdd }: { onAdd: (item: any) => void }) {
  const [strain, setStrain] = useState('');
  const [price, setPrice] = useState('');
  const { showLoader, hideLoader } = useLoader();
  const { showCustomAlert } = useCustomAlert();

  const submit = async () => {
    showLoader();
    try {
      const res = await fetch('/api/items/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strain, price: parseFloat(price) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAdd(data.item);
      showCustomAlert('Item Added', data.item.name);
      setStrain('');
      setPrice('');
    } catch (err: any) {
      showCustomAlert('Error', err.message);
    } finally {
      hideLoader();
    }
  };

  return (
    <div className="space-y-2 mb-6">
      <input
        className="p-2 bg-[var(--color-bg-tertiary)] rounded w-full"
        placeholder="Strain Name"
        value={strain}
        onChange={e => setStrain(e.target.value)}
      />
      <input
        className="p-2 bg-[var(--color-bg-tertiary)] rounded w-full"
        placeholder="Price"
        type="number"
        value={price}
        onChange={e => setPrice(e.target.value)}
      />
      <button
        onClick={submit}
        className="bg-[var(--color-primary)] text-black py-2 px-4 rounded"
        disabled={!strain || !price}
      >
        Add Item
      </button>
    </div>
  );
}
