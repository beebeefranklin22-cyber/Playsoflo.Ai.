import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    // Only fire for newly published content (status === 'published')
    if (!data || data.status !== 'published') {
      return Response.json({ skipped: true, reason: 'Not a published content event' });
    }

    const content = data;
    const creatorEmail = content.creator_email || content.created_by;

    if (!creatorEmail) {
      return Response.json({ skipped: true, reason: 'No creator email found' });
    }

    // Find all followers of this creator
    const follows = await base44.asServiceRole.entities.Follow.filter({
      following_email: creatorEmail
    });

    if (!follows || follows.length === 0) {
      return Response.json({ success: true, notified: 0 });
    }

    // Get creator info for a friendly name
    const creatorName = content.creator_username || creatorEmail.split('@')[0];
    const contentTitle = content.title || 'New Video';
    const contentType = content.is_live ? 'gone live' : 'uploaded a new video';

    // Create a notification for each follower
    const notifications = follows.map(follow => ({
      recipient_email: follow.follower_email,
      type: 'new_message',
      title: `${creatorName} ${contentType}`,
      message: `"${contentTitle}" is now available on the streaming hub.`,
      reference_type: 'post',
      reference_id: content.id,
      sender_email: creatorEmail,
      sender_name: creatorName,
      sender_photo: content.thumbnail_url || '',
      read: false,
      action_url: `/Streaming?content=${content.id}`,
    }));

    // Bulk create notifications in batches of 50
    const batchSize = 50;
    let totalCreated = 0;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      await base44.asServiceRole.entities.Notification.bulkCreate(batch);
      totalCreated += batch.length;
    }

    return Response.json({ success: true, notified: totalCreated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});