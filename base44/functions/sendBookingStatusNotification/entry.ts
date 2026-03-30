import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { bookingId, status, customerEmail, providerEmail, bookingTitle } = await req.json();

    if (!bookingId || !status || !customerEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const statusMessages = {
      confirmed: {
        title: '✅ Booking Confirmed',
        message: `Your booking "${bookingTitle}" has been confirmed!`,
        type: 'booking_confirmed'
      },
      cancelled: {
        title: '❌ Booking Cancelled',
        message: `Your booking "${bookingTitle}" has been cancelled.`,
        type: 'order_update'
      },
      rescheduled: {
        title: '📅 Booking Rescheduled',
        message: `Your booking "${bookingTitle}" has been rescheduled. Check details for new time.`,
        type: 'order_update'
      },
      pending: {
        title: '⏳ Booking Pending',
        message: `Your booking "${bookingTitle}" is pending confirmation.`,
        type: 'order_update'
      },
      completed: {
        title: '✨ Booking Completed',
        message: `Your booking "${bookingTitle}" is complete. Please leave a review!`,
        type: 'order_update'
      }
    };

    const notification = statusMessages[status] || statusMessages.pending;

    // Send notification to customer
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: customerEmail,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      reference_type: 'booking',
      reference_id: bookingId,
      sender_email: providerEmail,
      read: false,
      action_url: `/customer-bookings?booking=${bookingId}`
    });

    // Send push notification if user has enabled them
    try {
      await base44.asServiceRole.functions.invoke('sendPushNotification', {
        userEmail: customerEmail,
        title: notification.title,
        message: notification.message,
        data: {
          type: 'booking_update',
          bookingId,
          status
        }
      });
    } catch (pushError) {
      console.log('Push notification failed (user may not have enabled):', pushError.message);
    }

    return Response.json({ 
      success: true, 
      message: 'Notification sent successfully' 
    });

  } catch (error) {
    console.error('Send booking notification error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});