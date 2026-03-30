import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, category } = await req.json();

    if (!subject) {
      return Response.json({ error: 'Subject required' }, { status: 400 });
    }

    // Generate ticket number
    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Gather user context (non-sensitive data)
    const context = await gatherUserContext(base44, user.email);

    // Create ticket
    const ticket = await base44.asServiceRole.entities.SupportTicket.create({
      ticket_number: ticketNumber,
      user_email: user.email,
      subject,
      category: category || 'general',
      status: 'ai_handling',
      user_context: context
    });

    // Create initial AI greeting message
    await base44.asServiceRole.entities.SupportMessage.create({
      ticket_id: ticket.id,
      sender_email: 'ai@support',
      sender_type: 'ai',
      message: `Hello! I'm your AI support assistant. I understand you need help with: "${subject}". I'm here to assist you. Could you provide more details about your issue?`,
      ai_generated: true
    });

    return Response.json({ ticket });

  } catch (error) {
    console.error('Create ticket error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function gatherUserContext(base44, userEmail) {
  try {
    // Get active rentals (non-sensitive data)
    const rentals = await base44.asServiceRole.entities.CarRental.filter({
      renter_email: userEmail,
      status: { $in: ['confirmed', 'active'] }
    });

    // Get active deliveries
    const deliveries = await base44.asServiceRole.entities.DeliveryOrder.filter({
      $or: [
        { sender_email: userEmail },
        { recipient_email: userEmail }
      ],
      status: { $ne: 'delivered' }
    });

    // Get recent orders (limited)
    const orders = await base44.asServiceRole.entities.Order.filter({
      user_email: userEmail
    });

    // Get user data
    const users = await base44.asServiceRole.entities.User.filter({
      email: userEmail
    });
    const userData = users[0];

    const accountAgeDays = userData?.created_date 
      ? Math.floor((Date.now() - new Date(userData.created_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      active_rentals: rentals.map(r => r.id),
      active_deliveries: deliveries.map(d => d.id),
      recent_orders: orders.slice(0, 5).map(o => o.id),
      account_age_days: accountAgeDays,
      total_transactions: orders.length + rentals.length + deliveries.length
    };
  } catch (error) {
    console.log('Context gathering error:', error);
    return {};
  }
}