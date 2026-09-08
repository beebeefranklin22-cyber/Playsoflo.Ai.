import { createClient } from '@supabase/supabase-js';

let client = null;

// Service-role Supabase client for server-side use only (inside /api/*.js).
// Never import this from src/ — the service role key must never reach the
// browser bundle.
export function getSupabaseAdmin() {
  if (client) return client;

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL must be configured on the server');
  }

  client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
