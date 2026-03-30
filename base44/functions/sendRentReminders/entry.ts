import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active leases
    const activeLeases = await base44.asServiceRole.entities.Lease.filter({ status: 'active' });
    
    const today = new Date();
    const todayDay = today.getDate();
    const notifications = [];
    
    for (const lease of activeLeases) {
      // Parse rent due date
      const rentDueDay = lease.rent_due_day || 1; // Default to 1st of month
      const lastPayment = await base44.asServiceRole.entities.RentPayment.filter({
        lease_id: lease.id
      });
      
      // Sort by payment date to get the most recent
      const sortedPayments = lastPayment.sort((a, b) => 
        new Date(b.payment_date) - new Date(a.payment_date)
      );
      const mostRecentPayment = sortedPayments[0];
      
      // Check if payment for current month exists
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const hasCurrentMonthPayment = sortedPayments.some(p => {
        const paymentDate = new Date(p.payment_date);
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear;
      });
      
      // Calculate days until/past due
      let nextDueDate = new Date(currentYear, currentMonth, rentDueDay);
      if (nextDueDate < today && !hasCurrentMonthPayment) {
        // Overdue
        const daysOverdue = Math.floor((today - nextDueDate) / (1000 * 60 * 60 * 24));
        
        // Send overdue reminders at 3, 7, 14, 30 days
        if ([3, 7, 14, 30].includes(daysOverdue)) {
          notifications.push({
            recipient_email: lease.tenant_email,
            type: "rent_overdue",
            title: "Rent Payment Overdue",
            message: `Your rent payment of $${lease.monthly_rent} is ${daysOverdue} days overdue. Please pay as soon as possible to avoid late fees.`,
            reference_type: "lease",
            reference_id: lease.id,
            sender_email: lease.landlord_email,
            sender_name: lease.landlord_name,
            action_url: `/landlord-tenant-portal`,
            read: false,
            priority: daysOverdue >= 14 ? "high" : "medium"
          });
          
          // Notify landlord about overdue payment
          notifications.push({
            recipient_email: lease.landlord_email,
            type: "rent_overdue_landlord",
            title: "Tenant Rent Overdue",
            message: `${lease.tenant_name}'s rent payment of $${lease.monthly_rent} is ${daysOverdue} days overdue for ${lease.property_address}.`,
            reference_type: "lease",
            reference_id: lease.id,
            sender_email: "system",
            action_url: `/landlord-tenant-portal`,
            read: false,
            priority: daysOverdue >= 14 ? "high" : "medium"
          });
        }
        
        // Update lease status if severely overdue
        if (daysOverdue >= 30 && lease.status !== 'payment_overdue') {
          await base44.asServiceRole.entities.Lease.update(lease.id, {
            status: 'payment_overdue',
            overdue_days: daysOverdue
          });
        }
      } else if (!hasCurrentMonthPayment) {
        // Upcoming - send reminder 7, 3, and 1 day before
        const daysUntilDue = Math.floor((nextDueDate - today) / (1000 * 60 * 60 * 24));
        
        if ([7, 3, 1].includes(daysUntilDue)) {
          notifications.push({
            recipient_email: lease.tenant_email,
            type: "rent_reminder",
            title: "Rent Payment Reminder",
            message: `Your rent payment of $${lease.monthly_rent} is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}. Please ensure timely payment.`,
            reference_type: "lease",
            reference_id: lease.id,
            sender_email: lease.landlord_email,
            sender_name: lease.landlord_name,
            action_url: `/landlord-tenant-portal`,
            read: false,
            priority: "medium"
          });
        }
      }
    }
    
    // Send all notifications
    const notificationPromises = notifications.map(notif => 
      base44.asServiceRole.entities.Notification.create(notif)
    );
    
    await Promise.all(notificationPromises);
    
    return Response.json({
      success: true,
      reminders_sent: notifications.length,
      message: `Processed ${activeLeases.length} leases, sent ${notifications.length} notifications`
    });
    
  } catch (error) {
    console.error('Rent reminder error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});