import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Ticketmaster/Impact Radius webhook data
    const webhookData = await req.json();
    
    // Extract conversion data (format depends on Impact Radius)
    const {
      affiliate_code,
      event_id,
      order_amount,
      commission_amount,
      status,
      transaction_id
    } = webhookData;

    if (status === 'approved' || status === 'converted') {
      // Find the original click record
      const clicks = await base44.asServiceRole.entities.TicketAffiliate.filter({
        affiliate_code
      });

      if (clicks.length > 0) {
        const click = clicks[0];
        
        // Update with conversion data
        await base44.asServiceRole.entities.TicketAffiliate.update(click.id, {
          conversion_status: 'converted',
          ticket_price: order_amount,
          commission_amount: commission_amount || (order_amount * (click.commission_rate / 100)),
          conversion_date: new Date().toISOString()
        });

        // Notify admin
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        
        for (const admin of admins) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: admin.email,
            type: 'affiliate_commission',
            title: '🎫 Ticket Commission Earned!',
            message: `You earned $${(commission_amount || (order_amount * (click.commission_rate / 100))).toFixed(2)} commission from ${click.event_name}`,
            read: false
          });
        }

        return Response.json({ success: true, message: 'Conversion tracked' });
      }
    }

    return Response.json({ success: true, message: 'Webhook received' });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});