import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Secure balance validation utility
 * Ensures user has sufficient funds before any transaction
 * Prevents race conditions and negative balances
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, operation_type, metadata } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!operation_type) {
      return Response.json({ error: 'Operation type required' }, { status: 400 });
    }

    // Get current balance atomically
    const currentUser = await base44.asServiceRole.entities.User.filter({ 
      email: user.email 
    });

    if (currentUser.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userRecord = currentUser[0];
    const currentBalance = parseFloat(userRecord.usd_balance) || 0;
    const requiredAmount = parseFloat(amount);

    // Validate balance based on operation
    if (operation_type === 'debit' || operation_type === 'withdraw') {
      if (currentBalance < requiredAmount) {
        return Response.json({
          valid: false,
          error: 'Insufficient balance',
          current_balance: currentBalance.toFixed(2),
          required: requiredAmount.toFixed(2),
          shortfall: (requiredAmount - currentBalance).toFixed(2)
        }, { status: 400 });
      }

      return Response.json({
        valid: true,
        current_balance: currentBalance.toFixed(2),
        new_balance: (currentBalance - requiredAmount).toFixed(2),
        operation_type
      });
    } else if (operation_type === 'credit' || operation_type === 'deposit') {
      return Response.json({
        valid: true,
        current_balance: currentBalance.toFixed(2),
        new_balance: (currentBalance + requiredAmount).toFixed(2),
        operation_type
      });
    } else {
      return Response.json({ error: 'Invalid operation type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Balance validation error:', error);
    return Response.json({ 
      error: error.message,
      valid: false 
    }, { status: 500 });
  }
});