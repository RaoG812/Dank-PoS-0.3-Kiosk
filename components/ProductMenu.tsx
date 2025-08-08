'use client';
import { useEffect, useState } from 'react';
import AIConsultant from './AIConsultant';
import { getClientSupabaseClient, restoreSupabaseClient } from '../lib/supabase/client';
import { generateStrainImage } from '../lib/gemini';
import { MessageCircle } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

export default function ProductMenu() {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showPictures, setShowPictures] = useState(true);
  const [showAttributes, setShowAttributes] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('kioskSettings');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        if (typeof s.showPictures === 'boolean') setShowPictures(s.showPictures);
        if (typeof s.showAttributes === 'boolean') setShowAttributes(s.showAttributes);
      } catch {}
    }

    restoreSupabaseClient();
    const supabase = getClientSupabaseClient();
    supabase
      .from('kiosk_items')
      .select('id, name, display_name, price, image_url')
      .eq('enabled', true)
      .then(({ data }) => {
        if (data)
          setItems(
            (data as any[]).map((i) => ({
              id: i.id,
              name: i.display_name || i.name,
              price: i.price || 0,
              image_url: i.image_url || null,
            }))
          );
      });
  }, []);

  const handleGenerateImage = async (item: Item) => {
    try {
      setLoadingId(item.id);
      const base64 = await generateStrainImage(item.name);
      if (!base64) throw new Error('No image data returned');

      const supabase = getClientSupabaseClient();
      const filePath = `strain-images/${item.id}.png`;

      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      const { error: uploadError } = await supabase.storage
        .from('strain-images')
        .upload(filePath, blob, { upsert: true, contentType: 'image/png' });
      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('strain-images')
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      await supabase
        .from('kiosk_items')
        .update({ image_url: publicUrl })
        .eq('id', item.id);
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

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar grid grid-cols-3 gap-6">
        {items.map((i) => (
          <div key={i.id} className="bg-[var(--color-bg-secondary)] rounded-lg p-4 flex flex-col items-center shadow-lg">
            {showPictures && (
              i.image_url ? (
                <img
                  src={i.image_url}
                  alt={i.name}
                  className="mb-2 w-full h-48 object-cover rounded"
                />
              ) : (
                <button
                  onClick={() => handleGenerateImage(i)}
                  disabled={loadingId === i.id}
                  className="mb-2 w-full h-48 flex items-center justify-center bg-[var(--color-bg-primary)] text-sm text-[var(--color-primary)] border border-dashed border-[var(--color-border)] rounded cursor-pointer"
                >
                  {loadingId === i.id ? 'Generating...' : 'Generate Image'}
                </button>
              )
            )}
            <p className="text-xl font-semibold">{i.name}</p>
            {showAttributes && (
              <p className="text-[var(--color-primary)] text-lg">${i.price.toFixed(2)}</p>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="col-span-3 text-center text-lg text-[var(--color-text-secondary)]">No items available.</p>
        )}
      </div>

      {showAI && (
        <div className="absolute bottom-20 right-4 bg-[var(--color-bg-secondary)] p-4 rounded-lg shadow-lg w-80">
          <AIConsultant items={items} />
        </div>
      )}

      <button
        onClick={() => setShowAI((v) => !v)}
        className={`fixed bottom-4 right-4 p-4 rounded-full bg-[var(--color-primary)] text-black shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_var(--color-primary)] active:scale-95 ${showAI ? '' : 'animate-pulse'}`}
        aria-label="AI Consultant"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}
