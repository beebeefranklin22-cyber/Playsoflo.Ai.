import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { query } = body;

    if (!query || query.length < 1) {
      return Response.json({ users: [] });
    }

    const term = query.toLowerCase().replace('@', '').trim();

    // Use service role to bypass the admin-only restriction on User.list()
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);

    const results = allUsers
      .filter(u => {
        const name = (u.full_name || '').toLowerCase();
        const username = (u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes(term) || username.includes(term) || email.includes(term);
      })
      .map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        username: u.username,
        profile_picture: u.profile_picture,
      }))
      .slice(0, 20);

    return Response.json({ users: results });
  } catch (error) {
    console.error('searchUsers error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});