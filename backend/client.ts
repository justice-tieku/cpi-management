import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Load Supabase URL and Public Anon/Publishable Key from Vite environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

if (!isSupabaseConfigured) {
  console.info(
    '[CPI Backend] Supabase credentials not detected or using placeholder. Running in offline/local mock mode. Populate VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file to activate the cloud backend.'
  );
}

// Typed Supabase Client
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

export default supabase;
