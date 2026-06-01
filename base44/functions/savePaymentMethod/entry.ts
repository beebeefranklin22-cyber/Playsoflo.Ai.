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

    const { payment_method_id, manual_bank } = await req.json();

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

    if (!payment_method_id) {
      return Response.json({ error: 'Payment method ID required' }, { status: 400 });
    }

    console.log('Saving payment method:', payment_method_id, 'for user:', user.email);

    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);

    if (!paymentMethod) {
      return Response.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { user_id: user.id, user_email: user.email }
      });
      customerId = customer.id;
      await base44.auth.updateMe({ stripe_customer_id: customerId });
    }

    if (paymentMethod.customer && paymentMethod.customer !== customerId) {
      return Response.json({ error: 'This payment method belongs to another customer.' }, { status: 400 });
    }

    if (!paymentMethod.customer) {
      await stripe.paymentMethods.attach(paymentMethod.id, { customer: customerId });
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