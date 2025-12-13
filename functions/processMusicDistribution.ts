import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { track_id, album_id, distribution_type, release_date, platforms, distributor } = await req.json();

    if (!track_id || !distributor) {
      return Response.json({ error: 'track_id and distributor required' }, { status: 400 });
    }

    const PLAYSO_FLO_FEE = 2.22;

    // Distributor pricing
    const distributorPricing = {
      distrokid: { single: 22.99, album: 22.99 },
      tunecore: { single: 9.99, album: 29.99 },
      cdbaby: { single: 9.95, album: 29.00 }
    };

    const distType = distribution_type || 'single';
    const distributorFee = distributorPricing[distributor]?.[distType] || 9.99;
    const totalFee = distributorFee + PLAYSO_FLO_FEE;

    // Check user balance
    if (user.usd_balance < totalFee) {
      return Response.json({ 
        error: 'Insufficient balance',
        required: totalFee,
        available: user.usd_balance,
        breakdown: {
          distributor_fee: distributorFee,
          platform_fee: PLAYSO_FLO_FEE
        }
      }, { status: 400 });
    }

    // Deduct total fee
    await base44.entities.User.update(user.id, {
      usd_balance: user.usd_balance - totalFee
    });

    // Create payment records
    const distributorPayment = await base44.entities.Payment.create({
      amount_usd: distributorFee,
      amount_rri: 0,
      method: "wallet_balance",
      status: "completed",
      reference_type: "other",
      reference_id: track_id,
      memo: `${distributor.charAt(0).toUpperCase() + distributor.slice(1)} distribution fee`
    });

    const platformPayment = await base44.entities.Payment.create({
      amount_usd: PLAYSO_FLO_FEE,
      amount_rri: 0,
      method: "wallet_balance",
      status: "completed",
      reference_type: "other",
      reference_id: track_id,
      memo: "PlaySoFlo distribution service fee"
    });

    // Generate unique codes
    const isrc = `US-PSF-${Date.now().toString().slice(-7)}`;
    const upc = distribution_type !== 'single' ? `8${Date.now().toString().slice(-11)}` : null;

    // Create distribution record
    const distribution = await base44.entities.MusicDistribution.create({
      artist_email: user.email,
      track_id: track_id,
      album_id: album_id,
      distribution_type: distribution_type || 'single',
      platforms: platforms || ["spotify", "apple_music", "youtube_music", "amazon_music", "tidal", "deezer"],
      release_date: release_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: "processing",
      payment_id: platformPayment.id,
      distribution_fee: totalFee,
      isrc_code: isrc,
      upc_code: upc,
      submission_date: new Date().toISOString()
    });

    // Simulate distribution processing (in real app, this would call actual distribution API)
    // After 48 hours, status would change to "submitted"
    // After release date, status would change to "live" with platform links

    // Send confirmation notification
    await base44.entities.Notification.create({
      recipient_email: user.email,
      type: "payment_received",
      title: "Music Distribution Started",
      message: `Charged: $${distributorFee} (${distributor}) + $${PLAYSO_FLO_FEE} (service fee). Distributing to ${platforms?.length || 6} platforms. ISRC: ${isrc}. Release: ${new Date(distribution.release_date).toLocaleDateString()}`,
      read: false,
      action_url: "/MusicStudio"
    });

    return Response.json({
      success: true,
      distribution: distribution,
      isrc_code: isrc,
      upc_code: upc,
      total_fee_charged: totalFee,
      distributor_fee: distributorFee,
      platform_fee: PLAYSO_FLO_FEE,
      distributor: distributor,
      estimated_live_date: distribution.release_date,
      message: `Distribution started via ${distributor}. Total fee: $${totalFee.toFixed(2)} ($${distributorFee} + $${PLAYSO_FLO_FEE} service fee)`
    });

  } catch (error) {
    console.error('Error processing distribution:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});