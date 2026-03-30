import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id, event_name, ticket_url, price_min, price_max } = await req.json();

    // Generate unique affiliate code
    const affiliateCode = `TM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Record click
    await base44.asServiceRole.entities.TicketAffiliate.create({
      event_id,
      event_name,
      user_email: user.email,
      click_timestamp: new Date().toISOString(),
      conversion_status: 'clicked',
      affiliate_code: affiliateCode,
      commission_rate: 5
    });

    // Build tracking URL with affiliate parameters
    // Impact Radius tracking format: impact.com redirect or append tracking params
    const trackingUrl = new URL(ticket_url);
    trackingUrl.searchParams.append('tm_link', affiliateCode);
    trackingUrl.searchParams.append('source', 'sofloworld');

    return Response.json({
      tracking_url: trackingUrl.toString(),
      affiliate_code: affiliateCode
    });

  } catch (error) {
    console.error('Ticket tracking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});