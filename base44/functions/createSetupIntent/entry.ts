import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));

    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
    if (!publishableKey) {
      throw new Error('Stripe publishable key not configured');
    }

    if (payload.card_save_only) {
      return Response.json({ publishable_key: publishableKey });
    }

    console.log('Creating setup intent for user:', user.email);

    // Create or get Stripe customer
    let customerId = user.stripe_customer_id;
    
    if (!customerId) {
      console.log('Creating new Stripe customer...');
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { user_id: user.id, user_email: user.email }
      });
      customerId = customer.id;
      await base44.auth.updateMe({ stripe_customer_id: customerId });
      console.log('Stripe customer created:', customerId);
    }

    // Create SetupIntent for in-app payment method collection.
    // Explicitly limit to card + bank only (NO Stripe Link) so users are
    // never pulled out of the app to a Link verification screen when saving.
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'us_bank_account'],
      metadata: { user_email: user.email }
    });

    console.log('Setup intent created:', setupIntent.id);

    return Response.json({
      client_secret: setupIntent.client_secret,
      publishable_key: publishableKey
    });

  } catch (error) {
    console.error('Setup intent error:', error);
    return Response.json({ 
      error: error.message || 'Failed to create setup intent'
    }, { status: 500 });
  }
});