import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server'; // <--- IMPORTANT: Ensure you import from lib/supabase/server


export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Call inside the function
        const { error } = await supabase
            .from('invoices')
            .delete()
            .eq('id', params.id);

        if (error) throw error;
        return NextResponse.json({ message: 'Invoice deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Call inside the function
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
