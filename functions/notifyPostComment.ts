import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create' || !data) {
      return Response.json({ success: true, message: 'No action needed' });
    }

    // Get the post to find the author
    const posts = await base44.asServiceRole.entities.SocialPost.filter({ id: data.post_id });
    
    if (posts.length === 0) {
      return Response.json({ success: true, message: 'Post not found' });
    }

    const post = posts[0];

    // Don't notify if commenter is the post author
    if (post.created_by === data.commenter_email) {
      return Response.json({ success: true, message: 'Self-comment, no notification' });
    }

    // Create notification for post author
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: post.created_by,
      type: 'new_comment',
      title: 'New Comment',
      message: `${data.commenter_name || 'Someone'} commented on your post`,
      reference_type: 'post',
      reference_id: data.post_id,
      sender_email: data.commenter_email,
      sender_name: data.commenter_name,
      sender_photo: data.commenter_profile_picture,
      action_url: `/Home?post=${data.post_id}`,
      metadata: {
        post_id: data.post_id,
        comment_id: event.entity_id
      }
    });

    return Response.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error in notifyPostComment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});