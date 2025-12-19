import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingData } = await req.json();

    if (!bookingData || !bookingData.total_price) {
      return Response.json({ error: 'Invalid booking data' }, { status: 400 });
    }

    const totalPrice = bookingData.total_price;

    // Check balance
    const currentBalance = parseFloat(user.usd_balance) || 0;
    if (currentBalance < totalPrice) {
      return Response.json({ 
        error: 'Insufficient balance',
        required: totalPrice.toFixed(2),
        current: currentBalance.toFixed(2)
      }, { status: 400 });
    }

    // Deduct from customer instantly
    const newCustomerBalance = currentBalance - totalPrice;
    await base44.asServiceRole.entities.User.update(user.id, {
      usd_balance: newCustomerBalance
    });

    // Create booking
    const booking = await base44.asServiceRole.entities.ServiceBooking.create({
      ...bookingData,
      customer_email: user.email,
      booking_status: 'confirmed',
      payment_status: 'paid',
      confirmation_code: `SVC${Date.now().toString(36).toUpperCase()}`
    });

    // Create payment record
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: totalPrice,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'order',
      reference_id: booking.id,
      sender_email: user.email,
      recipient_email: bookingData.provider_email,
      memo: `Service booking: ${bookingData.service_name || 'Service'}`
    });

    // Calculate platform commission
    const platformFee = totalPrice * 0.15; // 15% platform fee
    const providerAmount = totalPrice * 0.85; // 85% to provider

    // Credit provider instantly
    const providers = await base44.asServiceRole.entities.User.filter({ email: bookingData.provider_email });
    if (providers.length > 0) {
      const provider = providers[0];
      const providerNewBalance = (parseFloat(provider.usd_balance) || 0) + providerAmount;
      
      await base44.asServiceRole.entities.User.update(provider.id, {
        usd_balance: providerNewBalance,
        total_service_earnings: (parseFloat(provider.total_service_earnings) || 0) + providerAmount
      });

      // Notify provider of instant payment
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: bookingData.provider_email,
        type: 'payment_received',
        title: '💰 Payment Received Instantly',
        message: `$${providerAmount.toFixed(2)} added to your wallet! (Platform fee: $${platformFee.toFixed(2)}). New balance: $${providerNewBalance.toFixed(2)}`,
        reference_type: 'booking',
        reference_id: booking.id
      });
    }

    // Record platform fee
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: platformFee,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'platform_fee',
      reference_id: booking.id,
      sender_email: user.email,
      recipient_email: 'platform@playsoflo.com',
      memo: 'Platform commission (15%) from service booking'
    });

    // Send notifications
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: '✅ Booking Confirmed',
      body: `Your booking is confirmed!\n\nConfirmation: ${booking.confirmation_code}\nService: ${bookingData.service_name}\nTotal: $${totalPrice.toFixed(2)}\n\nThe provider will contact you shortly.`
    });

    if (bookingData.provider_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: bookingData.provider_email,
        subject: '🎉 New Booking!',
        body: `You have a new booking!\n\nService: ${bookingData.service_name}\nCustomer: ${user.full_name}\nEarnings: $${providerAmount.toFixed(2)}\n\nLog in to view details.`
      });
    }

    return Response.json({
      success: true,
      booking,
      message: 'Booking confirmed'
    });

  } catch (error) {
    console.error('Service booking error:', error);
    return Response.json({ 
      error: 'Booking failed',
      details: error.message 
    }, { status: 500 });
  }
});