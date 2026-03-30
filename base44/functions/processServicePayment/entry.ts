import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, payment_method } = await req.json();

    if (!booking_id || !payment_method) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch booking
    const bookings = await base44.entities.ServiceBooking.filter({ id: booking_id });
    if (bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];
    const totalAmount = booking.total_price || 0;

    if (totalAmount <= 0) {
      return Response.json({ error: 'Invalid booking amount' }, { status: 400 });
    }

    // Check if already paid
    if (booking.payment_status === 'paid') {
      return Response.json({ error: 'Booking already paid' }, { status: 400 });
    }

    // Process payment based on method
    if (payment_method === 'wallet') {
      // Check user balance
      if ((user.usd_balance || 0) < totalAmount) {
        return Response.json({ error: 'Insufficient balance' }, { status: 400 });
      }

      // Deduct from customer
      const newCustomerBalance = (user.usd_balance || 0) - totalAmount;
      await base44.asServiceRole.entities.User.update(user.id, {
        usd_balance: newCustomerBalance
      });

      // Calculate provider earnings (85% to provider, 15% platform fee)
      const platformRate = 0.15;
      const providerEarnings = totalAmount * 0.85;
      const platformFee = totalAmount * platformRate;

      // Credit provider
      const providers = await base44.asServiceRole.entities.User.filter({ email: booking.provider_email });
      if (providers.length > 0) {
        const provider = providers[0];
        const newProviderBalance = (provider.usd_balance || 0) + providerEarnings;
        
        await base44.asServiceRole.entities.User.update(provider.id, {
          usd_balance: newProviderBalance
        });

        // Create payment records
        await base44.asServiceRole.entities.Payment.create({
          amount_usd: providerEarnings,
          method: 'internal_transfer',
          status: 'completed',
          reference_type: 'booking',
          reference_id: booking.id,
          sender_email: user.email,
          recipient_email: booking.provider_email,
          memo: `Service payment: ${booking.service_name} (Customer paid: $${totalAmount}, Platform fee: $${platformFee.toFixed(2)})`
        });

        // Record platform fee
        await base44.asServiceRole.entities.Payment.create({
          amount_usd: platformFee,
          method: 'internal_transfer',
          status: 'completed',
          reference_type: 'other',
          reference_id: booking.id,
          sender_email: user.email,
          recipient_email: 'platform@playsoflo.com',
          memo: `Platform commission (15%) from service booking`
        });

        // Update booking status
        await base44.asServiceRole.entities.ServiceBooking.update(booking.id, {
          payment_status: 'paid',
          booking_status: 'confirmed',
          paid_at: new Date().toISOString()
        });

        // Notify provider
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: booking.provider_email,
          type: 'payment_received',
          title: '💰 New Booking Payment',
          message: `You earned $${providerEarnings.toFixed(2)} from ${user.full_name || user.email} for ${booking.service_name}. New balance: $${newProviderBalance.toFixed(2)}`,
          reference_type: 'booking',
          reference_id: booking.id
        });

        // Notify customer
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: user.email,
          type: 'system_alert',
          title: '✅ Booking Confirmed',
          message: `Your booking for ${booking.service_name} is confirmed! Provider will contact you soon.`,
          reference_type: 'booking',
          reference_id: booking.id
        });

        return Response.json({
          success: true,
          booking_id: booking.id,
          provider_earnings: providerEarnings,
          platform_fee: platformFee,
          customer_new_balance: newCustomerBalance,
          provider_new_balance: newProviderBalance
        });
      }
    }

    return Response.json({ error: 'Unsupported payment method' }, { status: 400 });

  } catch (error) {
    console.error('Service payment error:', error);
    return Response.json({ 
      error: 'Payment processing failed',
      details: error.message 
    }, { status: 500 });
  }
});