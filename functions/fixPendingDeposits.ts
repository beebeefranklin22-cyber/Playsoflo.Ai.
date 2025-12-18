import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 401 });
    }

    // Get all pending stripe payments
    const pendingPayments = await base44.asServiceRole.entities.StripePayment.filter({
      status: 'pending'
    });

    let fixed = 0;
    const results = [];

    for (const payment of pendingPayments) {
      try {
        if (payment.reference_type === 'deposit' && payment.user_email) {
          const baseAmount = payment.metadata?.base_amount || payment.amount / 2;
          const platformFee = payment.metadata?.platform_fee || payment.amount / 2;
          const netAmount = baseAmount;

          // Find user
          const users = await base44.asServiceRole.entities.User.filter({ 
            email: payment.user_email 
          });

          if (users.length > 0) {
            const targetUser = users[0];
            const currentBalance = targetUser.usd_balance || 0;
            const newBalance = currentBalance + netAmount;

            // Update user balance
            await base44.asServiceRole.entities.User.update(targetUser.id, {
              usd_balance: newBalance
            });

            // Create payment record
            await base44.asServiceRole.entities.Payment.create({
              amount_usd: netAmount,
              amount_rri: 0,
              method: 'stripe',
              status: 'completed',
              reference_type: 'deposit',
              reference_id: payment.stripe_payment_intent_id,
              sender_email: payment.user_email,
              recipient_email: payment.user_email,
              memo: `Wallet deposit (retroactive fix) - Fee: $${platformFee.toFixed(2)}`
            });

            // Update stripe payment status
            await base44.asServiceRole.entities.StripePayment.update(payment.id, {
              status: 'succeeded'
            });

            // Notify user
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: payment.user_email,
              type: 'payment_received',
              title: '✅ Missing Balance Restored',
              message: `We've added your missing $${netAmount.toFixed(2)} deposit to your wallet. New balance: $${newBalance.toFixed(2)}`,
              reference_type: 'payment',
              reference_id: payment.id
            });

            fixed++;
            results.push({
              user: payment.user_email,
              amount: netAmount,
              newBalance: newBalance
            });
          }
        }
      } catch (error) {
        console.error('Error processing payment:', payment.id, error);
      }
    }

    return Response.json({
      success: true,
      fixed,
      results,
      message: `Fixed ${fixed} pending deposits`
    });

  } catch (error) {
    console.error('Error fixing deposits:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});