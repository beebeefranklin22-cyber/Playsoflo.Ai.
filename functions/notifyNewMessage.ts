import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create' || !data) {
      return Response.json({ success: true, message: 'No action needed' });
    }

    // Create notification for message recipient
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: data.recipient_email,
      type: 'direct_message',
      title: 'New Message',
      message: `${data.sender_name || 'Someone'} sent you a message`,
      reference_type: 'direct_message',
      reference_id: data.conversation_id,
      sender_email: data.sender_email,
      sender_name: data.sender_name,
      sender_photo: data.sender_photo,
      action_url: `/Messages?conversation=${data.conversation_id}`,
      metadata: {
        conversation_id: data.conversation_id,
        message_id: event.entity_id,
        sender_email: data.sender_email
      }
    });

    return Response.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error in notifyNewMessage:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});