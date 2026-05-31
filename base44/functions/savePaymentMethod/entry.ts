import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
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

    const { payment_method_id } = await req.json();

    if (!payment_method_id) {
      return Response.json({ error: 'Payment method ID required' }, { status: 400 });
    }

    console.log('Saving payment method:', payment_method_id, 'for user:', user.email);

    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);

    if (!paymentMethod) {
      return Response.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    // Check if this is the first payment method
    const existingMethods = await base44.asServiceRole.entities.PaymentMethod.filter({
      user_email: user.email,
      status: 'active'
    });

    console.log('Existing payment methods:', existingMethods.length);

    // Map Stripe payment method type to our entity enum
    const typeMap = {
      card: 'card',
      us_bank_account: 'bank_account'
    };
    const mappedType = typeMap[paymentMethod.type] || 'card';

    // Save to database (service role: user already authenticated above, user_email set explicitly)
    const savedMethod = await base44.asServiceRole.entities.PaymentMethod.create({
      user_email: user.email,
      type: mappedType,
      stripe_payment_method_id: paymentMethod.id,
      card_details: paymentMethod.card ? {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year
      } : null,
      bank_details: paymentMethod.us_bank_account ? {
        bank_name: paymentMethod.us_bank_account.bank_name,
        last4: paymentMethod.us_bank_account.last4,
        account_type: paymentMethod.us_bank_account.account_type
      } : null,
      is_default: existingMethods.length === 0,
      status: 'active'
    });

    console.log('Payment method saved successfully:', savedMethod.id);

    return Response.json({ success: true, method: savedMethod });

  } catch (error) {
    console.error('Save payment method error:', error);
    return Response.json({ 
      error: error.message || 'Failed to save payment method' 
    }, { status: 500 });
  }
});