import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, email_type } = await req.json();

    // Fetch booking details
    const bookings = await base44.entities.Booking.filter({ id: booking_id });
    if (bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    // Fetch property details
    const properties = await base44.entities.Property.filter({ id: booking.experience_id });
    const property = properties[0];

    // Fetch host details
    const hosts = await base44.entities.User.filter({ email: booking.provider_email });
    const host = hosts[0];

    // Fetch guest details
    const guests = await base44.entities.User.filter({ email: booking.created_by });
    const guest = guests[0];

    let subject = '';
    let body = '';

    if (email_type === 'confirmation') {
      // Send to guest
      subject = `Booking Confirmation - ${booking.experience_title}`;
      body = `
Hello ${guest.full_name},

Your booking has been confirmed!

Property: ${booking.experience_title}
Check-in: ${new Date(booking.booking_date).toLocaleDateString()}
Check-out: ${booking.checkout_date ? new Date(booking.checkout_date).toLocaleDateString() : 'N/A'}
Guests: ${booking.number_of_guests}
Total: $${booking.total_price_usd}

Confirmation Code: ${booking.confirmation_code}

Host: ${host.full_name}

Special requests: ${booking.special_requests || 'None'}

We look forward to hosting you!

Best regards,
The Property Team
      `;

      await base44.integrations.Core.SendEmail({
        to: booking.created_by,
        subject,
        body
      });

      // Send to host
      const hostSubject = `New Booking - ${booking.experience_title}`;
      const hostBody = `
Hello ${host.full_name},

You have a new booking!

Property: ${booking.experience_title}
Guest: ${guest.full_name}
Check-in: ${new Date(booking.booking_date).toLocaleDateString()}
Check-out: ${booking.checkout_date ? new Date(booking.checkout_date).toLocaleDateString() : 'N/A'}
Guests: ${booking.number_of_guests}
Total: $${booking.total_price_usd}

Confirmation Code: ${booking.confirmation_code}

Special requests: ${booking.special_requests || 'None'}

Please prepare for your guest's arrival.

Best regards,
The Property Team
      `;

      await base44.integrations.Core.SendEmail({
        to: booking.provider_email,
        subject: hostSubject,
        body: hostBody
      });

    } else if (email_type === 'reminder') {
      // Send reminder to guest
      subject = `Upcoming Stay Reminder - ${booking.experience_title}`;
      body = `
Hello ${guest.full_name},

This is a reminder about your upcoming stay!

Property: ${booking.experience_title}
Check-in: ${new Date(booking.booking_date).toLocaleDateString()} at 3:00 PM
Check-out: ${booking.checkout_date ? new Date(booking.checkout_date).toLocaleDateString() : 'N/A'} at 11:00 AM

Confirmation Code: ${booking.confirmation_code}

Host Contact: ${host.full_name} (${booking.provider_email})

Looking forward to your arrival!

Best regards,
The Property Team
      `;

      await base44.integrations.Core.SendEmail({
        to: booking.created_by,
        subject,
        body
      });

    } else if (email_type === 'cancellation') {
      // Send to both guest and host
      subject = `Booking Cancelled - ${booking.experience_title}`;
      body = `
Hello ${guest.full_name},

Your booking has been cancelled.

Property: ${booking.experience_title}
Check-in Date: ${new Date(booking.booking_date).toLocaleDateString()}
Cancellation Fee: $${booking.cancellation_fee || 0}
Refund Amount: $${(booking.total_price_usd || 0) - (booking.cancellation_fee || 0)}

${booking.cancellation_reason ? `Reason: ${booking.cancellation_reason}` : ''}

Your refund will be processed within 5-7 business days.

Best regards,
The Property Team
      `;

      await base44.integrations.Core.SendEmail({
        to: booking.created_by,
        subject,
        body
      });

      // Notify host
      const hostBody = `
Hello ${host.full_name},

A booking for your property has been cancelled.

Property: ${booking.experience_title}
Guest: ${guest.full_name}
Check-in Date: ${new Date(booking.booking_date).toLocaleDateString()}

${booking.cancellation_reason ? `Reason: ${booking.cancellation_reason}` : ''}

Best regards,
The Property Team
      `;

      await base44.integrations.Core.SendEmail({
        to: booking.provider_email,
        subject: `Booking Cancelled - ${booking.experience_title}`,
        body: hostBody
      });
    }

    return Response.json({ 
      success: true,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Error sending booking email:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});