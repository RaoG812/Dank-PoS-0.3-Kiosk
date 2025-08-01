import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server'; // <--- UPDATED IMPORT to server-side client
import { AdminUser } from '@/types';

// GET all admin users (RLS will automatically filter based on user role)
export async function GET(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- Use getServerSupabaseClient
    const { data, error } = await supabase
      .from('admin_users')
      .select('*');

    if (error) {
      console.error('Supabase error (GET admin_users):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter out passwords before sending
    const safeData = data.map(user => {
      const { password, ...rest } = user;
      return rest;
    });

    return NextResponse.json(safeData);
  } catch (error: any) {
    console.error('API error (GET admin_users):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST a new admin user (RLS will handle admin-only access)
export async function POST(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- Use getServerSupabaseClient
    const user: AdminUser = await request.json();

    if (!user.username && !user.uid) {
      return NextResponse.json({ error: 'Username or UID is required.' }, { status: 400 });
    }
    if (!user.password && user.username) {
      return NextResponse.json({ error: 'Password is required for username-based login.' }, { status: 400 });
    }
    if (!user.role) {
      user.role = 'staff'; // Changed to 'staff' to match the AdminUser interface
    }

    if (!user.id) {
      user.id = crypto.randomUUID();
    }

    const { data, error } = await supabase
      .from('admin_users')
      .insert([user])
      .select();

    if (error) {
      console.error('Supabase error (POST admin_users):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { password, ...rest } = data[0];
    return NextResponse.json(rest, { status: 201 });
  } catch (error: any) {
    console.error('API error (POST admin_users):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// PUT to update existing admin users (RLS will handle permissions)
export async function PUT(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- Use getServerSupabaseClient
    const usersToUpdate: AdminUser[] = await request.json();

    if (!Array.isArray(usersToUpdate) || usersToUpdate.length === 0) {
      return NextResponse.json({ error: 'An array of admin users is required for PUT operation.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('admin_users')
      .upsert(usersToUpdate, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase error (PUT admin_users):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const safeData = data.map(user => {
      const { password, ...rest } = user;
      return rest;
    });

    return NextResponse.json(safeData, { status: 200 });
  } catch (error: any) {
    console.error('API error (PUT admin_users):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
