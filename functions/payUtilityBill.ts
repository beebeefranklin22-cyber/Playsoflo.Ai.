import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { utility_account_id, payment_method, payment_method_id } = await req.json();

    if (!utility_account_id) {
      return Response.json({ error: 'utility_account_id required' }, { status: 400 });
    }

    // Get utility account
    const account = await base44.entities.UtilityAccount.filter({ id: utility_account_id });
    
    if (!account || account.length === 0) {
      return Response.json({ error: 'Utility account not found' }, { status: 404 });
    }

    const utilityAccount = account[0];
    const amount = utilityAccount.amount_due || 0;

    if (amount <= 0) {
      return Response.json({ error: 'No amount due' }, { status: 400 });
    }

    // Check balance if paying from wallet
    if (payment_method === 'wallet_balance' || !payment_method) {
      if (user.usd_balance < amount) {
        return Response.json({ 
          error: 'Insufficient balance',
          required: amount,
          available: user.usd_balance
        }, { status: 400 });
      }

      // Deduct from wallet
      await base44.entities.User.update(user.id, {
        usd_balance: user.usd_balance - amount
      });
    }

    // Create payment record
    const payment = await base44.entities.Payment.create({
      amount_usd: amount,
      amount_rri: 0,
      method: payment_method || "wallet_balance",
      status: "completed",
      reference_type: "utility",
      reference_id: utility_account_id,
      memo: `Payment for ${utilityAccount.service_name || utilityAccount.provider_name}`
    });

    // Create bill payment record
    const billPayment = await base44.entities.BillPayment.create({
      utility_account_id: utility_account_id,
      amount: amount,
      payment_date: new Date().toISOString(),
      due_date: utilityAccount.next_due_date,
      status: "completed",
      payment_method: payment_method || "wallet_balance",
      payment_method_id: payment_method_id,
      is_automatic: false,
      transaction_id: payment.id,
      confirmation_number: `BILL-${Date.now()}`
    });

    // Update utility account - calculate next due date
    const updates = {
      last_payment_date: new Date().toISOString(),
      amount_due: 0
    };

    if (utilityAccount.is_recurring && utilityAccount.next_due_date) {
      const nextDue = new Date(utilityAccount.next_due_date);
      
      switch (utilityAccount.recurrence_interval) {
        case 'weekly':
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case 'bi-weekly':
          nextDue.setDate(nextDue.getDate() + 14);
          break;
        case 'quarterly':
          nextDue.setMonth(nextDue.getMonth() + 3);
          break;
        case 'yearly':
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
        default: // monthly
          nextDue.setMonth(nextDue.getMonth() + 1);
      }
      
      updates.next_due_date = nextDue.toISOString();
    }

    await base44.entities.UtilityAccount.update(utility_account_id, updates);

    // Send notification
    await base44.entities.Notification.create({
      recipient_email: user.email,
      type: "payment_received",
      title: "Bill Payment Successful",
      message: `Your ${utilityAccount.service_name || utilityAccount.provider_name} bill of $${amount.toFixed(2)} has been paid successfully.`,
      read: false,
      action_url: "/Utilities"
    });

    return Response.json({
      success: true,
      payment: payment,
      bill_payment: billPayment,
      confirmation_number: billPayment.confirmation_number
    });

  } catch (error) {
    console.error('Error paying utility bill:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});