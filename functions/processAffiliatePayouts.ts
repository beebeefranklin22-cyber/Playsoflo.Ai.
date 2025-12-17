import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    // Get all completed referrals that haven't been paid
    const referrals = await base44.asServiceRole.entities.AffiliateReferral.filter({
      status: 'completed'
    });

    const payouts = [];

    for (const referral of referrals) {
      try {
        // Get the affiliate user who made the referral
        const affiliateUsers = await base44.asServiceRole.entities.User.filter({
          email: referral.created_by
        });

        if (affiliateUsers.length === 0) continue;
        
        const affiliateUser = affiliateUsers[0];

        // Check if user has Stripe account connected
        if (!affiliateUser.stripe_account_id) {
          console.log(`User ${affiliateUser.email} has no Stripe account`);
          continue;
        }

        // Create a transfer to the affiliate's Stripe account
        const transfer = await stripe.transfers.create({
          amount: Math.round(referral.commission_amount * 100), // Convert to cents
          currency: 'usd',
          destination: affiliateUser.stripe_account_id,
          description: `Shopify Affiliate Commission - Referral ${referral.referral_code}`,
          metadata: {
            referral_id: referral.id,
            affiliate_email: affiliateUser.email,
            program: referral.affiliate_program
          }
        });

        // Update referral status
        await base44.asServiceRole.entities.AffiliateReferral.update(referral.id, {
          status: 'paid',
          payout_date: new Date().toISOString(),
          stripe_transfer_id: transfer.id
        });

        payouts.push({
          email: affiliateUser.email,
          amount: referral.commission_amount,
          transfer_id: transfer.id
        });

      } catch (error) {
        console.error(`Failed to process payout for referral ${referral.id}:`, error);
      }
    }

    return Response.json({
      success: true,
      payouts_processed: payouts.length,
      payouts
    });

  } catch (error) {
    console.error('Payout processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});