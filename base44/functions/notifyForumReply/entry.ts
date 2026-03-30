import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create' || !data) {
      return Response.json({ success: true, message: 'No action needed' });
    }

    // Get the forum thread to find the author
    const threads = await base44.asServiceRole.entities.ForumThread.filter({ id: data.thread_id });
    
    if (threads.length === 0) {
      return Response.json({ success: true, message: 'Thread not found' });
    }

    const thread = threads[0];

    // Don't notify if replier is the thread author
    if (thread.author_email === data.author_email) {
      return Response.json({ success: true, message: 'Self-reply, no notification' });
    }

    // Create notification for thread author
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: thread.author_email,
      type: 'comment_reply',
      title: 'New Forum Reply',
      message: `${data.author_name || 'Someone'} replied to your forum thread "${thread.title}"`,
      reference_type: 'comment',
      reference_id: data.thread_id,
      sender_email: data.author_email,
      sender_name: data.author_name,
      sender_photo: data.author_photo,
      action_url: `/CommunityForums?thread=${data.thread_id}`,
      metadata: {
        thread_id: data.thread_id,
        reply_id: event.entity_id
      }
    });

    return Response.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error in notifyForumReply:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});