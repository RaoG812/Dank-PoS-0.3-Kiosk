import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = getServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { item_id, quantity = 1, machine_id } = await req.json();
  if (!item_id || !machine_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  try {
    const { error } = await supabase.from('kiosk_orders').insert({
      item_id,
      quantity,
      machine_id,
      user_id: user.id
    });
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to place order' }, { status: 500 });
  }
}
