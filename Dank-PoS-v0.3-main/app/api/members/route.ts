import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server'; // <--- UPDATED IMPORT to use server client
import { Member } from '@/types';

// GET all members
export async function GET(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient()
    const { data, error } = await supabase.from('members').select('*');

    if (error) {
      console.error('Supabase error (GET members):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API error (GET members):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST a new member
export async function POST(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient()
    const member: Member = await request.json();

    // Ensure member ID is present; if not, generate one (though client-side should handle this)
    if (!member.id) {
        member.id = crypto.randomUUID();
    }
    // Ensure total_purchases is initialized if not provided
    if (typeof member.total_purchases === 'undefined' || member.total_purchases === null) {
        member.total_purchases = 0;
    }

    const { data, error } = await supabase
      .from('members')
      .insert([member])
      .select();

    if (error) {
      console.error('Supabase error (POST member):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    console.error('API error (POST member):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// PUT to update existing members (upsert)
export async function PUT(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient()
    const membersToUpdate: Member[] = await request.json();

    if (!Array.isArray(membersToUpdate) || membersToUpdate.length === 0) {
      return NextResponse.json({ error: 'An array of members is required for PUT operation.' }, { status: 400 });
    }

    // Ensure total_purchases is handled correctly for each member in the upsert
    const processedMembers = membersToUpdate.map(member => ({
        ...member,
        total_purchases: typeof member.total_purchases === 'number' ? member.total_purchases : 0, // Ensure it's a number
    }));

    const { data, error } = await supabase
      .from('members')
      .upsert(processedMembers, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase error (PUT members):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('API error (PUT members):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
