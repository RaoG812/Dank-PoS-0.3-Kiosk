// lib/supabase/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let clientSupabase: SupabaseClient | null = null;
let defaultClientSupabase: SupabaseClient | null = null; // NEW: Variable for the default client
/**
 * Restores a previously saved shop-specific Supabase client from localStorage.
 * If the client has already been initialized this is a no-op.
 */
export const restoreSupabaseClient = () => {
  if (!clientSupabase && typeof window !== 'undefined') {
    const url = localStorage.getItem('supabaseUrl');
    const key = localStorage.getItem('supabaseAnonKey');
    if (url && key) {
      clientSupabase = createClient(url, key);
    }
  }
};

/**
 * Initializes the client-side Supabase client with the given URL and Anon Key.
 * This should be called once on the client (e.g., in your `app/page.tsx`)
 * after a user successfully logs in and you receive the shop's credentials.
 * @param url The Supabase URL for the shop's database.
 * @param anonKey The Supabase Anon Key for the shop's database.
 */
export const initializeSupabaseClient = (url: string, anonKey: string) => {
  if (!url || !anonKey) {
    throw new Error('Supabase URL and Anon Key are required for client initialization.');
  }
  clientSupabase = createClient(url, anonKey);
};

/**
 * Gets the current client-side Supabase client instance for the *logged-in shop*.
 * If the shop-specific client hasn't been explicitly initialized yet, it falls back
 * to the default (host) client.
 * @returns The SupabaseClient instance.
 */
export const getClientSupabaseClient = (): SupabaseClient => {
  if (!clientSupabase) {
    // If shop-specific client hasn't been initialized (e.g., before login),
    // return the default (host) client.
    return getDefaultClientSupabase();
  }
  return clientSupabase;
};

/**
 * NEW FUNCTION: Gets a Supabase client instance connected to the *default (host)* database.
 * This is useful for global settings or authentication flows that always target the host DB.
 * @returns The SupabaseClient instance connected to the default database.
 */
export const getDefaultClientSupabase = (): SupabaseClient => {
  if (!defaultClientSupabase) {
    const defaultSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const defaultSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!defaultSupabaseUrl || !defaultSupabaseAnonKey) {
      throw new Error('Default Supabase environment variables are missing for client.');
    }
    defaultClientSupabase = createClient(defaultSupabaseUrl, defaultSupabaseAnonKey);
  }
  return defaultClientSupabase;
};
