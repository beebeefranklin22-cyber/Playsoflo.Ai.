import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { provider_email, notification_type, data } = await req.json();

    if (!provider_email || !notification_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load provider notification preferences
    const preferences = await base44.asServiceRole.entities.NotificationPreferences.filter({
      user_email: provider_email
    });
    const prefs = preferences[0] || {};

    // Create in-app notification
    const shouldSendApp = prefs[`${notification_type}_app`] !== false;
    if (shouldSendApp) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: provider_email,
        type: notification_type,
        title: data.title || 'New Notification',
        message: data.message || '',
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        sender_email: data.sender_email,
        sender_name: data.sender_name,
        read: false
      });
    }

    // Send email notification if enabled
    const shouldSendEmail = prefs[`${notification_type}_email`] !== false;
    if (shouldSendEmail && data.email_subject && data.email_body) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: provider_email,
        subject: data.email_subject,
        body: data.email_body,
        from_name: 'SoFlo Platform'
      });
    }

    return Response.json({ 
      success: true,
      sent_app: shouldSendApp,
      sent_email: shouldSendEmail
    });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});