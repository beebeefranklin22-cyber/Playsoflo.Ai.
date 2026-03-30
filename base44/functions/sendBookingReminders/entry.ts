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
        // Send reminder to customer via sendBookingNotification (includes email)
        await base44.asServiceRole.functions.invoke('sendBookingNotification', {
          recipientEmail: booking.customer_email,
          type: 'booking_reminder',
          bookingId: booking.id,
          bookingTitle: booking.service_title,
          bookingDate: booking.booking_date,
          bookingTime: booking.booking_time,
          providerName: booking.provider_name,
          totalPrice: booking.total_price
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