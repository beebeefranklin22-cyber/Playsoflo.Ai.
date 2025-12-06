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

    const { email, country = 'US' } = await req.json();

    const account = await stripe.accounts.create({
      type: 'express',
      country: country,
      email: email || user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
    });

    return Response.json({ 
      accountId: account.id,
      email: account.email 
    });
  } catch (error) {
    console.error('Create connected account error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});