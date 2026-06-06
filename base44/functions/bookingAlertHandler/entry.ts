import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Handles two scenarios:
// 1. event.type === "create" → instantly notify provider of new booking request (in-app + email)
// 2. event.type === "update" + booking_status === "confirmed" → email customer that booking is confirmed

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// Normalize across all booking entity shapes
function normalize(entityName, data) {
  switch (entityName) {
    case 'Booking':
      return {
        kind: data.booking_type || 'booking',
        title: data.experience_title || 'Booking',
        customer_email: data.created_by,
        provider_email: data.provider_email,
        date: fmtDate(data.booking_date),
        time: null,
        total: data.total_price_usd,
        status: data.booking_status,
      };
    case 'ServiceBooking':
      return {
        kind: 'service',
        title: data.service_title || data.service_name || 'Service Booking',
        customer_email: data.customer_email,
        provider_email: data.provider_email,
        date: fmtDate(data.booking_date),
        time: data.booking_time,
        total: data.total_amount || data.total_price,
        status: data.status,
      };
    case 'TravelBooking':
      return {
        kind: 'experience',
        title: data.listing_title || 'Experience Booking',
        customer_email: data.customer_email,
        provider_email: data.provider_email,
        date: fmtDate(data.booking_date),
        time: data.booking_time,
        total: data.total_amount,
        status: data.status,
      };
    case 'PropertyBooking':
      return {
        kind: 'property stay',
        title: data.property_name || 'Property Stay',
        customer_email: data.customer_email,
        provider_email: data.host_email,
        date: fmtDate(data.check_in_date),
        time: null,
        total: data.total_amount,
        status: data.status,
      };
    case 'CarRental':
      return {
        kind: 'car rental',
        title: `${data.car_year || ''} ${data.car_make || ''} ${data.car_model || ''}`.trim() || 'Car Rental',
        customer_email: data.renter_email,
        provider_email: data.provider_email,
        date: fmtDate(data.start_date),
        time: null,
        total: data.total_amount,
        status: data.status,
      };
    default:
      return null;
  }
}

function providerNewBookingEmail(b, bookingId, customerName) {
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #059669, #7c3aed); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔔 New Booking Request!</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">Action required — confirm or manage this request</p>
  </div>
  <div style="padding: 32px;">
    <div style="background: rgba(5,150,105,0.15); border: 1px solid rgba(5,150,105,0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: #34d399; margin: 0 0 16px; font-size: 20px;">${b.title}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #94a3b8; width: 40%;">👤 Customer</td><td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${customerName || b.customer_email}</td></tr>
        <tr><td style="padding: 8px 0; color: #94a3b8;">📅 Date</td><td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${b.date}</td></tr>
        ${b.time ? `<tr><td style="padding: 8px 0; color: #94a3b8;">⏰ Time</td><td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${b.time}</td></tr>` : ''}
        ${b.total ? `<tr><td style="padding: 8px 0; color: #94a3b8;">💰 Revenue</td><td style="padding: 8px 0; color: #4ade80; font-weight: bold; font-size: 18px;">$${Number(b.total).toFixed(2)}</td></tr>` : ''}
        ${bookingId ? `<tr><td style="padding: 8px 0; color: #94a3b8;">🔖 Booking ID</td><td style="padding: 8px 0; color: #94a3b8; font-size: 12px;">${bookingId}</td></tr>` : ''}
      </table>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Log in to <strong style="color: #34d399;">PlaySoFlo</strong> → Provider Hub to confirm or manage this booking immediately.</p>
    <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">© PlaySoFlo · Automated provider alert</p>
  </div>
</div>`;
}

function customerConfirmedEmail(b, bookingId, providerName) {
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Booking Confirmed!</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">Your appointment has been secured</p>
  </div>
  <div style="padding: 32px;">
    <div style="background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: #a78bfa; margin: 0 0 16px; font-size: 20px;">${b.title}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #94a3b8; width: 40%;">📅 Date</td><td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${b.date}</td></tr>
        ${b.time ? `<tr><td style="padding: 8px 0; color: #94a3b8;">⏰ Time</td><td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${b.time}</td></tr>` : ''}
        ${providerName ? `<tr><td style="padding: 8px 0; color: #94a3b8;">👤 Provider</td><td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${providerName}</td></tr>` : ''}
        ${b.total ? `<tr><td style="padding: 8px 0; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1);">💳 Total</td><td style="padding: 8px 0; color: #4ade80; font-weight: bold; font-size: 18px; border-top: 1px solid rgba(255,255,255,0.1);">$${Number(b.total).toFixed(2)}</td></tr>` : ''}
      </table>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">View and manage this booking anytime in <strong style="color: #a78bfa;">PlaySoFlo</strong> under My Bookings.</p>
    <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">© PlaySoFlo · Automated booking confirmation</p>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data, payload_too_large } = body;

    const entityName = event?.entity_name;
    const entityId = event?.entity_id;
    const eventType = event?.type;

    let record = data;
    if (payload_too_large && entityId) {
      record = await base44.asServiceRole.entities[entityName].get(entityId);
    }

    if (!record) {
      return Response.json({ skipped: true, reason: 'No record data' });
    }

    const b = normalize(entityName, record);
    if (!b) {
      return Response.json({ skipped: true, reason: 'Unsupported entity' });
    }

    // ── NEW BOOKING CREATED → Alert provider instantly ──
    if (eventType === 'create' && b.provider_email) {
      const customerName = b.customer_email?.split('@')[0] || 'A customer';

      // 1. In-app notification to provider (shows on screen immediately)
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: b.provider_email,
        type: 'booking_request',
        title: '🔔 New Booking Request',
        message: `${customerName} requested a ${b.kind} booking for "${b.title}" on ${b.date}${b.time ? ' at ' + b.time : ''}. Tap to confirm.`,
        reference_type: 'booking',
        reference_id: entityId,
        sender_email: b.customer_email,
        sender_name: customerName,
        read: false,
        action_url: '/ProviderHub',
      });

      // 2. Email to provider
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: b.provider_email,
        subject: `🔔 New Booking Request: ${b.title}`,
        body: providerNewBookingEmail(b, entityId, customerName),
        from_name: 'PlaySoFlo Bookings',
      });

      console.log(`✅ Provider alerted for new booking: ${entityId}`);
    }

    // ── BOOKING CONFIRMED → Email customer confirmation ──
    if (eventType === 'update') {
      const newStatus = b.status;
      const oldStatus = old_data ? normalize(entityName, old_data)?.status : null;

      if (newStatus === 'confirmed' && oldStatus !== 'confirmed' && b.customer_email) {
        // In-app notification to customer
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: b.customer_email,
          type: 'booking_confirmed',
          title: '✅ Booking Confirmed!',
          message: `Your ${b.kind} booking for "${b.title}" on ${b.date} has been confirmed by your provider.`,
          reference_type: 'booking',
          reference_id: entityId,
          read: false,
          action_url: '/CustomerBookings',
        });

        // Email to customer
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: b.customer_email,
          subject: `✅ Booking Confirmed: ${b.title}`,
          body: customerConfirmedEmail(b, entityId, b.provider_email),
          from_name: 'PlaySoFlo Bookings',
        });

        console.log(`✅ Customer confirmation email sent for booking: ${entityId}`);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('bookingAlertHandler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});