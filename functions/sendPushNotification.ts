import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email, title, body, data, notification_type } = await req.json();

    // Fetch user to check notification preferences
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    const user = users[0];

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has this notification type enabled
    const prefs = user.notification_preferences || {};
    
    const typeMap = {
      'ride_request': prefs.ride_requests,
      'ride_update': prefs.ride_updates,
      'booking_request': prefs.booking_requests,
      'booking_update': prefs.booking_updates,
      'settlement': prefs.settlements,
      'message': prefs.messages,
      'social': prefs.social_interactions,
      'payment': prefs.payment_alerts,
      'system': prefs.system_updates
    };

    const isEnabled = typeMap[notification_type] !== false;

    // Create notification record
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email,
      title,
      message: body,
      type: notification_type,
      read: false,
      metadata: data
    });

    // Log notification creation
    console.log(`Notification created for ${user_email}: ${title}`);

    return Response.json({ 
      success: true,
      notification_id: notification.id,
      push_sent: isEnabled
    });

  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});