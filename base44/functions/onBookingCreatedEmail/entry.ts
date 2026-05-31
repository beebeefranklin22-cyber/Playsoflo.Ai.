import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation handler — fires when a booking record is created.
// Supports TravelBooking, PropertyBooking, CarRental, and ServiceBooking.
// Sends a confirmation email to the customer and a notification to the provider/host.

function emailHtml({ heading, gradient, accent, title, rows, footer }) {
  const rowsHtml = rows
    .filter(r => r.value !== undefined && r.value !== null && r.value !== '')
    .map(r => `
      <tr${r.total ? ' style="border-top: 2px solid #eee;"' : ''}>
        <td style="padding: ${r.total ? '12px' : '8px'} 0; color: #666;${r.total ? ' font-weight: bold;' : ''}">${r.label}:</td>
        <td style="padding: ${r.total ? '12px' : '8px'} 0; font-weight: bold; color: ${r.total ? accent : '#333'};${r.total ? ' font-size: 18px;' : ''}">${r.value}</td>
      </tr>`).join('');

  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: ${gradient}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">${heading}</h1>
  </div>
  <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">${title}</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${accent};">
      <h3 style="margin-top: 0; color: ${accent};">Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">${rowsHtml}</table>
    </div>
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #999; font-size: 12px;">${footer}</p>
    </div>
  </div>
</div>`;
}

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// Normalize the booking record across the different entity shapes
function normalize(entityName, data) {
  switch (entityName) {
    case 'TravelBooking':
      return {
        kind: 'Experience',
        title: data.listing_title || 'Your booking',
        customer_email: data.customer_email,
        provider_email: data.provider_email,
        total: data.total_amount,
        rows: [
          { label: 'Experience', value: data.listing_title },
          { label: 'Date', value: fmtDate(data.booking_date) },
          { label: 'Time', value: data.booking_time },
          { label: 'Guests', value: data.guests },
        ],
      };
    case 'PropertyBooking':
      return {
        kind: 'Stay',
        title: data.property_name || 'Your stay',
        customer_email: data.customer_email,
        provider_email: data.host_email,
        total: data.total_amount,
        rows: [
          { label: 'Property', value: data.property_name },
          { label: 'Address', value: data.property_address },
          { label: 'Check-in', value: fmtDate(data.check_in_date) },
          { label: 'Check-out', value: fmtDate(data.check_out_date) },
          { label: 'Guests', value: data.guests },
          { label: 'Nights', value: data.total_nights },
        ],
      };
    case 'CarRental':
      return {
        kind: 'Rental',
        title: `${data.car_year || ''} ${data.car_make || ''} ${data.car_model || ''}`.trim() || 'Your rental',
        customer_email: data.renter_email,
        provider_email: data.provider_email,
        total: data.total_amount,
        rows: [
          { label: 'Vehicle', value: `${data.car_year || ''} ${data.car_make || ''} ${data.car_model || ''}`.trim() },
          { label: 'Start', value: fmtDate(data.start_date) },
          { label: 'End', value: fmtDate(data.end_date) },
          { label: 'Pickup', value: data.pickup_location },
        ],
      };
    case 'ServiceBooking':
      return {
        kind: 'Service',
        title: data.service_title || data.service_name || 'Your service booking',
        customer_email: data.customer_email,
        provider_email: data.provider_email,
        total: data.total_amount || data.total_price,
        rows: [
          { label: 'Service', value: data.service_title || data.service_name },
          { label: 'Date', value: fmtDate(data.booking_date) },
          { label: 'Time', value: data.booking_time },
        ],
      };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, payload_too_large } = body;

    const entityName = event?.entity_name;
    let record = data;

    if (payload_too_large && event?.entity_id) {
      record = await base44.asServiceRole.entities[entityName].get(event.entity_id);
    }

    if (!record) {
      return Response.json({ skipped: true, reason: 'No record data' });
    }

    const b = normalize(entityName, record);
    if (!b || !b.customer_email) {
      return Response.json({ skipped: true, reason: 'Unsupported entity or missing customer email' });
    }

    const totalRow = b.total != null
      ? [{ label: 'Total', value: `$${Number(b.total).toFixed(2)}`, total: true }]
      : [];

    // Customer email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: b.customer_email,
      subject: `✅ Booking Confirmed - ${b.title}`,
      body: emailHtml({
        heading: 'Booking Confirmed! 🎉',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        accent: '#667eea',
        title: 'Your booking has been confirmed. Here are the details:',
        rows: [...b.rows, ...totalRow],
        footer: 'PlaySoFlo - Your Lifestyle Operating System',
      }),
    });

    // Provider email (best-effort)
    if (b.provider_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: b.provider_email,
        subject: `🔔 New Booking - ${b.title}`,
        body: emailHtml({
          heading: 'New Booking Received! 📅',
          gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          accent: '#10b981',
          title: `You have a new ${b.kind.toLowerCase()} booking from ${b.customer_email}.`,
          rows: [{ label: 'Customer', value: b.customer_email }, ...b.rows, ...totalRow],
          footer: 'PlaySoFlo Provider Network',
        }),
      });
    }

    // In-app notification to customer
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: b.customer_email,
      type: 'booking_confirmed',
      title: '✅ Booking Confirmed',
      message: `Your ${b.kind.toLowerCase()} booking for ${b.title} has been confirmed.`,
      reference_type: 'booking',
      reference_id: event?.entity_id,
    });

    return Response.json({ success: true, sent_to: b.customer_email, entity: entityName });
  } catch (error) {
    console.error('onBookingCreatedEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});