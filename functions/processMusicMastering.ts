import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audio_url, track_id, mastering_style, mastering_settings } = await req.json();

    if (!audio_url || !mastering_style) {
      return Response.json({ error: 'audio_url and mastering_style required' }, { status: 400 });
    }

    const MASTERING_FEE = 4.99;

    // Check user balance
    if (user.usd_balance < MASTERING_FEE) {
      return Response.json({ 
        error: 'Insufficient balance',
        required: MASTERING_FEE,
        available: user.usd_balance
      }, { status: 400 });
    }

    // Deduct mastering fee
    await base44.entities.User.update(user.id, {
      usd_balance: user.usd_balance - MASTERING_FEE
    });

    // Create payment record
    const payment = await base44.entities.Payment.create({
      amount_usd: MASTERING_FEE,
      amount_rri: 0,
      method: "wallet_balance",
      status: "completed",
      reference_type: "other",
      reference_id: track_id || 'mastering',
      memo: `AI Music Mastering - ${mastering_style}`
    });

    const startTime = Date.now();

    // Simulate AI mastering processing
    // In production, this would call actual mastering AI service
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate simulated mastered audio URL
    // In production, this would be the actual processed file
    const mastered_audio_url = audio_url.replace('.mp3', '-mastered.mp3').replace('.wav', '-mastered.wav');
    
    const processingTime = (Date.now() - startTime) / 1000;

    // Create mastering record
    const mastering = await base44.entities.MusicMastering.create({
      artist_email: user.email,
      track_id: track_id,
      original_audio_url: audio_url,
      mastered_audio_url: mastered_audio_url,
      mastering_style: mastering_style,
      mastering_settings: mastering_settings || {
        loudness: -14,
        compression: 'medium',
        brightness: 'neutral',
        stereo_width: 100
      },
      status: "completed",
      mastering_fee: MASTERING_FEE,
      payment_id: payment.id,
      processing_time_seconds: processingTime
    });

    // Send notification
    await base44.entities.Notification.create({
      recipient_email: user.email,
      type: "payment_received",
      title: "Mastering Complete! 🎵",
      message: `Your ${mastering_style} mastering is ready for preview. Listen and approve to finalize.`,
      read: false,
      action_url: "/MusicStudio"
    });

    return Response.json({
      success: true,
      mastering: mastering,
      mastered_audio_url: mastered_audio_url,
      fee_charged: MASTERING_FEE,
      processing_time: processingTime,
      message: "Mastering complete! Preview your track and approve when ready."
    });

  } catch (error) {
    console.error('Error processing mastering:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});