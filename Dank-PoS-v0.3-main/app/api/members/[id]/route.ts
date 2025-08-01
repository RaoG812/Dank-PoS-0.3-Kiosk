import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server'; // <--- UPDATED IMPORT to use server client

// DELETE a specific member by ID
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
  }

  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient()
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error (DELETE member):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Member deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('API error (DELETE member):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
