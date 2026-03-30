import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 401 });
    }

    const { targetEmail, correctBalance } = await req.json();

    if (!targetEmail || correctBalance === undefined) {
      return Response.json({ error: 'Missing targetEmail or correctBalance' }, { status: 400 });
    }

    // Find user
    const users = await base44.asServiceRole.entities.User.filter({ 
      email: targetEmail 
    });

    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    const oldBalance = targetUser.usd_balance || 0;

    // Update balance
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      usd_balance: correctBalance
    });

    // Delete all duplicate/incorrect payment records created by fixPendingDeposits
    const allPayments = await base44.asServiceRole.entities.Payment.filter({
      sender_email: targetEmail
    });

    // Keep only legitimate payments, delete retroactive fix payments
    let deleted = 0;
    for (const payment of allPayments) {
      if (payment.memo && payment.memo.includes('retroactive fix')) {
        await base44.asServiceRole.entities.Payment.delete(payment.id);
        deleted++;
      }
    }

    // Reset all StripePayment statuses back to pending
    const stripePayments = await base44.asServiceRole.entities.StripePayment.filter({
      user_email: targetEmail
    });

    for (const sp of stripePayments) {
      if (sp.status === 'succeeded' && sp.reference_type === 'deposit') {
        await base44.asServiceRole.entities.StripePayment.update(sp.id, {
          status: 'pending'
        });
      }
    }

    return Response.json({
      success: true,
      oldBalance,
      newBalance: correctBalance,
      paymentsDeleted: deleted,
      message: `Reset ${targetEmail} balance from $${oldBalance} to $${correctBalance}, deleted ${deleted} incorrect payment records`
    });

  } catch (error) {
    console.error('Error resetting balance:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});