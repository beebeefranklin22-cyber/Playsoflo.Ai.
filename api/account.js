import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireUser } from './_lib/auth.js';

// Deleting a user's own auth.users row (and therefore their session) can
// only be done with the admin API, which requires the service-role key —
// a plain client can delete their profile row but not their actual auth
// account.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  if (!req.body?.confirm) return res.status(400).json({ error: 'confirm is required' });

  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ success: true });
}
