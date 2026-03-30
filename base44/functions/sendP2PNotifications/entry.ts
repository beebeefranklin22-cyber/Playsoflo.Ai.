import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Automated notification service for P2P trading events
 * This function should be called periodically to check for events requiring notifications
 */
Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: Service Role Authentication
    // ============================================
    const base44 = createClientFromRequest(req);
    
    // This should be called by admin or automated system
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 401 });
    }

    const notificationsSent = [];

    // ============================================
    // STEP 2: Check for Pending Payment Reminders
    // ============================================
    // Find escrows in pending_payment status for > 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const allEscrows = await base44.asServiceRole.entities.P2PEscrow.filter({
      status: 'pending_payment'
    });

    const pendingEscrows = allEscrows.filter(e => 
      new Date(e.created_date) < fifteenMinutesAgo
    );

    for (const escrow of pendingEscrows) {
      // Check if reminder already sent
      const existingReminders = await base44.asServiceRole.entities.Notification.filter({
        recipient_email: escrow.buyer_email,
        type: 'reminder',
        message: { $regex: escrow.order_id }
      });

      if (existingReminders.length === 0) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: escrow.buyer_email,
          type: 'reminder',
          title: '⏰ Payment reminder for P2P order',
          message: `Don't forget to submit payment for your ${escrow.crypto_currency} order. Order ID: ${escrow.order_id}`,
          read: false,
          action_url: '/MyP2POrders'
        });

        notificationsSent.push({ type: 'payment_reminder', email: escrow.buyer_email });
      }
    }

    // ============================================
    // STEP 3: Check for Stale Payment Confirmations
    // ============================================
    // Find escrows in payment_submitted for > 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const submittedEscrows = allEscrows.filter(e => 
      e.status === 'payment_submitted' && 
      new Date(e.payment_confirmed_at) < thirtyMinutesAgo
    );

    for (const escrow of submittedEscrows) {
      // Get order details
      const orders = await base44.asServiceRole.entities.P2POrder.filter({
        id: escrow.order_id
      });

      if (orders.length > 0) {
        const order = orders[0];

        // Check if reminder already sent
        const existingReminders = await base44.asServiceRole.entities.Notification.filter({
          recipient_email: order.seller_email,
          type: 'reminder',
          message: { $regex: escrow.order_id }
        });

        if (existingReminders.length === 0) {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: order.seller_email,
            type: 'reminder',
            title: '⏰ Release escrow reminder',
            message: `Payment was confirmed 30+ minutes ago. Please verify and release escrow for ${escrow.crypto_amount} ${escrow.crypto_currency}.`,
            read: false,
            action_url: '/MyP2POrders'
          });

          notificationsSent.push({ type: 'release_reminder', email: order.seller_email });
        }
      }
    }

    // ============================================
    // STEP 4: Check for Abandoned Disputes
    // ============================================
    // Find disputes older than 24 hours without admin action
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const disputedEscrows = await base44.asServiceRole.entities.P2PEscrow.filter({
      status: 'disputed'
    });

    const oldDisputes = disputedEscrows.filter(e => 
      new Date(e.updated_date) < oneDayAgo
    );

    if (oldDisputes.length > 0) {
      // Notify all admins
      const adminUsers = await base44.asServiceRole.entities.User.filter({ 
        role: 'admin' 
      });

      for (const admin of adminUsers) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: admin.email,
          type: 'alert',
          title: `🚨 ${oldDisputes.length} unresolved P2P disputes`,
          message: `${oldDisputes.length} dispute(s) pending for 24+ hours. Immediate attention required.`,
          read: false,
          action_url: '/MyP2POrders'
        });
      }

      notificationsSent.push({ type: 'dispute_escalation', count: oldDisputes.length });
    }

    // ============================================
    // STEP 5: Return Summary
    // ============================================
    return Response.json({
      success: true,
      notifications_sent: notificationsSent.length,
      details: notificationsSent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending P2P notifications:', error);
    return Response.json({ 
      error: error.message || 'Failed to send notifications',
      type: error.type || 'unknown_error'
    }, { status: 500 });
  }
});