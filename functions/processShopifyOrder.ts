import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { session_id, order_id } = await req.json();

    if (!session_id || !order_id) {
      return Response.json({ error: 'Missing session_id or order_id' }, { status: 400 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);

    // Retrieve the session to confirm payment
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Get order
    const order = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (order.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = order[0];

    // Update order status
    await base44.asServiceRole.entities.Order.update(order_id, {
      status: 'confirmed',
      stripe_session_id: session_id
    });

    // Create payment record
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: orderData.total_amount,
      method: 'stripe',
      status: 'completed',
      reference_type: 'order',
      reference_id: order_id,
      sender_email: orderData.user_email,
      memo: `Shopify product: ${orderData.product_name}`
    });

    // Track affiliate if present
    if (orderData.affiliate_link) {
      const commission = orderData.total_amount * 0.05; // 5% commission
      
      await base44.asServiceRole.entities.AffiliateReferral.create({
        affiliate_program: 'shopify',
        referral_code: orderData.user_email, 
        referred_user_email: orderData.user_email,
        status: 'completed',
        commission_amount: commission,
        conversion_date: new Date().toISOString()
      });

      // Update user's referral earnings
      const users = await base44.asServiceRole.entities.User.filter({ email: orderData.user_email });
      if (users.length > 0) {
        const currentUser = users[0];
        await base44.asServiceRole.entities.User.update(currentUser.id, {
          total_referral_earnings: (currentUser.total_referral_earnings || 0) + commission
        });
      }
    }

    // Send confirmation email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: orderData.user_email,
      subject: '✅ Order Confirmed - PlaySoFlo Marketplace',
      body: `Your order for ${orderData.product_name} has been confirmed!\n\nOrder #${order_id}\nTotal: $${orderData.total_amount.toFixed(2)}\n\nYour item will be shipped within 2-5 business days. You'll receive tracking information via email.`
    });

    return Response.json({
      success: true,
      message: 'Order processed successfully',
      order_id: order_id
    });

  } catch (error) {
    console.error('Order processing error:', error);
    return Response.json({ 
      error: 'Order processing failed',
      details: error.message 
    }, { status: 500 });
  }
});