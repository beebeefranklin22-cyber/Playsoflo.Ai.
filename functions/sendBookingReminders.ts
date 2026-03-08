import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// This function should be called daily (via cron job) to send reminders for bookings happening tomorrow
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Use service role for automated task
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    // Get all bookings for tomorrow that haven't been reminded yet
    const bookings = await base44.asServiceRole.entities.ServiceBooking.filter({
      booking_date: tomorrowDate,
      status: { $in: ['pending', 'confirmed'] },
      reminder_sent: false
    });

    let remindersSent = 0;

    // Send reminders for each booking
    for (const booking of bookings) {
      try {
        await base44.asServiceRole.functions.invoke('sendBookingNotifications', {
          booking_id: booking.id,
          notification_type: 'booking_reminder',
          provider_email: booking.provider_email,
          customer_email: booking.customer_email,
          service_title: booking.service_title,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          total_price: booking.total_price,
          confirmation_code: booking.confirmation_code
        });

        // Mark reminder as sent
        await base44.asServiceRole.entities.ServiceBooking.update(booking.id, {
          reminder_sent: true
        });

        remindersSent++;
      } catch (error) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, error);
      }
    }

    return Response.json({ 
      success: true,
      bookings_checked: bookings.length,
      reminders_sent: remindersSent
    });
  } catch (error) {
    console.error('Reminder service error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});