import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { 
      recipientEmail, 
      type, 
      bookingId, 
      bookingTitle,
      bookingDate,
      bookingTime,
      providerName,
      customerName,
      totalPrice
    } = await req.json();

    if (!recipientEmail || !type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create notification based on type
    let title = '';
    let message = '';
    let actionUrl = '';

    switch (type) {
      case 'booking_confirmed':
        title = '✅ Booking Confirmed';
        message = `Your booking for "${bookingTitle}" on ${new Date(bookingDate).toLocaleDateString()} at ${bookingTime} has been confirmed.`;
        actionUrl = '/CustomerBookings';
        break;
      
      case 'new_booking':
        title = '🎉 New Booking Request';
        message = `${customerName} requested a booking for "${bookingTitle}" on ${new Date(bookingDate).toLocaleDateString()} at ${bookingTime}`;
        actionUrl = '/ProviderHub';
        break;
      
      case 'booking_cancelled':
        title = '❌ Booking Cancelled';
        message = `The booking for "${bookingTitle}" on ${new Date(bookingDate).toLocaleDateString()} has been cancelled.`;
        actionUrl = '/CustomerBookings';
        break;
      
      case 'booking_reminder':
        title = '⏰ Upcoming Appointment';
        message = `Reminder: Your appointment for "${bookingTitle}" is scheduled for ${new Date(bookingDate).toLocaleDateString()} at ${bookingTime}`;
        actionUrl = '/CustomerBookings';
        break;
      
      case 'payment_completed':
        title = '💳 Payment Successful';
        message = `Payment of $${totalPrice} for "${bookingTitle}" was successful.`;
        actionUrl = '/Wallet';
        break;
      
      case 'payment_received':
        title = '💰 Payment Received';
        message = `You received $${totalPrice} for "${bookingTitle}" from ${customerName}`;
        actionUrl = '/ProviderHub?tab=earnings';
        break;

      default:
        title = 'Notification';
        message = 'You have a new notification';
    }

    // Create notification in database
    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email: recipientEmail,
      type: type,
      title: title,
      message: message,
      reference_type: 'booking',
      reference_id: bookingId,
      sender_name: type.includes('new_booking') || type.includes('payment_received') ? customerName : providerName,
      read: false,
      action_url: actionUrl
    });

    console.log('✅ Notification created:', notification.id);

    return Response.json({ 
      success: true, 
      notification_id: notification.id 
    });

  } catch (error) {
    console.error('❌ Notification error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});