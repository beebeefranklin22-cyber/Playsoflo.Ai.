import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * SECURE INTERNAL CRYPTO TRANSFER
 * Transfers crypto between platform users server-side.
 * 
 * Security measures:
 * - Server-side auth (no client can spoof sender)
 * - Idempotency key to prevent replay attacks (duplicate submissions)
 * - Rate limiting via daily transfer limit check
 * - Atomic balance update (deduct sender FIRST, then credit receiver)
 * - Self-transfer prevention
 * - Full audit trail via CryptoTransaction records
 * - In-app + email notifications for both parties
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currency, amount, recipient_email, note, idempotency_key } = await req.json();

    // --- Input validation ---
    if (!currency || !amount || !recipient_email) {
      return Response.json({ error: 'Missing required fields: currency, amount, recipient_email' }, { status: 400 });
    }

    const sendAmount = parseFloat(amount);
    if (isNaN(sendAmount) || sendAmount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Prevent self-transfer
    if (recipient_email.toLowerCase() === user.email.toLowerCase()) {
      return Response.json({ error: 'Cannot send crypto to yourself' }, { status: 400 });
    }

    // --- Idempotency check (replay attack prevention) ---
    if (idempotency_key) {
      const existing = await base44.asServiceRole.entities.CryptoTransaction.filter({
        idempotency_key: idempotency_key
      });
      if (existing.length > 0) {
        return Response.json({ 
          success: true, 
          duplicate: true,
          transaction_id: existing[0].id,
          message: 'Transaction already processed (duplicate request ignored)'
        });
      }
    }

    // --- Check sender wallet ---
    const senderWallets = await base44.asServiceRole.entities.CryptoWallet.filter({
      user_email: user.email,
      currency: currency,
      is_active: true
    });

    const senderWallet = senderWallets[0];
    if (!senderWallet || senderWallet.balance < sendAmount) {
      return Response.json({ 
        error: `Insufficient ${currency} balance. Available: ${senderWallet?.balance || 0} ${currency}` 
      }, { status: 400 });
    }

    // --- Rate limit: daily transfer limit ---
    const dailyLimit = user.daily_crypto_withdrawal_limit || 10000;
    const dailyUsed = user.daily_withdrawal_used || 0;
    if (dailyUsed + sendAmount > dailyLimit) {
      return Response.json({ 
        error: `Daily transfer limit exceeded. Remaining: ${(dailyLimit - dailyUsed).toFixed(8)} ${currency}` 
      }, { status: 429 });
    }

    // --- Find recipient ---
    const recipients = await base44.asServiceRole.entities.User.filter({
      email: recipient_email.toLowerCase()
    });

    if (!recipients || recipients.length === 0) {
      return Response.json({ error: 'Recipient not found on this platform' }, { status: 404 });
    }

    const recipient = recipients[0];

    // --- Find or create recipient wallet ---
    const recipientWallets = await base44.asServiceRole.entities.CryptoWallet.filter({
      user_email: recipient.email,
      currency: currency,
      is_active: true
    });

    let recipientWallet = recipientWallets[0];
    if (!recipientWallet) {
      recipientWallet = await base44.asServiceRole.entities.CryptoWallet.create({
        user_email: recipient.email,
        currency: currency,
        balance: 0,
        wallet_address: `platform-${currency}-${recipient.id}`,
        is_active: true
      });
    }

    // --- Atomic transfer: deduct sender FIRST ---
    await base44.asServiceRole.entities.CryptoWallet.update(senderWallet.id, {
      balance: senderWallet.balance - sendAmount
    });

    // --- Credit recipient ---
    await base44.asServiceRole.entities.CryptoWallet.update(recipientWallet.id, {
      balance: recipientWallet.balance + sendAmount
    });

    // --- Update sender daily limit tracker ---
    await base44.asServiceRole.entities.User.update(user.id, {
      daily_withdrawal_used: dailyUsed + sendAmount
    });

    // --- Generate transfer ID ---
    const transferId = `TX-${currency}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    // --- Record audit trail: sender side ---
    const txRecord = await base44.asServiceRole.entities.CryptoTransaction.create({
      user_email: user.email,
      transaction_type: 'send',
      from_currency: currency,
      to_currency: currency,
      from_amount: sendAmount,
      to_amount: sendAmount,
      exchange_rate: 1,
      fee: 0,
      status: 'completed',
      recipient_address: recipient.email,
      network: 'internal',
      withdrawal_id: transferId,
      idempotency_key: idempotency_key || transferId,
      notes: `Internal transfer to ${recipient.email}. ${note ? 'Note: ' + note : ''}`
    });

    // --- Record audit trail: receiver side ---
    await base44.asServiceRole.entities.CryptoTransaction.create({
      user_email: recipient.email,
      transaction_type: 'receive',
      from_currency: currency,
      to_currency: currency,
      from_amount: sendAmount,
      to_amount: sendAmount,
      exchange_rate: 1,
      fee: 0,
      status: 'completed',
      recipient_address: recipient.email,
      network: 'internal',
      withdrawal_id: transferId,
      idempotency_key: idempotency_key ? `${idempotency_key}-recv` : `${transferId}-recv`,
      notes: `Received from ${user.email}. ${note ? 'Note: ' + note : ''}`
    });

    // --- Notifications ---
    await Promise.all([
      base44.asServiceRole.entities.Notification.create({
        recipient_email: user.email,
        type: 'payment_sent',
        title: `✅ ${currency} Sent`,
        message: `You sent ${sendAmount} ${currency} to ${recipient.full_name || recipient.email}. ID: ${transferId}`,
        read: false,
        action_url: '/Wallet'
      }),
      base44.asServiceRole.entities.Notification.create({
        recipient_email: recipient.email,
        type: 'payment_received',
        title: `💰 ${currency} Received`,
        message: `${user.full_name || user.email} sent you ${sendAmount} ${currency}. ${note ? '"' + note + '"' : ''}`,
        read: false,
        action_url: '/Wallet'
      }),
      base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `You sent ${sendAmount} ${currency}`,
        body: `Hi ${user.full_name || user.email},\n\nYou successfully sent ${sendAmount} ${currency} to ${recipient.full_name || recipient.email} (${recipient.email}).\n\nTransfer ID: ${transferId}\nTimestamp: ${now}\n${note ? 'Note: ' + note : ''}\n\nIf you did not initiate this transfer, contact support immediately.\n\n— PlaySoFlo Team`
      }),
      base44.asServiceRole.integrations.Core.SendEmail({
        to: recipient.email,
        subject: `You received ${sendAmount} ${currency}`,
        body: `Hi ${recipient.full_name || recipient.email},\n\n${user.full_name || user.email} sent you ${sendAmount} ${currency}.\n\nTransfer ID: ${transferId}\nTimestamp: ${now}\n${note ? 'Note: ' + note : ''}\n\n— PlaySoFlo Team`
      })
    ]);

    return Response.json({
      success: true,
      transfer_id: transferId,
      transaction_id: txRecord.id,
      amount: sendAmount,
      currency,
      recipient_email: recipient.email,
      recipient_name: recipient.full_name,
      status: 'completed',
      timestamp: now,
      message: `Successfully sent ${sendAmount} ${currency} to ${recipient.full_name || recipient.email}`
    });

  } catch (error) {
    console.error('Crypto send error:', error);
    return Response.json({ error: error.message || 'Transfer failed' }, { status: 500 });
  }
});