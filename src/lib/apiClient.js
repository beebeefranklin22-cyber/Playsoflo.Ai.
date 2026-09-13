import { supabase } from './supabaseClient';

// For call sites that need to keep their own fetch/response handling (custom
// error shapes, non-JSON-throwing behavior, etc.) but still must attach the
// caller's identity now that their target endpoint requires requireUser().
// Returns {} if signed out -- the server will correctly reject with 401
// rather than this silently omitting the header.
export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

// Builds a Supabase Edge Function URL, stripping any trailing slash from
// VITE_SUPABASE_URL first -- a trailing slash there produces a double slash
// (".co//functions/v1/...") that fails CORS preflight against the function.
export function getEdgeFunctionUrl(name) {
  const base = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/functions/v1/${name}`;
}

// Calls one of our own /api/*.js serverless functions, attaching the
// current Supabase session's access token so the server can verify who is
// actually calling (never trust a client-supplied email/id for identity).
export async function callSecureApi(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in to do this');

  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(json.error || `Request to ${path} failed (${res.status})`);
  }
  return json;
}
