import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticket_id, message, attachments } = await req.json();

    if (!ticket_id || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get ticket
    const tickets = await base44.asServiceRole.entities.SupportTicket.filter({ id: ticket_id });
    if (tickets.length === 0) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticket = tickets[0];

    // Verify user has access
    if (ticket.user_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create user message
    const userMessage = await base44.asServiceRole.entities.SupportMessage.create({
      ticket_id,
      sender_email: user.email,
      sender_type: 'user',
      message,
      attachments: attachments || []
    });

    // If ticket is in AI handling mode, generate AI response
    if (ticket.status === 'ai_handling') {
      try {
        // Get conversation history
        const messages = await base44.asServiceRole.entities.SupportMessage.filter({
          ticket_id,
          is_internal: false
        });

        const conversationHistory = messages
          .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
          .map(m => `${m.sender_type}: ${m.message}`)
          .join('\n');

        // Generate AI response
        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a customer support AI assistant. Based on the conversation history and the ticket category "${ticket.category}", provide a helpful response.

Conversation:
${conversationHistory}

Provide a helpful, friendly response. If the issue requires human assistance (payment disputes, complex technical issues, escalations), suggest that the user can request a human agent. Keep responses concise and actionable.`,
          response_json_schema: {
            type: "object",
            properties: {
              response: { type: "string" },
              should_escalate: { type: "boolean" },
              escalation_reason: { type: "string" }
            }
          }
        });

        // Create AI message
        await base44.asServiceRole.entities.SupportMessage.create({
          ticket_id,
          sender_email: 'ai@support',
          sender_type: 'ai',
          message: aiResponse.response,
          ai_generated: true
        });

        // Auto-escalate if needed
        if (aiResponse.should_escalate) {
          await base44.asServiceRole.entities.SupportTicket.update(ticket_id, {
            status: 'escalated',
            escalation_reason: aiResponse.escalation_reason
          });
        }
      } catch (error) {
        console.log('AI response error:', error);
      }
    }

    return Response.json({ success: true, message: userMessage });

  } catch (error) {
    console.error('Send message error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});