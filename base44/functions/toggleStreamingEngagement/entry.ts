import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId, action } = await req.json();
    if (!contentId || !['like', 'watch_later', 'share'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const matches = await base44.asServiceRole.entities.StreamingContent.filter({ id: contentId });
    const content = matches?.[0];

    if (!content) {
      return Response.json({ error: 'Content not found' }, { status: 404 });
    }

    const updateData = {};
    let active = false;

    if (action === 'like') {
      const likedBy = Array.isArray(content.liked_by) ? content.liked_by : [];
      active = !likedBy.includes(user.email);
      const nextLikedBy = active ? [...likedBy, user.email] : likedBy.filter((email) => email !== user.email);
      updateData.liked_by = nextLikedBy;
      updateData.likes_count = nextLikedBy.length;
    }

    if (action === 'watch_later') {
      const savedBy = Array.isArray(content.saved_by) ? content.saved_by : [];
      active = !savedBy.includes(user.email);
      const nextSavedBy = active ? [...savedBy, user.email] : savedBy.filter((email) => email !== user.email);
      updateData.saved_by = nextSavedBy;
      updateData.saves_count = nextSavedBy.length;
    }

    if (action === 'share') {
      updateData.shares_count = (content.shares_count || 0) + 1;
      active = true;
    }

    await base44.asServiceRole.entities.StreamingContent.update(content.id, updateData);

    return Response.json({ success: true, action, active, update: updateData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});