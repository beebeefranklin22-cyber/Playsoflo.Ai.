import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * settlePayment — Universal Settlement Engine
 * ─────────────────────────────────────────────
 * Handles provider/driver earnings settlement for all verticals:
 *   - delivery        (driver: 85% of subtotal)
 *   - ride            (driver: 90% of total_fare)
 *   - property        (host: 81% — 19% platform fee)
 *   - car_rental      (provider: uses stored provider_earnings)
 *   - service_booking (provider: 85% — 15% platform fee)
 *   - experience      (provider: 81% — 19% platform fee)
 *   - marketplace     (seller: 85% — 15% platform fee)
 *   - music_royalty   (recipients: per split percentages)
 *
 * All settlements are idempotent — duplicate calls return early.
 *
 * Payload:
 *   { vertical, reference_id, provider_email?, earnings_override? }
 *
 * vertical-specific extra fields:
 *   ride:         { total_fare, driver_percentage? }
 *   music_royalty: { revenue_amount, splits: [{user_email, percentage, role}] }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { vertical, reference_id } = body;

    if (!vertical || !reference_id) {
      return Response.json({ error: 'vertical and reference_id are required' }, { status: 400 });
    }

    // ── Music royalty is multi-recipient — handle separately ──────────────
    if (vertical === 'music_royalty') {
      return await handleMusicRoyalty(base44, body);
    }

    // ── Standard single-provider settlement ───────────────────────────────
    const memoMap = {
      delivery:        'Delivery driver earnings',
      ride:            'Ride driver earnings',
      property:        'Property booking host earnings',
      car_rental:      'Car rental provider earnings',
      service_booking: 'Service booking provider earnings',
      experience:      'Experience booking provider earnings',
      marketplace:     'Marketplace seller earnings',
    };

    const memo = memoMap[vertical];
    if (!memo) {
      return Response.json({ error: `Unknown vertical: ${vertical}` }, { status: 400 });
    }

    // Authorization: must be the provider/driver or admin
    const provider_email = body.provider_email || user.email;
    if (provider_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Idempotency guard ─────────────────────────────────────────────────
    const existing = await base44.asServiceRole.entities.Payment.filter({
      reference_id,
      memo,
      status: 'completed'
    });
    if (existing.length > 0) {
      return Response.json({
        success: true,
        already_settled: true,
        message: 'Payment already processed',
        payment_id: existing[0].id
      });
    }

    // ── Resolve earnings amount ───────────────────────────────────────────
    let earnings = parseFloat(body.earnings_override) || 0;
    let platformFee = 0;
    let totalAmount = 0;
    let referenceType = 'other';

    if (earnings <= 0) {
      // Fetch the source record to calculate
      const result = await resolveEarnings(base44, vertical, reference_id, body);
      earnings = result.earnings;
      platformFee = result.platformFee;
      totalAmount = result.totalAmount;
    }

    if (earnings <= 0) {
      return Response.json({ error: 'Invalid earnings amount — cannot settle $0' }, { status: 400 });
    }

    // Map vertical to reference_type
    const refTypeMap = {
      delivery:        'other',
      ride:            'other',
      property:        'booking',
      car_rental:      'car_rental',
      service_booking: 'booking',
      experience:      'booking',
      marketplace:     'other',
    };
    referenceType = refTypeMap[vertical] || 'other';

    // ── Fetch provider wallet ─────────────────────────────────────────────
    const users = await base44.asServiceRole.entities.User.filter({ email: provider_email });
    if (users.length === 0) {
      return Response.json({ error: 'Provider account not found' }, { status: 404 });
    }
    const providerUser = users[0];
    const currentBalance = parseFloat(providerUser.usd_balance) || 0;
    const newBalance = parseFloat((currentBalance + earnings).toFixed(2));

    // ── Update wallet ─────────────────────────────────────────────────────
    const statsUpdate = { usd_balance: newBalance };
    if (vertical === 'delivery') {
      statsUpdate.total_deliveries_completed = (providerUser.total_deliveries_completed || 0) + 1;
      statsUpdate.total_delivery_earnings = parseFloat(((providerUser.total_delivery_earnings || 0) + earnings).toFixed(2));
    } else if (vertical === 'ride') {
      statsUpdate.total_rides_completed = (providerUser.total_rides_completed || 0) + 1;
      statsUpdate.total_driver_earnings = parseFloat(((providerUser.total_driver_earnings || 0) + earnings).toFixed(2));
    } else if (vertical === 'property') {
      statsUpdate.total_property_earnings = parseFloat(((providerUser.total_property_earnings || 0) + earnings).toFixed(2));
    } else if (vertical === 'car_rental') {
      statsUpdate.total_rental_earnings = parseFloat(((providerUser.total_rental_earnings || 0) + earnings).toFixed(2));
    } else {
      statsUpdate.total_service_earnings = parseFloat(((providerUser.total_service_earnings || 0) + earnings).toFixed(2));
    }
    await base44.asServiceRole.entities.User.update(providerUser.id, statsUpdate);

    // ── Record payment ledger entry ───────────────────────────────────────
    const payment = await base44.asServiceRole.entities.Payment.create({
      amount_usd: earnings,
      amount_rri: 0,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: referenceType,
      reference_id,
      recipient_email: provider_email,
      sender_email: 'platform@playsoflo.com',
      memo,
      metadata: JSON.stringify({
        vertical,
        total_amount: totalAmount,
        platform_fee: platformFee,
        provider_earnings: earnings,
        settled_at: new Date().toISOString()
      })
    });

    // ── Record platform fee (if applicable) ───────────────────────────────
    if (platformFee > 0) {
      await base44.asServiceRole.entities.Payment.create({
        amount_usd: platformFee,
        method: 'internal_transfer',
        status: 'completed',
        reference_type: 'platform_fee',
        reference_id,
        sender_email: 'customer@playsoflo.com',
        recipient_email: 'platform@playsoflo.com',
        memo: `Platform commission (${vertical})`
      });
    }

    // ── Notify provider ───────────────────────────────────────────────────
    const verticalLabels = {
      delivery: 'delivery',
      ride: 'ride',
      property: 'property booking',
      car_rental: 'car rental',
      service_booking: 'service booking',
      experience: 'experience booking',
      marketplace: 'sale',
    };
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: provider_email,
      type: 'payment_received',
      title: '💰 Earnings Credited!',
      message: `$${earnings.toFixed(2)} added to your wallet from your ${verticalLabels[vertical]}. New balance: $${newBalance.toFixed(2)}`,
      reference_type: referenceType,
      reference_id,
      read: false
    });

    return Response.json({
      success: true,
      vertical,
      reference_id,
      provider_email,
      earnings,
      platform_fee: platformFee,
      new_wallet_balance: newBalance,
      payment_id: payment.id,
      settled_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('settlePayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Helper: resolve earnings based on vertical ───────────────────────────────
async function resolveEarnings(base44, vertical, reference_id, body) {
  let earnings = 0, platformFee = 0, totalAmount = 0;

  if (vertical === 'delivery') {
    const records = await base44.asServiceRole.entities.DeliveryOrder.filter({ id: reference_id });
    if (records.length > 0) {
      const o = records[0];
      totalAmount = parseFloat(o.total_price) || 0;
      platformFee = parseFloat(o.platform_fee) || totalAmount * 0.15;
      const subtotal = totalAmount - platformFee;
      earnings = parseFloat(o.driver_earnings) || parseFloat((subtotal * 0.85).toFixed(2));
    }
  } else if (vertical === 'ride') {
    const totalFare = parseFloat(body.total_fare) || 0;
    const pct = parseFloat(body.driver_percentage) || 90;
    totalAmount = totalFare;
    earnings = parseFloat(((totalFare * pct) / 100).toFixed(2));
    platformFee = parseFloat((totalFare - earnings).toFixed(2));
  } else if (vertical === 'property') {
    const records = await base44.asServiceRole.entities.Booking.filter({ id: reference_id });
    if (records.length > 0) {
      totalAmount = parseFloat(records[0].total_price_usd) || 0;
      platformFee = parseFloat((totalAmount * 0.19).toFixed(2));
      earnings = parseFloat((totalAmount - platformFee).toFixed(2));
    }
  } else if (vertical === 'car_rental') {
    const records = await base44.asServiceRole.entities.CarRental.filter({ id: reference_id });
    if (records.length > 0) {
      totalAmount = parseFloat(records[0].total_amount) || 0;
      earnings = parseFloat(records[0].provider_earnings) || parseFloat((totalAmount * 0.81).toFixed(2));
      platformFee = parseFloat((totalAmount - earnings).toFixed(2));
    }
  } else if (vertical === 'service_booking') {
    const records = await base44.asServiceRole.entities.ServiceBooking.filter({ id: reference_id });
    if (records.length > 0) {
      totalAmount = parseFloat(records[0].total_price) || 0;
      platformFee = parseFloat((totalAmount * 0.15).toFixed(2));
      earnings = parseFloat((totalAmount - platformFee).toFixed(2));
    }
  } else if (vertical === 'experience') {
    const records = await base44.asServiceRole.entities.Booking.filter({ id: reference_id });
    if (records.length > 0) {
      totalAmount = parseFloat(records[0].total_amount || records[0].total_price_usd) || 0;
      platformFee = parseFloat((totalAmount * 0.19).toFixed(2));
      earnings = parseFloat((totalAmount - platformFee).toFixed(2));
    }
  } else if (vertical === 'marketplace') {
    const records = await base44.asServiceRole.entities.Order.filter({ id: reference_id });
    if (records.length > 0) {
      totalAmount = parseFloat(records[0].total_amount) || 0;
      platformFee = parseFloat(records[0].platform_fee) || parseFloat((totalAmount * 0.15).toFixed(2));
      earnings = parseFloat((totalAmount - platformFee).toFixed(2));
    }
  }

  return { earnings, platformFee, totalAmount };
}

// ── Helper: music royalty multi-recipient settlement ─────────────────────────
async function handleMusicRoyalty(base44, body) {
  const { reference_id, revenue_amount, splits } = body;

  if (!revenue_amount || !splits || splits.length === 0) {
    return Response.json({ error: 'revenue_amount and splits are required for music_royalty' }, { status: 400 });
  }

  const distributions = [];

  for (const collaborator of splits) {
    const amount = parseFloat(((revenue_amount * collaborator.percentage) / 100).toFixed(2));
    if (amount <= 0) continue;

    const users = await base44.asServiceRole.entities.User.filter({ email: collaborator.user_email });
    if (users.length === 0) continue;

    const u = users[0];
    const newBalance = parseFloat(((u.usd_balance || 0) + amount).toFixed(2));

    await base44.asServiceRole.entities.User.update(u.id, { usd_balance: newBalance });

    await base44.asServiceRole.entities.Payment.create({
      amount_usd: amount,
      amount_rri: 0,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'other',
      reference_id,
      recipient_email: collaborator.user_email,
      sender_email: 'platform@playsoflo.com',
      memo: `Royalty payment — ${collaborator.role} (${collaborator.percentage}%)`
    });

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: collaborator.user_email,
      type: 'payment_received',
      title: '💰 Royalty Payment Received',
      message: `You received $${amount.toFixed(2)} in royalties (${collaborator.percentage}% — ${collaborator.role}).`,
      reference_type: 'other',
      reference_id,
      read: false
    });

    distributions.push({ user_email: collaborator.user_email, amount, percentage: collaborator.percentage, role: collaborator.role });
  }

  // Update total_distributed on RoyaltySplit record
  const splitRecords = await base44.asServiceRole.entities.RoyaltySplit.filter({ track_id: reference_id });
  if (splitRecords.length > 0) {
    await base44.asServiceRole.entities.RoyaltySplit.update(splitRecords[0].id, {
      total_distributed: (splitRecords[0].total_distributed || 0) + revenue_amount
    });
  }

  return Response.json({
    success: true,
    vertical: 'music_royalty',
    total_amount: revenue_amount,
    distributions,
    message: `Distributed $${revenue_amount.toFixed(2)} to ${distributions.length} collaborators`
  });
}