import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { track_id, revenue_amount } = await req.json();

    if (!track_id || !revenue_amount || revenue_amount <= 0) {
      return Response.json({ error: 'track_id and positive revenue_amount required' }, { status: 400 });
    }

    console.log(`Calculating royalties for track ${track_id}, revenue: $${revenue_amount}`);

    // Get royalty split for track
    const splits = await base44.asServiceRole.entities.RoyaltySplit.filter({ track_id });
    
    if (splits.length === 0) {
      return Response.json({ error: 'No royalty split found for this track' }, { status: 404 });
    }

    const split = splits[0];
    const distributions = [];

    // Calculate and update earnings for each collaborator
    for (const collaborator of split.splits) {
      const amount = (revenue_amount * collaborator.percentage) / 100;
      
      // Find or create royalty earnings record
      let earnings = await base44.asServiceRole.entities.RoyaltyEarnings.filter({
        user_email: collaborator.user_email,
        track_id: track_id
      });

      if (earnings.length > 0) {
        // Update existing
        const existing = earnings[0];
        await base44.asServiceRole.entities.RoyaltyEarnings.update(existing.id, {
          accumulated_usd: (existing.accumulated_usd || 0) + amount,
          lifetime_earned_usd: (existing.lifetime_earned_usd || 0) + amount
        });
      } else {
        // Create new
        await base44.asServiceRole.entities.RoyaltyEarnings.create({
          user_email: collaborator.user_email,
          track_id: track_id,
          accumulated_usd: amount,
          lifetime_earned_usd: amount,
          payout_enabled: false
        });
      }

      // Send notification
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: collaborator.user_email,
        type: "payment_received",
        title: "💰 Royalties Earned",
        message: `You earned $${amount.toFixed(2)} (${collaborator.percentage}%) from track revenue. Check your Collaborator Dashboard.`,
        read: false,
        action_url: "/CollaboratorDashboard"
      });

      distributions.push({
        user_email: collaborator.user_email,
        amount: amount,
        percentage: collaborator.percentage,
        role: collaborator.role
      });
    }

    // Update total distributed on split
    await base44.asServiceRole.entities.RoyaltySplit.update(split.id, {
      total_distributed: (split.total_distributed || 0) + revenue_amount
    });

    console.log(`Royalties calculated: ${distributions.length} collaborators`);

    return Response.json({
      success: true,
      total_amount: revenue_amount,
      distributions: distributions,
      message: `Calculated royalties for ${distributions.length} collaborators`
    });

  } catch (error) {
    console.error('Error calculating royalties:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});