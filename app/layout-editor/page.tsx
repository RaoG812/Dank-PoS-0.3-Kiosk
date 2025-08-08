'use client';
import { useEffect, useState } from 'react';
import NavBar from '../../components/NavBar';
import { getClientSupabaseClient } from '../../lib/supabase/client';
import { generateStrainImage } from '../../lib/gemini';

interface LayoutItem {
  id: string; // inventory id
  name: string;
  price: number;
  image_url: string | null;
  kioskItemId?: number;
}

export default function LayoutPage() {
  const supabase = getClientSupabaseClient();
  const [items, setItems] = useState<LayoutItem[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: inv } = await supabase
        .from('inventory')
        .select('id, name, pricing_options, image_url');
      const { data: kiosk } = await supabase
        .from('kiosk_items')
        .select('id, inventory_id, display_name, name, price, image_url');
      const merged = (inv || []).map((i: any) => {
        const k = kiosk?.find((ki: any) => ki.inventory_id === i.id);
        return {
          id: i.id,
          kioskItemId: k?.id,
          name: k?.display_name || k?.name || i.name,
          price: k?.price || i.pricing_options?.[0]?.price || 0,
          image_url: k?.image_url || i.image_url || null,
        } as LayoutItem;
      });
      setItems(merged);
    };
    load();
  }, [supabase]);

  const handleGenerateImage = async (item: LayoutItem) => {
    try {
      setLoadingId(item.id);
      const base64 = await generateStrainImage(item.name);
      if (!base64) throw new Error('No image data returned');

      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const filePath = `strain-images/${item.id}.png`;
      const { error: uploadError } = await supabase.storage
        .from('strain-images')
        .upload(filePath, blob, { upsert: true, contentType: 'image/png' });
      if (uploadError) throw uploadError;
      const { data: urlData } = await supabase.storage
        .from('strain-images')
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, image_url: publicUrl } : i))
      );
    } catch (e) {
      console.error('Image generation failed', e);
      alert('Failed to generate image');
    } finally {
      setLoadingId(null);
    }
  };

  const handleSave = async (item: LayoutItem) => {
    if (item.kioskItemId) {
      await supabase
        .from('kiosk_items')
        .update({
          display_name: item.name,
          price: item.price,
          image_url: item.image_url,
        })
        .eq('id', item.kioskItemId);
    } else {
      const { data } = await supabase
        .from('kiosk_items')
        .insert({
          inventory_id: item.id,
          display_name: item.name,
          price: item.price,
          image_url: item.image_url,
        })
        .select('id')
        .single();
      item.kioskItemId = data?.id;
    }
    alert('Saved');
  };

  const handleRemove = async (item: LayoutItem) => {
    if (!item.kioskItemId) return;
    await supabase.from('kiosk_items').delete().eq('id', item.kioskItemId);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, kioskItemId: undefined } : i))
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('supabaseUrl');
    localStorage.removeItem('supabaseAnonKey');
    window.location.href = '/';
  };

  const handleIdle = () => {
    sessionStorage.setItem('forceIdle', 'true');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar onLogout={handleLogout} onIdle={handleIdle} />
      <div className="p-6 space-y-4 flex-1 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Layout</h1>
        {items.map((i) => (
          <div
            key={i.id}
            className="border border-[var(--color-border)] p-4 rounded flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            {i.image_url ? (
              <img
                src={i.image_url}
                alt={i.name}
                className="w-32 h-32 object-cover rounded"
              />
            ) : (
              <button
                onClick={() => handleGenerateImage(i)}
                disabled={loadingId === i.id}
                className="w-32 h-32 flex items-center justify-center bg-[var(--color-bg-primary)] text-sm text-[var(--color-primary)] border border-dashed border-[var(--color-border)] rounded"
              >
                {loadingId === i.id ? 'Generating...' : 'Generate Image'}
              </button>
            )}
            <div className="flex-1 space-y-2">
              <input
                value={i.name}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it) =>
                      it.id === i.id ? { ...it, name: e.target.value } : it
                    )
                  )
                }
                className="w-full p-2 rounded bg-[var(--color-bg-secondary)]"
              />
              <input
                type="number"
                value={i.price}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it) =>
                      it.id === i.id ? { ...it, price: parseFloat(e.target.value) } : it
                    )
                  )
                }
                className="w-full p-2 rounded bg-[var(--color-bg-secondary)]"
              />
            </div>
            <div className="space-x-2">
              <button
                onClick={() => handleSave(i)}
                className="px-4 py-2 bg-[var(--color-primary)] text-black rounded"
              >
                Save
              </button>
              {i.kioskItemId && (
                <button
                  onClick={() => handleRemove(i)}
                  className="px-4 py-2 text-[var(--color-danger)]"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
