import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js'; // <--- REMOVE THIS LINE
import { Invoice } from '@/types';
import { getServerSupabaseClient } from '@/lib/supabase/server'; // <--- CRUCIAL: Import the SERVER-SIDE client


export async function GET() {
    try {
        const supabase = getServerSupabaseClient(); // <--- Use the server-side client
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getServerSupabaseClient(); // <--- Use the server-side client
        const invoice: Invoice = await request.json();
        const { data, error } = await supabase
            .from('invoices')
            .insert(invoice)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
