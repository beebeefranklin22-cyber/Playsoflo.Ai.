import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { track_id, album_id, distribution_type, release_date, platforms } = await req.json();

    if (!track_id) {
      return Response.json({ error: 'track_id required' }, { status: 400 });
    }

    const DISTRIBUTION_FEE = 2.22;

    // Check user balance
    if (user.usd_balance < DISTRIBUTION_FEE) {
      return Response.json({ 
        error: 'Insufficient balance',
        required: DISTRIBUTION_FEE,
        available: user.usd_balance
      }, { status: 400 });
    }

    // Deduct distribution fee
    await base44.entities.User.update(user.id, {
      usd_balance: user.usd_balance - DISTRIBUTION_FEE
    });

    // Create payment record
    const payment = await base44.entities.Payment.create({
      amount_usd: DISTRIBUTION_FEE,
      amount_rri: 0,
      method: "wallet_balance",
      status: "completed",
      reference_type: "other",
      reference_id: track_id,
      memo: "Music distribution fee"
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
      release_date: release_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days default
      status: "processing",
      payment_id: payment.id,
      distribution_fee: DISTRIBUTION_FEE,
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
      message: `Your music is being distributed to ${platforms?.length || 6} platforms. ISRC: ${isrc}. Expected release: ${new Date(distribution.release_date).toLocaleDateString()}`,
      read: false,
      action_url: "/MusicStudio"
    });

    return Response.json({
      success: true,
      distribution: distribution,
      isrc_code: isrc,
      upc_code: upc,
      fee_charged: DISTRIBUTION_FEE,
      estimated_live_date: distribution.release_date,
      message: "Distribution processing started. Your music will be submitted to platforms within 48 hours."
    });

  } catch (error) {
    console.error('Error processing distribution:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});