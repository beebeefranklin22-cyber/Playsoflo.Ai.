import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { 
      booking_id,
      notification_type, // 'new_booking', 'booking_reminder', 'booking_cancelled', 'booking_confirmed', 'booking_completed'
      provider_email,
      customer_email,
      service_title,
      booking_date,
      booking_time,
      total_price,
      confirmation_code,
      cancellation_reason
    } = payload;

    const notifications = [];

    // Provider Notifications
    if (notification_type === 'new_booking') {
      notifications.push({
        recipient_email: provider_email,
        type: 'booking_request',
        title: '🔔 New Booking Request',
        message: `New booking for ${service_title} on ${new Date(booking_date).toLocaleDateString()} at ${booking_time}`,
        action_url: '/ProviderHub?tab=requests',
        reference_type: 'booking',
        reference_id: booking_id,
        priority: 'high',
        read: false
      });

      // Send email to provider
      await base44.integrations.Core.SendEmail({
        to: provider_email,
        subject: `New Booking Request - ${service_title}`,
        body: `
          You have a new booking request!
          
          Service: ${service_title}
          Date: ${new Date(booking_date).toLocaleDateString()}
          Time: ${booking_time}
          Customer: ${customer_email}
          Total: $${total_price}
          Confirmation Code: ${confirmation_code}
          
          View and manage this booking in your Provider Hub.
        `
      });
    }

    // Customer Confirmation
    if (notification_type === 'booking_confirmed') {
      notifications.push({
        recipient_email: customer_email,
        type: 'booking_confirmed',
        title: '✅ Booking Confirmed',
        message: `Your booking for ${service_title} on ${new Date(booking_date).toLocaleDateString()} at ${booking_time} is confirmed!`,
        action_url: '/MyBookings',
        reference_type: 'booking',
        reference_id: booking_id,
        read: false
      });

      // Send email to customer
      await base44.integrations.Core.SendEmail({
        to: customer_email,
        subject: `Booking Confirmed - ${service_title}`,
        body: `
          Your booking is confirmed!
          
          Service: ${service_title}
          Date: ${new Date(booking_date).toLocaleDateString()}
          Time: ${booking_time}
          Total: $${total_price}
          Confirmation Code: ${confirmation_code}
          
          View your booking details in My Bookings.
        `
      });
    }

    // Upcoming Reminder (24 hours before)
    if (notification_type === 'booking_reminder') {
      notifications.push({
        recipient_email: customer_email,
        type: 'booking_reminder',
        title: '⏰ Appointment Tomorrow',
        message: `Reminder: ${service_title} tomorrow at ${booking_time}`,
        action_url: '/MyBookings',
        reference_type: 'booking',
        reference_id: booking_id,
        read: false
      });

      notifications.push({
        recipient_email: provider_email,
        type: 'booking_reminder',
        title: '⏰ Upcoming Appointment',
        message: `Reminder: ${service_title} tomorrow at ${booking_time} with ${customer_email}`,
        action_url: '/ProviderHub?tab=requests',
        reference_type: 'booking',
        reference_id: booking_id,
        read: false
      });

      // Send emails to both
      await base44.integrations.Core.SendEmail({
        to: customer_email,
        subject: `Reminder: Appointment Tomorrow - ${service_title}`,
        body: `
          This is a reminder for your upcoming appointment:
          
          Service: ${service_title}
          Date: ${new Date(booking_date).toLocaleDateString()}
          Time: ${booking_time}
          Confirmation Code: ${confirmation_code}
          
          See you tomorrow!
        `
      });

      await base44.integrations.Core.SendEmail({
        to: provider_email,
        subject: `Reminder: Appointment Tomorrow - ${service_title}`,
        body: `
          Upcoming appointment reminder:
          
          Service: ${service_title}
          Date: ${new Date(booking_date).toLocaleDateString()}
          Time: ${booking_time}
          Customer: ${customer_email}
          
          View details in your Provider Hub.
        `
      });
    }

    // Cancellation
    if (notification_type === 'booking_cancelled') {
      notifications.push({
        recipient_email: provider_email,
        type: 'booking_cancelled',
        title: '❌ Booking Cancelled',
        message: `Booking for ${service_title} on ${new Date(booking_date).toLocaleDateString()} has been cancelled${cancellation_reason ? `: ${cancellation_reason}` : ''}`,
        action_url: '/ProviderHub?tab=requests',
        reference_type: 'booking',
        reference_id: booking_id,
        read: false
      });

      notifications.push({
        recipient_email: customer_email,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Your booking for ${service_title} has been cancelled and refunded`,
        action_url: '/MyBookings',
        reference_type: 'booking',
        reference_id: booking_id,
        read: false
      });
    }

    // Service status updates
    if (notification_type === 'booking_completed') {
      notifications.push({
        recipient_email: customer_email,
        type: 'booking_completed',
        title: '🎉 Service Completed',
        message: `${service_title} has been completed. Please rate your experience!`,
        action_url: '/MyBookings',
        reference_type: 'booking',
        reference_id: booking_id,
        read: false
      });
    }

    // Create all notifications in parallel
    await Promise.all(
      notifications.map(notification => 
        base44.asServiceRole.entities.Notification.create(notification)
      )
    );

    return Response.json({ 
      success: true, 
      notifications_sent: notifications.length,
      message: 'Notifications sent successfully' 
    });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});