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

    const { accountId } = await req.json();

    if (!accountId) {
      return Response.json({ error: 'Account ID required' }, { status: 400 });
    }

    const account = await stripe.accounts.retrieve(accountId);

    return Response.json({
      id: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements,
      capabilities: account.capabilities,
    });
  } catch (error) {
    console.error('Get account status error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});