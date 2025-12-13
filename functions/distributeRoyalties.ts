import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { track_id, revenue_amount } = await req.json();

    if (!track_id || !revenue_amount) {
      return Response.json({ error: 'track_id and revenue_amount required' }, { status: 400 });
    }

    // Get royalty split for track
    const splits = await base44.asServiceRole.entities.RoyaltySplit.filter({ track_id });
    
    if (splits.length === 0) {
      return Response.json({ error: 'No royalty split found for this track' }, { status: 404 });
    }

    const split = splits[0];
    const distributions = [];

    // Distribute to each collaborator
    for (const collaborator of split.splits) {
      const amount = (revenue_amount * collaborator.percentage) / 100;
      
      // Find user
      const users = await base44.asServiceRole.entities.User.filter({ 
        email: collaborator.user_email 
      });
      
      if (users.length > 0) {
        const targetUser = users[0];
        
        // Update user balance
        await base44.asServiceRole.entities.User.update(targetUser.id, {
          usd_balance: (targetUser.usd_balance || 0) + amount
        });

        // Create payment record
        await base44.asServiceRole.entities.Payment.create({
          amount_usd: amount,
          amount_rri: 0,
          method: "internal_transfer",
          status: "completed",
          reference_type: "other",
          reference_id: track_id,
          recipient_email: collaborator.user_email,
          memo: `Royalty payment - ${collaborator.role} (${collaborator.percentage}%)`
        });

        // Send notification
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: collaborator.user_email,
          type: "payment_received",
          title: "💰 Royalty Payment Received",
          message: `You received $${amount.toFixed(2)} in royalties (${collaborator.percentage}% split) for track revenue.`,
          read: false,
          action_url: "/Wallet"
        });

        distributions.push({
          user_email: collaborator.user_email,
          amount: amount,
          percentage: collaborator.percentage,
          role: collaborator.role
        });
      }
    }

    // Update total distributed
    await base44.asServiceRole.entities.RoyaltySplit.update(split.id, {
      total_distributed: (split.total_distributed || 0) + revenue_amount
    });

    return Response.json({
      success: true,
      total_amount: revenue_amount,
      distributions: distributions,
      message: `Distributed $${revenue_amount.toFixed(2)} to ${distributions.length} collaborators`
    });

  } catch (error) {
    console.error('Error distributing royalties:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});