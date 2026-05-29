import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // No auth check — this is needed for profile pages to work for any visitor
    // The data returned is non-sensitive public profile info only

    const body = await req.json();
    const { query, id } = body;

    // Direct ID lookup (fastest path, used by UserProfile page)
    if (id) {
      try {
        const user = await base44.asServiceRole.entities.User.get(id);
        if (user) {
          return Response.json({ users: [sanitize(user)] });
        }
      } catch {}
      return Response.json({ users: [] });
    }

    if (!query || query.length < 1) {
      return Response.json({ users: [] });
    }

    const term = query.toLowerCase().replace('@', '').trim();

    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);

    const results = allUsers
      .filter(u => {
        const name = (u.full_name || '').toLowerCase();
        const username = (u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const uid = (u.id || '').toLowerCase();
        return name.includes(term) || username.includes(term) || email.includes(term) || uid === term;
      })
      .map(sanitize)
      .slice(0, 20);

    return Response.json({ users: results });
  } catch (error) {
    console.error('searchUsers error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function sanitize(u) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    username: u.username,
    profile_picture: u.profile_picture,
    bio: u.bio,
    cover_image_url: u.cover_image_url,
    cover_video_url: u.cover_video_url,
    is_private: u.is_private,
    privacy_settings: u.privacy_settings,
    profile_customization: u.profile_customization,
    social_links: u.social_links,
    website: u.website,
    link_in_bio: u.link_in_bio,
    is_public_history: u.is_public_history,
    cover_photo: u.cover_photo,
    cover_url: u.cover_url,
  };
}