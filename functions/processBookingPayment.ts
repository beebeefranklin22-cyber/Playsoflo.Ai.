import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, bookingType } = await req.json();

    if (!bookingId || !bookingType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the booking
    let booking;
    if (bookingType === 'service') {
      booking = await base44.entities.ServiceBooking.filter({ id: bookingId });
    } else if (bookingType === 'experience') {
      booking = await base44.entities.Booking.filter({ id: bookingId });
    } else if (bookingType === 'car_rental') {
      booking = await base44.entities.CarRental.filter({ id: bookingId });
    } else if (bookingType === 'property') {
      booking = await base44.entities.Booking.filter({ id: bookingId });
    }

    if (!booking || booking.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const bookingData = booking[0];
    const totalAmount = bookingData.total_price_usd || bookingData.total_amount || 0;
    const providerEmail = bookingData.provider_email || bookingData.created_by;

    if (!providerEmail || totalAmount <= 0) {
      return Response.json({ error: 'Invalid booking data' }, { status: 400 });
    }

    // Calculate platform commission (typically 19%)
    const platformRate = bookingData.platform_commission_rate || 0.19;
    const platformFee = totalAmount * platformRate;
    const providerEarnings = totalAmount - platformFee;

    // Get provider user
    const providers = await base44.asServiceRole.entities.User.filter({ 
      email: providerEmail 
    });

    if (providers.length === 0) {
      return Response.json({ error: 'Provider not found' }, { status: 404 });
    }

    const provider = providers[0];
    const currentBalance = provider.usd_balance || 0;
    const newBalance = currentBalance + providerEarnings;

    // Update provider balance
    await base44.asServiceRole.entities.User.update(provider.id, {
      usd_balance: newBalance
    });

    // Create payment records
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: providerEarnings,
      amount_rri: 0,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: bookingType,
      reference_id: bookingId,
      sender_email: user.email,
      recipient_email: providerEmail,
      memo: `Booking payment - Platform fee: $${platformFee.toFixed(2)} (${(platformRate * 100).toFixed(0)}%)`
    });

    // Record platform fee
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: platformFee,
      amount_rri: 0,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'platform_fee',
      reference_id: bookingId,
      sender_email: user.email,
      recipient_email: 'platform@playsoflo.com',
      memo: `Platform commission (${(platformRate * 100).toFixed(0)}%) from ${bookingType} booking`
    });

    // Notify provider
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: providerEmail,
      type: 'payment_received',
      title: '💰 Payment Received',
      message: `You've received $${providerEarnings.toFixed(2)} for a booking (Platform fee: $${platformFee.toFixed(2)}). New balance: $${newBalance.toFixed(2)}`,
      reference_type: bookingType,
      reference_id: bookingId
    });

    return Response.json({
      success: true,
      providerEarnings,
      platformFee,
      newBalance,
      message: 'Payment distributed successfully'
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});