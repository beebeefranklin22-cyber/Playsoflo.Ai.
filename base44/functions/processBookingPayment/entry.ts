import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * processBookingPayment
 * Handles upfront payment collection for experience, service, car_rental, and property bookings.
 * Delegates settlement to the universal settlePayment engine.
 */
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

    // Map bookingType to vertical for settlement engine
    const verticalMap = {
      service: 'service_booking',
      experience: 'experience',
      car_rental: 'car_rental',
      property: 'property'
    };
    const vertical = verticalMap[bookingType] || bookingType;

    // Settle provider earnings via universal settlement engine
    const result = await base44.functions.invoke('settlePayment', {
      vertical,
      reference_id: bookingId,
      provider_email: undefined // will be resolved from the record inside settlePayment
    });

    if (!result.data?.success) {
      return Response.json({ error: result.data?.error || 'Settlement failed' }, { status: 500 });
    }

    return Response.json({
      success: true,
      providerEarnings: result.data.earnings,
      platformFee: result.data.platform_fee,
      newBalance: result.data.new_wallet_balance,
      message: 'Payment distributed successfully'
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});