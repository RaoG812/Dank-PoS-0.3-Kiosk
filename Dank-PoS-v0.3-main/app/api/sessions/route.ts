// app/api/sessions/route.ts
import { NextResponse } from 'next/server';
// Import defaultSupabase which always connects to the host DB
import { defaultSupabase } from '@/lib/supabase/server'; 

export async function POST(request: Request) {
    try {
        const { userId, shopId, deviceInfo } = await request.json();
        const supabase = defaultSupabase; // Use defaultSupabase for host DB logging

        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'N/A';

        const { data, error } = await supabase
            .from('sessions_log')
            .insert([
                {
                    user_id: userId,
                    shop_id: shopId,
                    device_info: deviceInfo,
                    ip_address: ipAddress,
                    login_time: new Date().toISOString(),
                },
            ])
            .select();

        if (error) {
            console.error('Supabase error (POST sessions_log):', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data[0], { status: 201 });
    } catch (error: any) {
        console.error('API error (POST sessions_log):', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { sessionId, logoutTime } = await request.json();
        const supabase = defaultSupabase; // Use defaultSupabase for host DB logging

        const { data, error } = await supabase
            .from('sessions_log')
            .update({ logout_time: logoutTime || new Date().toISOString() })
            .eq('session_id', sessionId)
            .select();

        if (error) {
            console.error('Supabase error (PUT sessions_log):', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data[0], { status: 200 });
    } catch (error: any) {
        console.error('API error (PUT sessions_log):', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}
