import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This should be called by a cron job or admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    // Get all confirmed bookings with check-in in 2 days
    const allBookings = await base44.asServiceRole.entities.Booking.list();
    
    const upcomingBookings = allBookings.filter(booking => {
      if (booking.booking_status !== 'confirmed') return false;
      
      const checkInDate = new Date(booking.booking_date);
      checkInDate.setHours(0, 0, 0, 0);
      twoDaysFromNow.setHours(0, 0, 0, 0);
      
      return checkInDate.getTime() === twoDaysFromNow.getTime();
    });

    let sentCount = 0;
    for (const booking of upcomingBookings) {
      try {
        // Call the sendBookingEmails function
        await base44.asServiceRole.functions.invoke('sendBookingEmails', {
          booking_id: booking.id,
          email_type: 'reminder'
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, error);
      }
    }

    return Response.json({
      success: true,
      message: `Sent ${sentCount} reminders`,
      bookings_processed: upcomingBookings.length
    });

  } catch (error) {
    console.error('Error processing reminders:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});