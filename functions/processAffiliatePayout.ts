import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payout_amount, payout_method = 'wallet' } = await req.json();

    if (!payout_amount || payout_amount <= 0) {
      return Response.json({ error: 'Invalid payout amount' }, { status: 400 });
    }

    // Get pending affiliate earnings
    const referrals = await base44.entities.AffiliateReferral.filter({
      referral_code: user.referral_code,
      status: 'completed'
    });

    const totalPending = referrals.reduce((sum, r) => sum + (r.commission_amount || 0) + (r.recruitment_bonus || 0), 0);

    if (payout_amount > totalPending) {
      return Response.json({ error: 'Insufficient pending earnings' }, { status: 400 });
    }

    // Minimum payout threshold
    if (payout_amount < 25) {
      return Response.json({ error: 'Minimum payout is $25' }, { status: 400 });
    }

    // Process payout to wallet
    if (payout_method === 'wallet') {
      // Add funds to user wallet
      const currentBalance = user.usd_balance || 0;
      await base44.asServiceRole.auth.updateUser(user.email, {
        usd_balance: currentBalance + payout_amount
      });

      // Mark referrals as paid (proportionally)
      let remainingToPay = payout_amount;
      for (const ref of referrals) {
        if (remainingToPay <= 0) break;
        
        const refTotal = (ref.commission_amount || 0) + (ref.recruitment_bonus || 0);
        const toPay = Math.min(refTotal, remainingToPay);
        
        await base44.asServiceRole.entities.AffiliateReferral.update(ref.id, {
          status: 'paid',
          payout_date: new Date().toISOString()
        });
        
        remainingToPay -= toPay;
      }

      // Create payment record
      await base44.asServiceRole.entities.Payment.create({
        amount_usd: payout_amount,
        amount_rri: 0,
        method: 'internal_transfer',
        status: 'completed',
        reference_type: 'other',
        memo: 'Affiliate earnings payout',
        recipient_email: user.email,
        created_by: user.email
      });

      // Create notification
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: user.email,
        type: 'payment_received',
        title: 'Affiliate Payout Received',
        message: `$${payout_amount.toFixed(2)} has been added to your wallet from affiliate earnings.`,
        read: false
      });

      return Response.json({ 
        success: true,
        message: `$${payout_amount.toFixed(2)} added to your wallet`,
        new_balance: currentBalance + payout_amount
      });
    }

    return Response.json({ error: 'Payout method not supported' }, { status: 400 });
  } catch (error) {
    console.error('Payout error:', error);
    return Response.json({ 
      error: error.message || 'Payout processing failed' 
    }, { status: 500 });
  }
});