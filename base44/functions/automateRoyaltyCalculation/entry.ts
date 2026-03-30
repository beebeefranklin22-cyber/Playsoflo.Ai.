import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('Starting automated royalty calculation...');

    // Get all tracks with revenue
    const tracks = await base44.asServiceRole.entities.MusicTrack.list();
    const tracksWithRevenue = tracks.filter(t => (t.revenue_generated || 0) > 0);

    let totalProcessed = 0;
    let totalDistributed = 0;
    const results = [];

    for (const track of tracksWithRevenue) {
      // Check if track has royalty split
      const splits = await base44.asServiceRole.entities.RoyaltySplit.filter({ 
        track_id: track.id 
      });

      if (splits.length === 0) {
        console.log(`No split found for track ${track.id}, skipping`);
        continue;
      }

      const split = splits[0];
      const revenueGenerated = track.revenue_generated || 0;
      const alreadyDistributed = split.total_distributed || 0;
      const remainingRevenue = revenueGenerated - alreadyDistributed;

      if (remainingRevenue <= 0) {
        continue; // Already distributed
      }

      console.log(`Processing track ${track.title}: $${remainingRevenue} to distribute`);

      // Calculate and update earnings for each collaborator
      for (const collaborator of split.splits) {
        const amount = (remainingRevenue * collaborator.percentage) / 100;
        
        // Find or create royalty earnings record
        let earnings = await base44.asServiceRole.entities.RoyaltyEarnings.filter({
          user_email: collaborator.user_email,
          track_id: track.id
        });

        if (earnings.length > 0) {
          const existing = earnings[0];
          await base44.asServiceRole.entities.RoyaltyEarnings.update(existing.id, {
            accumulated_usd: (existing.accumulated_usd || 0) + amount,
            lifetime_earned_usd: (existing.lifetime_earned_usd || 0) + amount
          });
        } else {
          await base44.asServiceRole.entities.RoyaltyEarnings.create({
            user_email: collaborator.user_email,
            track_id: track.id,
            accumulated_usd: amount,
            lifetime_earned_usd: amount,
            payout_enabled: false
          });
        }

        // Send notification
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: collaborator.user_email,
          type: "payment_received",
          title: "💰 New Royalty Earnings",
          message: `You earned $${amount.toFixed(2)} from "${track.title}". Total available: Check your dashboard.`,
          read: false,
          action_url: "/CollaboratorDashboard"
        });
      }

      // Update total distributed on split
      await base44.asServiceRole.entities.RoyaltySplit.update(split.id, {
        total_distributed: (split.total_distributed || 0) + remainingRevenue
      });

      totalProcessed++;
      totalDistributed += remainingRevenue;
      results.push({
        track_id: track.id,
        track_title: track.title,
        amount: remainingRevenue,
        collaborators: split.splits.length
      });
    }

    console.log(`Automated calculation complete: ${totalProcessed} tracks, $${totalDistributed} distributed`);

    return Response.json({
      success: true,
      tracks_processed: totalProcessed,
      total_distributed: totalDistributed,
      details: results,
      message: `Distributed $${totalDistributed.toFixed(2)} across ${totalProcessed} tracks`
    });

  } catch (error) {
    console.error('Error in automated royalty calculation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});