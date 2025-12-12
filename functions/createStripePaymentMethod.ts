import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
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
    const { type, token, bank_account, external_account } = await req.json();

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

    let paymentMethod;
    let paymentMethodData = { type, user_email: user.email };

    if (type === 'card') {
      // Create card payment method from token
      const card = await stripe.paymentMethods.create({
        type: 'card',
        card: { token }
      });
      
      await stripe.paymentMethods.attach(card.id, { customer: customer.id });
      
      paymentMethodData.stripe_payment_method_id = card.id;
      paymentMethodData.card_details = {
        last4: card.card.last4,
        brand: card.card.brand,
        exp_month: card.card.exp_month,
        exp_year: card.card.exp_year
      };

      paymentMethod = card;
    } else if (type === 'bank_account') {
      // Create bank account payment method
      const bankAccount = await stripe.customers.createSource(customer.id, {
        source: bank_account.token
      });

      paymentMethodData.stripe_payment_method_id = bankAccount.id;
      paymentMethodData.bank_details = {
        last4: bankAccount.last4,
        bank_name: bankAccount.bank_name,
        account_type: bankAccount.account_holder_type
      };

      paymentMethod = bankAccount;
    } else if (['cashapp', 'venmo', 'paypal'].includes(type)) {
      // Store external payment details
      paymentMethodData.external_details = external_account;
      paymentMethod = { id: `${type}_${Date.now()}` };
    }

    // Check if this is the first payment method
    const existingMethods = await base44.entities.PaymentMethod.filter({
      user_email: user.email,
      status: 'active'
    });

    paymentMethodData.is_default = existingMethods.length === 0;

    // Save to database
    const savedMethod = await base44.entities.PaymentMethod.create(paymentMethodData);

    return Response.json({ 
      success: true, 
      payment_method: savedMethod,
      stripe_customer_id: customer.id
    });
  } catch (error) {
    console.error('Payment method creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});