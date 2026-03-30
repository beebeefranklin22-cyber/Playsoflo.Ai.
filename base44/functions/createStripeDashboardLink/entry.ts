import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Creates a Stripe Express Dashboard login link for connected accounts
 * This allows providers to access their full Stripe dashboard
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ 
        error: 'STRIPE_SECRET_KEY not configured' 
      }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover'
    });

    const { account_id } = await req.json();
    
    if (!account_id) {
      return Response.json({ 
        error: 'account_id is required' 
      }, { status: 400 });
    }

    // Create a login link for the Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(account_id);

    return Response.json({
      success: true,
      url: loginLink.url,
      created: loginLink.created
    });

  } catch (error) {
    console.error('Error creating dashboard link:', error);
    return Response.json({ 
      error: error.message || 'Failed to create dashboard link'
    }, { status: 500 });
  }
});