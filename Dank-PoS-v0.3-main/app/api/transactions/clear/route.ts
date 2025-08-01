// app/api/transactions/clear/route.ts

import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server'; // <--- UPDATED IMPORT to use server client

// DELETE all transactions
export async function DELETE(request: Request) {
    try {
        const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient()
        // 1. Parse the request body to get the credentials
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
        }

        // 2. Authenticate the user with Supabase
        // Note: For this to work, you need a way to manage your admin user
        // e.g., an "admin" role or a specific user account for this purpose.
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: username, // Supabase uses email for the username field
            password: password,
        });
        
        // This is a crucial security check
        if (authError || !authData.user) {
            console.error('Authentication error:', authError?.message);
            return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
        }
        
        // Optional but recommended: Check if the user has an 'admin' role
        // This requires you to have a 'roles' column in your public.users table or similar setup
        // if (authData.user.user_metadata.role !== 'admin') {
        //     await supabase.auth.signOut(); // Immediately sign them out
        //     return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
        // }

        // If authentication is successful, proceed with the deletion
        const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        // Immediately sign out the user after the action is complete
        await supabase.auth.signOut();

        if (deleteError) {
            console.error('Supabase error (DELETE ALL transactions):', deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'All transactions deleted successfully' }, { status: 200 });

    } catch (error: any) {
        // This catch block handles JSON parsing errors or other unexpected issues
        console.error('API error (DELETE ALL transactions):', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}
