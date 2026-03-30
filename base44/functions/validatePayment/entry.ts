import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, recipient_email, type, reference_id } = await req.json();

    const errors = [];

    // Validate amount
    if (!amount || typeof amount !== 'number') {
      errors.push('Invalid amount');
    } else if (amount <= 0) {
      errors.push('Amount must be greater than $0');
    } else if (amount > 1000000) {
      errors.push('Amount exceeds maximum limit ($1,000,000)');
    }

    // Validate recipient for transfers
    if (type === 'transfer' || type === 'p2p') {
      if (!recipient_email) {
        errors.push('Recipient email required');
      } else if (recipient_email === user.email) {
        errors.push('Cannot send money to yourself');
      } else if (!recipient_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push('Invalid recipient email format');
      }

      // Verify recipient exists
      const recipients = await base44.asServiceRole.entities.User.filter({ email: recipient_email });
      if (recipients.length === 0) {
        errors.push('Recipient not found');
      }
    }

    // Check sender balance
    if (type === 'transfer' || type === 'payment') {
      if ((user.balance_usd || 0) < amount) {
        errors.push('Insufficient balance');
      }
    }

    // Validate reference
    if (reference_id) {
      if (typeof reference_id !== 'string' || reference_id.length > 100) {
        errors.push('Invalid reference ID');
      }
    }

    // Rate limiting check
    const recentPayments = await base44.entities.Payment.filter({
      sender_email: user.email,
      created_date: { $gte: new Date(Date.now() - 60000).toISOString() } // Last minute
    });

    if (recentPayments.length >= 10) {
      errors.push('Rate limit exceeded (max 10 transactions per minute)');
    }

    // Check for duplicate transactions
    if (type === 'payment' && reference_id) {
      const duplicates = await base44.entities.Payment.filter({
        sender_email: user.email,
        reference_id: reference_id,
        status: 'completed',
        created_date: { $gte: new Date(Date.now() - 300000).toISOString() } // Last 5 minutes
      });

      if (duplicates.length > 0) {
        errors.push('Duplicate transaction detected');
      }
    }

    if (errors.length > 0) {
      return Response.json({ 
        valid: false, 
        errors 
      }, { status: 400 });
    }

    return Response.json({ 
      valid: true,
      errors: [],
      validated_amount: Number(amount.toFixed(2)),
      sender_balance: user.balance_usd || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Payment validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});