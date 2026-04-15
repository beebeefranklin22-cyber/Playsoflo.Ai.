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

    // Get recent successful checkout sessions for this user
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
      customer: undefined // Will search by metadata
    });

    const userSessions = sessions.data.filter(s => 
      s.metadata?.user_email === user.email && 
      s.payment_status === 'paid' &&
      s.metadata?.description === 'Add money to wallet'
    );

    const processedDeposits = [];

    for (const session of userSessions) {
      const baseAmount = parseFloat(session.metadata?.base_amount || '0');
      
      // Check if already processed
      const existingPayments = await base44.entities.Payment.filter({
        reference_id: session.id,
        reference_type: 'deposit'
      });

      if (existingPayments.length === 0 && baseAmount > 0) {
        // Process this deposit
        const currentUser = await base44.asServiceRole.entities.User.filter({ email: user.email });
        
        if (currentUser.length > 0) {
          const currentBalance = currentUser[0].usd_balance || 0;
          const newBalance = currentBalance + baseAmount;
          
          await base44.asServiceRole.entities.User.update(currentUser[0].id, {
            usd_balance: newBalance
          });

          await base44.entities.Payment.create({
            amount_usd: baseAmount,
            method: 'stripe',
            status: 'completed',
            reference_type: 'deposit',
            reference_id: session.id,
            sender_email: user.email,
            memo: 'Wallet deposit via Stripe (manual sync)'
          });

          processedDeposits.push({
            amount: baseAmount,
            session_id: session.id,
            new_balance: newBalance
          });
        }
      }
    }

    return Response.json({
      success: true,
      processed: processedDeposits.length,
      deposits: processedDeposits,
      message: processedDeposits.length > 0 
        ? `✅ Processed ${processedDeposits.length} pending deposit(s)` 
        : 'No pending deposits found'
    });

  } catch (error) {
    console.error('Check pending deposits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});