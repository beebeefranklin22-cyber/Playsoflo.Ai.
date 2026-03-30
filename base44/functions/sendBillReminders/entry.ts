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
    const reminderWindow = new Date(now);
    reminderWindow.setDate(reminderWindow.getDate() + 3); // 3 days before due

    // Get all utility accounts with upcoming due dates
    const allAccounts = await base44.asServiceRole.entities.UtilityAccount.list();
    const accountsNeedingReminder = allAccounts.filter(acc => {
      if (!acc.next_due_date || acc.auto_pay_enabled) return false;
      
      const dueDate = new Date(acc.next_due_date);
      return dueDate > now && dueDate <= reminderWindow;
    });

    const results = {
      reminders_sent: 0,
      failed: 0
    };

    for (const account of accountsNeedingReminder) {
      try {
        const dueDate = new Date(account.next_due_date);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        await base44.asServiceRole.entities.Notification.create({
          recipient_email: account.created_by,
          type: "payment_received",
          title: "Bill Payment Reminder",
          message: `Your ${account.service_name} bill of $${(account.amount_due || 0).toFixed(2)} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. Pay now to avoid late fees.`,
          read: false,
          action_url: "/Utilities"
        });

        results.reminders_sent++;

      } catch (error) {
        console.error('Failed to send reminder:', error);
        results.failed++;
      }
    }

    return Response.json(results);

  } catch (error) {
    console.error('Error sending bill reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});