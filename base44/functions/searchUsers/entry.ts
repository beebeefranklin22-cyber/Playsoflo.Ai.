import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // No auth check — this is needed for profile pages to work for any visitor
    // The data returned is non-sensitive public profile info only

    const body = await req.json();
    const { query, id } = body;

    // Direct ID lookup (fastest path, used by UserProfile page)
    if (id) {
      const users = await base44.asServiceRole.entities.User.filter({ id });
      return Response.json({ users: (users || []).slice(0, 1).map(sanitize) });
    }

    if (!query || query.length < 1) {
      return Response.json({ users: [] });
    }

    const term = query.toLowerCase().trim();

    // Fetch in batches to ensure we get all users
    let allUsers = [];
    const batchSize = 500;
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.User.list('-created_date', batchSize, skip);
      if (!batch || batch.length === 0) break;
      allUsers = allUsers.concat(batch);
      if (batch.length < batchSize) break;
      skip += batchSize;
      if (allUsers.length >= 5000) break; // safety cap
    }

    const termNoAt = term.replace('@', '');
    const results = allUsers
      .filter(u => {
        const name = (u.full_name || '').toLowerCase();
        const username = (u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const emailPrefix = email.split('@')[0];
        const uid = (u.id || '').toLowerCase();
        return (
          name.includes(termNoAt) ||
          username.includes(termNoAt) ||
          email.includes(term) ||
          emailPrefix.includes(termNoAt) ||
          uid === term
        );
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
    profile_photo: u.profile_photo,
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
    is_creator: u.is_creator,
    is_provider: u.is_provider,
    is_driver: u.is_driver,
    city: u.city,
    role: u.role,
  };
}