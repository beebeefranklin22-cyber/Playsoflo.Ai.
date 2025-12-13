import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This should be called by a scheduled job (cron)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all utility accounts with autopay enabled and upcoming due dates
    const allAccounts = await base44.asServiceRole.entities.UtilityAccount.list();
    const accountsWithAutopay = allAccounts.filter(acc => 
      acc.auto_pay_enabled && 
      acc.next_due_date && 
      new Date(acc.next_due_date) <= tomorrow
    );

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const account of accountsWithAutopay) {
      try {
        results.processed++;

        // Get user
        const users = await base44.asServiceRole.entities.User.filter({ 
          email: account.created_by 
        });
        
        if (!users || users.length === 0) {
          throw new Error('User not found');
        }
        
        const user = users[0];
        const amount = account.amount_due || 0;

        // Check if user has sufficient balance
        if (user.usd_balance < amount) {
          throw new Error('Insufficient balance');
        }

        // Deduct from user balance
        await base44.asServiceRole.entities.User.update(user.id, {
          usd_balance: user.usd_balance - amount
        });

        // Create payment record
        const payment = await base44.asServiceRole.entities.Payment.create({
          amount_usd: amount,
          amount_rri: 0,
          method: "wallet_balance",
          status: "completed",
          reference_type: "utility",
          reference_id: account.id,
          memo: `Automatic payment for ${account.service_name}`
        });

        // Create bill payment record
        await base44.asServiceRole.entities.BillPayment.create({
          utility_account_id: account.id,
          amount: amount,
          payment_date: now.toISOString(),
          due_date: account.next_due_date,
          status: "completed",
          payment_method: "wallet_balance",
          is_automatic: true,
          transaction_id: payment.id,
          confirmation_number: `AUTO-${Date.now()}`
        });

        // Update utility account - set next due date (monthly recurring)
        const nextDueDate = new Date(account.next_due_date);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);

        await base44.asServiceRole.entities.UtilityAccount.update(account.id, {
          next_due_date: nextDueDate.toISOString(),
          last_payment_date: now.toISOString()
        });

        // Send success notification
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: user.email,
          type: "payment_received",
          title: "Bill Payment Successful",
          message: `Your ${account.service_name} bill of $${amount.toFixed(2)} has been paid automatically.`,
          read: false,
          action_url: "/Utilities"
        });

        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          account_id: account.id,
          service: account.service_name,
          error: error.message
        });

        // Send failure notification
        try {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: account.created_by,
            type: "payment_received",
            title: "Auto-Pay Failed",
            message: `Failed to automatically pay ${account.service_name} bill: ${error.message}. Please pay manually.`,
            read: false,
            action_url: "/Utilities"
          });

          // Create failed bill payment record
          await base44.asServiceRole.entities.BillPayment.create({
            utility_account_id: account.id,
            amount: account.amount_due || 0,
            payment_date: now.toISOString(),
            due_date: account.next_due_date,
            status: "failed",
            payment_method: "wallet_balance",
            is_automatic: true,
            error_message: error.message
          });
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
        }
      }
    }

    return Response.json(results);

  } catch (error) {
    console.error('Error processing automated payments:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});