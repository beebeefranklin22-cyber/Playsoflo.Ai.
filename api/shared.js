import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

// Deliberately NOT behind requireUser — anonymous visitors can open a
// share link, and the random token itself is the capability/authorization
// (same model as any "anyone with the link can view" share feature).
// Needs the service-role key to bypass the normal per-owner RLS on
// collaborative_documents, since the viewer isn't the document's owner.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body || {};
  if (!token) return res.status(200).json({ success: false, error: 'No share token provided' });

  const admin = getSupabaseAdmin();
  const { data: document, error } = await admin
    .from('collaborative_documents')
    .select('*')
    .eq('share_token', token)
    .maybeSingle();

  if (error || !document) return res.status(200).json({ success: false, error: 'Invalid share link' });
  if (document.share_expires_at && new Date(document.share_expires_at) < new Date()) {
    return res.status(200).json({ success: false, error: 'This share link has expired' });
  }

  return res.status(200).json({ success: true, document });
}
