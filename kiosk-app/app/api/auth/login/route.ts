import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Import cookies to set them
import { getDefaultSupabase } from '../../../../lib/supabase/server';
import { AdminUser, Shop } from '../../../../types';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const defaultSupabase = getDefaultSupabase();
        const { uid, username, password } = await request.json();

        // Ensure at least one login method is provided
        if (!uid && (!username || !password)) {
            return NextResponse.json({ error: 'NFC UID or Username and Password are required for login.' }, { status: 400 });
        }

        let user: AdminUser | null = null;
        let userFetchError: any = null;

        if (uid) {
            // Attempt to log in via NFC UID
            const { data, error } = await defaultSupabase
                .from('admin_users')
                .select('*') // Select all columns, but we won't compare password_hash for UID login
                .eq('uid', uid)
                .limit(1);
            
            if (error) {
                userFetchError = error;
            } else if (data && data.length > 0) {
                user = data[0] as AdminUser;
            }

            if (!user) {
                return NextResponse.json({ error: 'Invalid NFC UID.' }, { status: 401 });
            }

            // If user found by UID, consider them authenticated for NFC.
            // No password comparison is needed for NFC login as per the requirement.
        } else if (username && password) {
            // Attempt to log in via Username and Password
            const { data, error } = await defaultSupabase
                .from('admin_users')
                .select('*, password_hash') // Select password_hash for comparison
                .eq('username', username)
                .limit(1);

            if (error) {
                userFetchError = error;
            } else if (data && data.length > 0) {
                user = data[0] as AdminUser;
            }

            if (!user || !user.password_hash) {
                return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
            }

            // Compare the provided password with the stored hash
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
            }
        } else {
            // This case should ideally be caught by the initial check, but as a fallback
            return NextResponse.json({ error: 'Invalid login attempt.' }, { status: 400 });
        }

        // Handle any Supabase fetch errors that might have occurred in either path
        if (userFetchError) {
            console.error('Supabase error during user fetch for login:', userFetchError);
            return NextResponse.json({ error: userFetchError.message }, { status: 500 });
        }

        // If no user was found by either method after all checks
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
        }

        // Now, fetch the shop details using the defaultSupabase client
        const { data: shopData, error: shopError } = await defaultSupabase
            .from('shops')
            .select('supabase_url, supabase_anon_key, name') // Also select name
            .eq('id', user.shop_id) // Assuming user.shop_id matches shop.id
            .single();

        if (shopError) {
            console.error('Supabase error fetching shop details:', shopError);
            return NextResponse.json({ error: 'Failed to retrieve shop details.' }, { status: 500 });
        }

        if (!shopData) {
            return NextResponse.json({ error: 'Shop not found for this user.' }, { status: 404 });
        }

        // --- IMPORTANT: Set secure HTTP-only cookies for the shop's credentials ---
        cookies().set('supabase_url', shopData.supabase_url, {
            path: '/', // Make the cookie available across your application
            httpOnly: true, // Prevent client-side JavaScript access
            secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
            sameSite: 'strict', // Protect against CSRF attacks
            maxAge: 60 * 60 * 24 // Cookie expires in 24 hours
        });
        cookies().set('supabase_anon_key', shopData.supabase_anon_key, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 // Cookie expires in 24 hours
        });
        // --- END OF COOKIE SETTING ---

        // Login successful
        // Return user data along with shop credentials (excluding sensitive info like password_hash and plain password)
        const { password_hash, ...restUser } = user; // Exclude password_hash from response
        return NextResponse.json({
            ...restUser,
            // You can still return these to the client for client-side Supabase initialization
            supabase_url: shopData.supabase_url,
            supabase_anon_key: shopData.supabase_anon_key,
            shop_name: shopData.name // Return shop name
        }, { status: 200 });

    } catch (error: any) {
        console.error('API error during login:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}
