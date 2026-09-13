import { supabase } from './supabaseClient';

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
