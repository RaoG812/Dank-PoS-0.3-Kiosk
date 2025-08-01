import { getClientSupabaseClient } from '@/lib/supabase/client';
import { AppSettings } from '@/types';

export const APP_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export const fetchAppSettings = async (shopId: string): Promise<AppSettings | null> => {
  const supabase = getClientSupabaseClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', APP_SETTINGS_ID)
    .eq('shop_id', shopId)
    .single();
  if (error) {
    console.error('Error fetching app settings:', error);
    return null;
  }
  return data as AppSettings;
};

export const upsertAppSettings = async (settings: Partial<AppSettings> & { shop_id: string }): Promise<AppSettings | null> => {
  const supabase = getClientSupabaseClient();
  const { data, error } = await supabase
    .from('app_settings')
    .upsert({ id: APP_SETTINGS_ID, ...settings }, { onConflict: 'id' })
    .select()
    .single();
  if (error) {
    console.error('Error saving app settings:', error);
    return null;
  }
  return data as AppSettings;
};
