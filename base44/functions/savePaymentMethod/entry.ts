import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-12-18.acacia',
    });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { payment_method_id, manual_bank, direct_card } = body;

    // ── Direct card save (no Stripe verification required) ──
    if (direct_card) {
      const existingMethods = await base44.asServiceRole.entities.PaymentMethod.filter({
        user_email: user.email,
        status: 'active'
      });

      const savedMethod = await base44.asServiceRole.entities.PaymentMethod.create({
        user_email: user.email,
        type: 'card',
        card_details: {
          brand: direct_card.brand || 'card',
          last4: direct_card.last4,
          exp_month: direct_card.exp_month,
          exp_year: direct_card.exp_year
        },
        is_default: existingMethods.length === 0,
        status: 'active'
      });

      return Response.json({ success: true, method: savedMethod });
    }

    // ── Manual bank account path ──
    if (manual_bank) {
      const existingMethods = await base44.asServiceRole.entities.PaymentMethod.filter({
        user_email: user.email,
        status: 'active'
      });

      await base44.asServiceRole.entities.BankAccount.create({
        user_email: user.email,
        account_type: manual_bank.account_type,
        bank_name: manual_bank.bank_name,
        account_holder_name: manual_bank.account_holder_name,
        routing_number: manual_bank.routing_number,
        account_number_last4: manual_bank.account_number_last4,
        is_verified: false,
        is_primary: existingMethods.length === 0
      });

      const savedMethod = await base44.asServiceRole.entities.PaymentMethod.create({
        user_email: user.email,
        type: 'bank_account',
        bank_details: {
          bank_name: manual_bank.bank_name,
          last4: manual_bank.account_number_last4,
          account_type: manual_bank.account_type
        },
        is_default: existingMethods.length === 0,
        status: 'active'
      });

      return Response.json({ success: true, method: savedMethod });
    }

    // ── Stripe payment method path ──
    if (!payment_method_id) {
      return Response.json({ error: 'Payment method ID required' }, { status: 400 });
    }

    console.log('Saving Stripe payment method:', payment_method_id, 'for user:', user.email);

    // Retrieve the payment method from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
    if (!paymentMethod) {
      return Response.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    // Find or create a Stripe customer for this user
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      // Search existing customers by email first
      const existing = await stripe.customers.list({ email: user.email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.full_name || user.email,
          metadata: { user_id: user.id }
        });
        customerId = customer.id;
      }
      // Save the customer ID on the user profile
      await base44.auth.updateMe({ stripe_customer_id: customerId });
    }

    // Attach the payment method to the customer (ignore if already attached)
    try {
      await stripe.paymentMethods.attach(payment_method_id, { customer: customerId });
    } catch (attachErr) {
      // Already attached is fine
      if (!attachErr.message?.includes('already been attached')) {
        console.warn('Attach warning:', attachErr.message);
      }
    }

    // Check existing saved methods
    const existingMethods = await base44.asServiceRole.entities.PaymentMethod.filter({
      user_email: user.email,
      status: 'active'
    });

    console.log('Existing payment methods:', existingMethods.length);

    // Avoid duplicate saves
    const alreadySaved = existingMethods.find(m => m.stripe_payment_method_id === payment_method_id);
    if (alreadySaved) {
      return Response.json({ success: true, method: alreadySaved });
    }

    const typeMap = { card: 'card', us_bank_account: 'bank_account' };
    const mappedType = typeMap[paymentMethod.type] || 'card';

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