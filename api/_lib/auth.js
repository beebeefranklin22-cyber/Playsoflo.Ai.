import { getSupabaseAdmin } from './supabaseAdmin.js';

// Verifies the bearer token from the Authorization header against Supabase
// Auth and returns the real, server-verified caller. Every money-moving or
// privileged endpoint MUST use this instead of trusting a client-supplied
// email/id field for "who is calling".
export async function requireUser(req) {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    const err = new Error('Not authenticated');
    err.statusCode = 401;
    throw err;
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    const err = new Error('Invalid or expired session');
    err.statusCode = 401;
    throw err;
  }

  return { id: data.user.id, email: data.user.email };
}
