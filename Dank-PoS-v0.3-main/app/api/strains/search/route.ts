import { getServerSupabaseClient } from '@/lib/supabase/server'; // <--- UPDATED IMPORT to use server client
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient()
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '7');

    const { data, error } = await supabase
      .from('strains')
      .select('name, type, thc_level, description')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Strain search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
