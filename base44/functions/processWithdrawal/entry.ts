import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, method, bank_account_id, card_id } = await req.json();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const withdrawMethod = method || 'bank'; // 'instant' | 'bank' | 'card'

    // Fee structure matching the WithdrawModal UI
    let feeAmount = 0;
    if (withdrawMethod === 'instant') {
      feeAmount = 0.50;
    } else if (withdrawMethod === 'card') {
      feeAmount = numAmount * 0.01 + 0.50;
    }
    const totalDeducted = numAmount + feeAmount;

    // Always read fresh balance via service role
    const users = await base44.asServiceRole.entities.User.filter({ email: user.email });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const userData = users[0];
    const currentBalance = parseFloat(userData.usd_balance) || 0;

    if (totalDeducted > currentBalance) {
      return Response.json({
        error: `Insufficient balance. You need $${totalDeducted.toFixed(2)} (includes $${feeAmount.toFixed(2)} fee)`,
        current_balance: currentBalance
      }, { status: 400 });
    }

    // Validate destination based on method
    let destinationLabel = '';
    if (withdrawMethod === 'bank') {
      const bankAccounts = await base44.asServiceRole.entities.BankAccount.filter({
        user_email: user.email,
        is_verified: true
      });
      const bankAccount = bank_account_id
        ? bankAccounts.find(b => b.id === bank_account_id)
        : (bankAccounts.find(b => b.is_primary) || bankAccounts[0]);

      if (!bankAccount) {
        return Response.json({ error: 'No verified bank account found. Please add and verify a bank account first.' }, { status: 400 });
      }
      destinationLabel = `${bankAccount.bank_name || 'Bank'} ••••${bankAccount.account_number_last4 || ''}`;
    } else {
      const cards = await base44.asServiceRole.entities.PaymentCard.filter({
        user_email: user.email
      });
      const card = card_id
        ? cards.find(c => c.id === card_id)
        : (cards.find(c => c.is_primary) || cards[0]);

      if (!card) {
        return Response.json({ error: 'No debit card found. Please add a debit card first.' }, { status: 400 });
      }
      destinationLabel = `${card.brand || 'Card'} ••••${card.last4 || ''}`;
    }

    // Deduct the full amount (withdrawal + fee) from balance
    const newBalance = currentBalance - totalDeducted;
    await base44.asServiceRole.entities.User.update(userData.id, {
      usd_balance: newBalance
    });

    // Record the withdrawal payment (pending until settled by payout provider)
    const payment = await base44.asServiceRole.entities.Payment.create({
      amount_usd: numAmount,
      amount_rri: 0,
      method: withdrawMethod === 'card' ? 'card' : (withdrawMethod === 'bank' ? 'bank' : 'internal_transfer'),
      status: 'pending',
      reference_type: 'withdrawal',
      sender_email: user.email,
      recipient_email: user.email,
      memo: `Withdrawal to ${destinationLabel} (Fee: $${feeAmount.toFixed(2)})`
    });

    // Record platform fee separately if any
    if (feeAmount > 0) {
      await base44.asServiceRole.entities.Payment.create({
        amount_usd: feeAmount,
        amount_rri: 0,
        method: 'internal_transfer',
        status: 'completed',
        reference_type: 'other',
        sender_email: user.email,
        recipient_email: 'platform@playsoflo.com',
        memo: `Withdrawal processing fee (${withdrawMethod})`
      });
    }

    const arrival =
      withdrawMethod === 'instant' ? 'within minutes' :
      withdrawMethod === 'card' ? 'within 30 minutes' :
      '1-3 business days';

    // Notify the user
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: 'payment_received',
      title: '⏳ Withdrawal Initiated',
      message: `Your withdrawal of $${numAmount.toFixed(2)} to ${destinationLabel} is being processed. Fee: $${feeAmount.toFixed(2)}. New balance: $${newBalance.toFixed(2)}. Funds arrive ${arrival}.`,
      read: false,
      reference_type: 'payment',
      reference_id: payment.id,
      action_url: '/Wallet'
    });

    return Response.json({
      success: true,
      message: 'Withdrawal initiated successfully',
      amount: numAmount,
      fee: feeAmount,
      total_deducted: totalDeducted,
      new_balance: newBalance,
      payment_id: payment.id,
      estimated_arrival: arrival
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    return Response.json({
      error: 'Withdrawal processing failed',
      details: error.message
    }, { status: 500 });
  }
});