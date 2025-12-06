import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, returnUrl, refreshUrl } = await req.json();

    if (!accountId) {
      return Response.json({ error: 'Account ID required' }, { status: 400 });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || `${new URL(req.url).origin}/profile`,
      return_url: returnUrl || `${new URL(req.url).origin}/profile?onboarding=complete`,
      type: 'account_onboarding',
    });

    return Response.json({ 
      url: accountLink.url,
      expiresAt: accountLink.expires_at 
    });
  } catch (error) {
    console.error('Create account link error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});