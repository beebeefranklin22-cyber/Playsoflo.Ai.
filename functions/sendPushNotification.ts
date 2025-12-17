import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipient_email, title, message, type, reference_type, reference_id, priority } = await req.json();

    if (!recipient_email || !title || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create notification in database
    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email,
      type: type || 'system_alert',
      title,
      message,
      reference_type,
      reference_id,
      sender_email: user.email,
      sender_name: user.full_name,
      priority: priority || 'normal'
    });

    // In production, you would also send a push notification here
    // using a service like Firebase Cloud Messaging, OneSignal, or Web Push API
    // For now, the ServiceWorkerManager will poll for new notifications

    return Response.json({ 
      success: true, 
      notification_id: notification.id 
    });

  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});