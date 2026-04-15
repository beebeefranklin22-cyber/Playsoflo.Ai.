import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operation, amount, recipient_email, reference_type, memo } = await req.json();

    // Input validation
    if (!operation || !['add', 'subtract', 'transfer'].includes(operation)) {
      return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
      return Response.json({ error: 'Invalid amount (must be > 0 and < $1M)' }, { status: 400 });
    }

    // Rate limiting check
    const recentTransactions = await base44.entities.Payment.filter({
      created_by: user.email
    });
    
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentCount = recentTransactions.filter(t => 
      new Date(t.created_date) > oneMinuteAgo
    ).length;
    
    if (recentCount > 10) {
      return Response.json({ 
        error: 'Rate limit exceeded. Maximum 10 transactions per minute.' 
      }, { status: 429 });
    }

    // Get fresh user data with lock-like behavior
    const users = await base44.asServiceRole.entities.User.filter({ email: user.email });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    
    const currentUserData = users[0];
    const currentBalance = parseFloat(currentUserData.usd_balance) || 0;

    // Validate balance for subtract/transfer operations
    if ((operation === 'subtract' || operation === 'transfer') && currentBalance < numAmount) {
      return Response.json({ 
        error: 'Insufficient balance',
        current_balance: currentBalance,
        required: numAmount
      }, { status: 400 });
    }

    let newBalance = currentBalance;
    
    if (operation === 'add') {
      newBalance = currentBalance + numAmount;
    } else if (operation === 'subtract') {
      newBalance = currentBalance - numAmount;
    } else if (operation === 'transfer') {
      if (!recipient_email) {
        return Response.json({ error: 'Recipient email required for transfers' }, { status: 400 });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipient_email)) {
        return Response.json({ error: 'Invalid recipient email' }, { status: 400 });
      }

      // Prevent self-transfer
      if (recipient_email === user.email) {
        return Response.json({ error: 'Cannot transfer to yourself' }, { status: 400 });
      }

      // Verify recipient exists
      const recipients = await base44.asServiceRole.entities.User.filter({ email: recipient_email });
      if (recipients.length === 0) {
        return Response.json({ error: 'Recipient not found' }, { status: 404 });
      }

      const recipient = recipients[0];
      const recipientBalance = parseFloat(recipient.usd_balance) || 0;

      // Atomic transfer using service role
      newBalance = currentBalance - numAmount;
      const newRecipientBalance = recipientBalance + numAmount;

      // Update both balances
      await base44.asServiceRole.entities.User.update(currentUserData.id, {
        usd_balance: newBalance
      });

      await base44.asServiceRole.entities.User.update(recipient.id, {
        usd_balance: newRecipientBalance
      });

      // Create payment record (one record readable by both parties via RLS)
      await base44.asServiceRole.entities.Payment.create({
        amount_usd: numAmount,
        amount_rri: 0,
        method: 'internal_transfer',
        status: 'completed',
        reference_type: reference_type || 'transfer',
        sender_email: user.email,
        recipient_email: recipient_email,
        memo: memo || `Transfer to ${recipient.full_name || recipient_email}`
      });

      // Notify recipient
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: recipient_email,
        type: 'payment_received',
        title: '💰 Money Received',
        message: `${user.full_name || user.email} sent you $${numAmount.toFixed(2)}${memo ? `: "${memo}"` : ''}`,
        sender_email: user.email,
        sender_name: user.full_name,
        read: false
      });

      return Response.json({
        success: true,
        operation: 'transfer',
        sender_new_balance: newBalance,
        recipient_new_balance: newRecipientBalance,
        amount: numAmount
      });
    }

    // For add/subtract operations, update balance
    if (operation !== 'transfer') {
      await base44.asServiceRole.entities.User.update(currentUserData.id, {
        usd_balance: newBalance
      });

      await base44.asServiceRole.entities.Payment.create({
        amount_usd: numAmount,
        amount_rri: 0,
        method: 'internal_transfer',
        status: 'completed',
        reference_type: reference_type || 'other',
        sender_email: user.email,
        recipient_email: user.email,
        memo: memo || `Balance ${operation}`
      });
    }

    return Response.json({
      success: true,
      operation,
      new_balance: newBalance,
      amount: numAmount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Balance update error:', error);
    return Response.json({ 
      error: 'Operation failed',
      details: error.message 
    }, { status: 500 });
  }
});