import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);

    const { pool_id, tier_name, tier_amount, selected_add_ons = [] } = await req.json();

    if (!pool_id || !tier_amount) {
      return Response.json({ error: 'pool_id and tier_amount are required' }, { status: 400 });
    }

    // Calculate add-ons total
    const addOnsTotal = selected_add_ons.reduce((sum, ao) => sum + (ao.price || 0), 0);
    const baseAmount = tier_amount + addOnsTotal;

    // Platform fee: 5%
    const platformFee = baseAmount * 0.05;
    const totalAmount = baseAmount + platformFee;

    // Get or create Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.search({
      query: `email:'${user.email}'`,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { user_id: user.id }
      });
    }

    const origin = req.headers.get('origin') || 'https://playsoflo.vercel.app';

    // Build line items
    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: tier_name ? `Fan Pool: ${tier_name}` : 'Fan Pool Contribution',
            description: `Contribution + ${platformFee.toFixed(2)} platform fee`,
          },
          unit_amount: Math.round(baseAmount * 100),
        },
        quantity: 1,
      }
    ];

    // Add each selected add-on as a line item
    for (const ao of selected_add_ons) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Add-on: ${ao.name}`,
            description: ao.description || '',
          },
          unit_amount: Math.round((ao.price || 0) * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/Vibe?pool_payment=success&pool_id=${pool_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Vibe?pool_payment=cancelled`,
      metadata: {
        pool_id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        tier_name: tier_name || '',
        tier_amount: tier_amount.toString(),
        add_ons: JSON.stringify(selected_add_ons.map(ao => ao.name)),
        total_amount: totalAmount.toString(),
        type: 'fan_pool_contribution'
      },
    });

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      amount_breakdown: {
        base: baseAmount,
        platform_fee: platformFee,
        total: totalAmount
      }
    });
  } catch (error) {
    console.error('Fan pool payment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});