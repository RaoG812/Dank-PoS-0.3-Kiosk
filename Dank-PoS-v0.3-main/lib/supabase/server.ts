// lib/supabase/server.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers'; // This can ONLY be imported in server environments

/**
 * Gets a Supabase client instance for a specific shop's database
 * by reading credentials from HTTP-only cookies in the current server request.
 * This is for server-side operations (API routes, server components).
 * @returns The SupabaseClient instance for the correct shop, or the default client if no shop credentials are found.
 */
export const getServerSupabaseClient = (): SupabaseClient => {
  const cookieStore = cookies(); // Access the cookie store for the current request
  const url = cookieStore.get('supabase_url')?.value;
  const anonKey = cookieStore.get('supabase_anon_key')?.value;

  if (url && anonKey) {
    // Create a new client instance for each request that has shop credentials
    return createClient(url, anonKey);
  } else {
    // Fallback to default Supabase if shop-specific credentials are not found in cookies.
    // This handles scenarios like initial login where cookies aren't set yet,
    // or unauthenticated requests hitting your API routes.
    const defaultSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const defaultSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!defaultSupabaseUrl || !defaultSupabaseAnonKey) {
      throw new Error('Default Supabase environment variables are missing for server client.');
    }
    // Create default client for requests without specific shop credentials
    return createClient(defaultSupabaseUrl, defaultSupabaseAnonKey);
  }
};

// This default client is specifically for operations that *must* use the host database,
// like the login route for fetching shop credentials based on user info.
export const defaultSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
