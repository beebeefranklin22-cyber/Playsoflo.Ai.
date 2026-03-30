import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This endpoint can be called via webhook from Shopify Partner Dashboard
    // or manually when a referral converts
    
    const { referral_code, commission_amount, referred_email } = await req.json();

    if (!referral_code || !commission_amount) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the referral by code
    const referrals = await base44.asServiceRole.entities.AffiliateReferral.filter({
      referral_code,
      status: 'pending'
    });

    if (referrals.length === 0) {
      return Response.json({ error: 'Referral not found' }, { status: 404 });
    }

    const referral = referrals[0];

    // Update referral to completed status
    await base44.asServiceRole.entities.AffiliateReferral.update(referral.id, {
      status: 'completed',
      commission_amount: parseFloat(commission_amount),
      conversion_date: new Date().toISOString(),
      referred_user_email: referred_email || referral.referred_user_email
    });

    // Send notification to affiliate
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: referral.created_by,
        subject: '🎉 Your Shopify Referral Converted!',
        body: `
Great news! Your Shopify referral has converted.

Commission: $${commission_amount}
Status: Processing for payout

Your earnings will be transferred to your Stripe account within 3-5 business days.

Keep sharing and earning!
        `
      });
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    return Response.json({
      success: true,
      referral_id: referral.id,
      commission_amount,
      message: 'Conversion tracked successfully'
    });

  } catch (error) {
    console.error('Conversion tracking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});