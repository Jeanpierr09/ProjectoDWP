import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';

// Verificación de variables de entorno en tiempo de construcción
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // No persistir sesión ya que es una app sin auth
      autoRefreshToken: false,
    },
    db: {
      schema: 'public'
    }
  }
);