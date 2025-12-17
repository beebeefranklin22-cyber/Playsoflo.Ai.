import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { product_title, tracking_url, referral_code } = await req.json();

    if (!referral_code) {
      return Response.json({ error: 'Missing referral code' }, { status: 400 });
    }

    // Create a pending affiliate referral
    const referral = await base44.entities.AffiliateReferral.create({
      affiliate_program: 'shopify',
      referral_code: referralCode,
      status: 'pending',
      commission_amount: 0 // Will be updated on conversion
    });

    // Log the click for analytics
    console.log(`Affiliate click tracked: ${user.email} -> ${product_title}`);

    return Response.json({
      success: true,
      referral_id: referral.id,
      tracking_url,
      message: 'Click tracked successfully'
    });

  } catch (error) {
    console.error('Click tracking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});