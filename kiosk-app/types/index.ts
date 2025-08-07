export interface AdminUser {
  id: string;
  uid?: string;
  username?: string;
  password_hash?: string;
  shop_id?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
}

export interface Shop {
  id: string;
  name: string;
  supabase_url: string;
  supabase_anon_key: string;
}
