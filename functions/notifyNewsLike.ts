import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (event.type !== 'update' || !data || !old_data) {
      return Response.json({ success: true, message: 'No action needed' });
    }

    // Check if likes array was updated
    const oldLikes = old_data.likes || [];
    const newLikes = data.likes || [];

    if (newLikes.length <= oldLikes.length) {
      return Response.json({ success: true, message: 'No new likes' });
    }

    // Find the new liker
    const newLikerEmail = newLikes.find(email => !oldLikes.includes(email));
    
    if (!newLikerEmail || newLikerEmail === data.author_email) {
      return Response.json({ success: true, message: 'Self-like or no new liker' });
    }

    // Get liker info
    const likerUsers = await base44.asServiceRole.entities.User.filter({ email: newLikerEmail });
    const liker = likerUsers[0];

    // Create notification for post author
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: data.author_email,
      type: 'post_like',
      title: 'Post Liked',
      message: `${liker?.full_name || 'Someone'} liked your news post "${data.title}"`,
      reference_type: 'post',
      reference_id: event.entity_id,
      sender_email: newLikerEmail,
      sender_name: liker?.full_name,
      sender_photo: liker?.profile_picture,
      action_url: `/CommunityNews?post=${event.entity_id}`
    });

    return Response.json({ success: true, message: 'Like notification sent' });
  } catch (error) {
    console.error('Error in notifyNewsLike:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});