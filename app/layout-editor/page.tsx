'use client';
import { useEffect, useState } from 'react';
import NavBar from '../../components/NavBar';
import { getClientSupabaseClient, restoreSupabaseClient } from '../../lib/supabase/client';
import { generateStrainImage } from '../../lib/gemini';

interface LayoutItem {
  id: string; // inventory id
  name: string;
  price: number;
  image_url: string | null;
  enabled: boolean;
  category?: string;
  description?: string;
}

export default function LayoutPage() {
  const [items, setItems] = useState<LayoutItem[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      restoreSupabaseClient();
      const supabase = getClientSupabaseClient();
      const { data: inv } = await supabase
        .from('inventory')
        .select('id, name, pricing_options, image_url, category, description');
      const { data: kiosk } = await supabase
        .from('kiosk_items')
        .select('id, name, display_name, price, image_url, enabled');
      const merged = (inv || []).map((i: any) => {
        const k = kiosk?.find((ki: any) => ki.id === i.id);
        return {
          id: i.id,
          name: k?.display_name || k?.name || i.name,
          price: k?.price || i.pricing_options?.[0]?.price || 0,
          image_url: k?.image_url || i.image_url || null,
          enabled: k?.enabled ?? false,
          category: i.category,
          description: i.description,
        } as LayoutItem;
      });
      setItems(merged);
    };
    load();
  }, []);

  const handleGenerateImage = async (item: LayoutItem) => {
    try {
      setLoadingId(item.id);
      const base64 = await generateStrainImage(item.name);
      if (!base64) throw new Error('No image data returned');

      const supabase = getClientSupabaseClient();
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
      await supabase.from('kiosk_items').upsert({
        id: item.id,
        name: item.name,
        display_name: item.name,
        price: item.price,
        image_url: publicUrl,
        enabled: item.enabled,
      });
    } catch (e) {
      console.error('Image generation failed', e);
      alert('Failed to generate image');
    } finally {
      setLoadingId(null);
    }
  };

  const handleSave = async (item: LayoutItem) => {
    const supabase = getClientSupabaseClient();
    await supabase.from('kiosk_items').upsert({
      id: item.id,
      name: item.name,
      display_name: item.name,
      price: item.price,
      image_url: item.image_url,
      enabled: item.enabled,
    });
    alert('Saved');
  };

  const handleToggle = async (item: LayoutItem) => {
    const updated = { ...item, enabled: !item.enabled };
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    const supabase = getClientSupabaseClient();
    await supabase.from('kiosk_items').upsert({
      id: updated.id,
      name: updated.name,
      display_name: updated.name,
      price: updated.price,
      image_url: updated.image_url,
      enabled: updated.enabled,
    });
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
      <div className="p-6 flex-1 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Layout</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {items.map((i) => (
            <div
              key={i.id}
              className={`relative p-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg transition transform hover:-translate-y-1 ${i.enabled ? '' : 'opacity-40'}`}
            >
              {i.image_url ? (
                <img
                  src={i.image_url}
                  alt={i.name}
                  className="w-full h-32 object-cover rounded-md mb-2"
                />
              ) : (
                <button
                  onClick={() => handleGenerateImage(i)}
                  disabled={loadingId === i.id}
                  className="w-full h-32 flex items-center justify-center bg-[var(--color-bg-primary)] text-sm text-[var(--color-primary)] border border-dashed border-[var(--color-border)] rounded-md mb-2"
                >
                  {loadingId === i.id ? 'Generating...' : 'Generate'}
                </button>
              )}
              <input
                value={i.name}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it) =>
                      it.id === i.id ? { ...it, name: e.target.value } : it
                    )
                  )
                }
                className="w-full mb-1 text-center bg-transparent border-b border-white/20 focus:outline-none"
              />
              {i.category && (
                <p className="text-xs text-center mb-1 opacity-80">{i.category}</p>
              )}
              {i.description && (
                <p className="text-[10px] text-center mb-2 opacity-60 line-clamp-2">
                  {i.description}
                </p>
              )}
              <input
                type="number"
                value={i.price}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it) =>
                      it.id === i.id
                        ? { ...it, price: parseFloat(e.target.value) }
                        : it
                    )
                  )
                }
                className="w-full mb-2 text-center bg-transparent border-b border-white/20 focus:outline-none"
              />
              <div className="flex justify-between text-xs">
                <button
                  onClick={() => handleToggle(i)}
                  className="px-2 py-1 rounded bg-white/20"
                >
                  {i.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleSave(i)}
                  className="px-2 py-1 rounded bg-[var(--color-primary)] text-black"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
