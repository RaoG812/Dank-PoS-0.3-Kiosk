import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { generateStrainImage } from '@/lib/gemini';

export async function POST(req: Request) {
  const supabase = getServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { strain, price } = await req.json();
  if (!strain || !price) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const imageUrl = await generateStrainImage(strain);
    await supabase.from('strain_images').insert({
      user_id: user.id,
      strain_name: strain,
      image_url: imageUrl
    });
    const { data, error } = await supabase.from('kiosk_items').insert({
      name: strain,
      price,
      image_url: imageUrl
    }).select('*').single();
    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add item' }, { status: 500 });
  }
}
