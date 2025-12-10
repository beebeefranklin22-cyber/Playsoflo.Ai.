import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseId, contentId, totalAmount } = await req.json();

    if (!purchaseId || !contentId || !totalAmount) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get revenue shares for this content
    const shares = await base44.asServiceRole.entities.RevenueShare.filter({
      content_id: contentId,
      status: 'active'
    });

    const distributions = [];

    // Distribute revenue to collaborators
    for (const share of shares) {
      const amount = (totalAmount * share.share_percent) / 100;
      
      // Update total earned for this share
      await base44.asServiceRole.entities.RevenueShare.update(share.id, {
        total_earned: (share.total_earned || 0) + amount
      });

      distributions.push({
        creator_email: share.creator_email,
        amount,
        percentage: share.share_percent
      });
    }

    return Response.json({
      success: true,
      purchase_id: purchaseId,
      total_amount: totalAmount,
      distributions
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});