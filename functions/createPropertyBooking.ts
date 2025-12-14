import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      property_id,
      property_title,
      check_in_date,
      check_out_date,
      number_of_guests,
      special_requests,
      host_email
    } = body;

    if (!property_id || !check_in_date || !check_out_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate nights and total
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    // Get property details
    const properties = await base44.asServiceRole.entities.Property.filter({ id: property_id });
    if (properties.length === 0) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    const property = properties[0];
    const pricePerNight = property.price_per_night || 0;
    const totalPrice = pricePerNight * nights;

    // Check for overlapping bookings
    const existingBookings = await base44.asServiceRole.entities.Booking.filter({
      experience_id: property_id,
      booking_type: "property"
    });

    const hasOverlap = existingBookings.some((booking) => {
      if (booking.booking_status === "cancelled") return false;
      
      const existingCheckIn = new Date(booking.booking_date);
      const existingCheckOut = booking.checkout_date 
        ? new Date(booking.checkout_date) 
        : new Date(existingCheckIn);

      return (
        (checkIn >= existingCheckIn && checkIn <= existingCheckOut) ||
        (checkOut >= existingCheckIn && checkOut <= existingCheckOut) ||
        (checkIn <= existingCheckIn && checkOut >= existingCheckOut)
      );
    });

    if (hasOverlap) {
      return Response.json({ 
        error: 'These dates are already booked or pending. Please select different dates.' 
      }, { status: 400 });
    }

    // Generate confirmation code
    const confirmationCode = `BOOK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create booking
    const booking = await base44.asServiceRole.entities.Booking.create({
      experience_id: property_id,
      experience_title: property_title,
      booking_date: check_in_date,
      checkout_date: check_out_date,
      number_of_guests: number_of_guests || 1,
      total_price_usd: totalPrice,
      payment_method: "card",
      payment_status: "pending",
      booking_status: "pending",
      special_requests: special_requests || "",
      confirmation_code: confirmationCode,
      provider_email: host_email,
      booking_type: "property",
      created_by: user.email
    });

    // Send booking confirmation emails (async, don't block)
    setTimeout(async () => {
      try {
        await base44.asServiceRole.functions.invoke('sendBookingEmails', {
          booking_id: booking.id,
          email_type: 'confirmation'
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
    }, 100);

    // Notify host
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: host_email,
      type: "booking_request",
      title: "🏠 New Booking Request",
      message: `${user.full_name} requested to book ${property_title} from ${checkIn.toLocaleDateString()} to ${checkOut.toLocaleDateString()} (${nights} night${nights > 1 ? 's' : ''})`,
      reference_type: "booking",
      reference_id: booking.id,
      sender_email: user.email,
      sender_name: user.full_name,
      read: false
    });

    // Notify guest
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: "booking_confirmation",
      title: "🎉 Booking Request Submitted",
      message: `Your request for ${property_title} has been sent to the host. Confirmation code: ${confirmationCode}`,
      reference_type: "booking",
      reference_id: booking.id,
      read: false
    });

    return Response.json({
      success: true,
      booking_id: booking.id,
      confirmation_code: confirmationCode,
      total_price: totalPrice,
      nights: nights,
      message: 'Booking request submitted successfully'
    });

  } catch (error) {
    console.error('Error creating property booking:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});