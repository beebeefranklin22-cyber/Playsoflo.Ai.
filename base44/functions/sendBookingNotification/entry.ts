import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { 
      recipientEmail, 
      type, 
      bookingId, 
      bookingTitle,
      bookingDate,
      bookingTime,
      providerName,
      customerName,
      totalPrice
    } = await req.json();

    if (!recipientEmail || !type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let title = '';
    let message = '';
    let actionUrl = '';
    let emailSubject = '';
    let emailBody = '';

    const formattedDate = bookingDate ? new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

    switch (type) {
      case 'booking_confirmed':
        title = '✅ Booking Confirmed';
        message = `Your booking for "${bookingTitle}" on ${formattedDate} at ${bookingTime} has been confirmed.`;
        actionUrl = '/CustomerBookings';
        emailSubject = `✅ Booking Confirmed: ${bookingTitle}`;
        emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Booking Confirmed!</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">Your appointment has been secured</p>
  </div>
  <div style="padding: 32px;">
    <div style="background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: #a78bfa; margin: 0 0 16px; font-size: 20px;">${bookingTitle}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #94a3b8; width: 40%;">📅 Date</td>
          <td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">⏰ Time</td>
          <td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${bookingTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">👤 Provider</td>
          <td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${providerName || 'Your Provider'}</td>
        </tr>
        ${totalPrice ? `<tr>
          <td style="padding: 8px 0; color: #94a3b8;">💳 Total Paid</td>
          <td style="padding: 8px 0; color: #4ade80; font-weight: bold; font-size: 18px;">$${totalPrice}</td>
        </tr>` : ''}
        ${bookingId ? `<tr>
          <td style="padding: 8px 0; color: #94a3b8;">🔖 Booking ID</td>
          <td style="padding: 8px 0; color: #94a3b8; font-size: 12px;">${bookingId}</td>
        </tr>` : ''}
      </table>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">You can view and manage this booking anytime in the <strong style="color: #a78bfa;">PlaySoFlo app</strong> under My Bookings.</p>
    <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">© PlaySoFlo · This is an automated confirmation email.</p>
  </div>
</div>`;
        break;
      
      case 'new_booking':
        title = '🎉 New Booking Request';
        message = `${customerName} booked "${bookingTitle}" on ${formattedDate} at ${bookingTime}`;
        actionUrl = '/ProviderHub';
        emailSubject = `🎉 New Booking: ${bookingTitle}`;
        emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #059669, #7c3aed); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 New Booking!</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">You have a new appointment</p>
  </div>
  <div style="padding: 32px;">
    <div style="background: rgba(5,150,105,0.15); border: 1px solid rgba(5,150,105,0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: #34d399; margin: 0 0 16px; font-size: 20px;">${bookingTitle}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #94a3b8; width: 40%;">👤 Customer</td>
          <td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${customerName || 'Customer'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">📅 Date</td>
          <td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">⏰ Time</td>
          <td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">${bookingTime}</td>
        </tr>
        ${totalPrice ? `<tr>
          <td style="padding: 8px 0; color: #94a3b8;">💰 Revenue</td>
          <td style="padding: 8px 0; color: #4ade80; font-weight: bold; font-size: 18px;">$${totalPrice}</td>
        </tr>` : ''}
      </table>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Log in to <strong style="color: #34d399;">PlaySoFlo</strong> to view and manage this booking in your Provider Hub.</p>
    <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">© PlaySoFlo · This is an automated provider notification.</p>
  </div>
</div>`;
        break;
      
      case 'booking_cancelled':
        title = '❌ Booking Cancelled';
        message = `The booking for "${bookingTitle}" on ${formattedDate} has been cancelled.`;
        actionUrl = '/CustomerBookings';
        emailSubject = `❌ Booking Cancelled: ${bookingTitle}`;
        emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #dc2626, #9333ea); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">❌ Booking Cancelled</h1>
  </div>
  <div style="padding: 32px;">
    <p style="color: #f1f5f9; font-size: 16px;">Your booking for <strong>${bookingTitle}</strong> on <strong>${formattedDate}</strong> has been cancelled.</p>
    <p style="color: #94a3b8; font-size: 14px;">If you have any questions, please contact your provider or reach out to PlaySoFlo support.</p>
    <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">© PlaySoFlo · This is an automated cancellation notice.</p>
  </div>
</div>`;
        break;
      
      case 'booking_reminder':
        title = '⏰ Upcoming Appointment';
        message = `Reminder: "${bookingTitle}" is tomorrow at ${bookingTime}`;
        actionUrl = '/CustomerBookings';
        emailSubject = `⏰ Reminder: ${bookingTitle} is Tomorrow`;
        emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #d97706, #7c3aed); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Appointment Reminder</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Your appointment is coming up!</p>
  </div>
  <div style="padding: 32px;">
    <div style="background: rgba(217,119,6,0.15); border: 1px solid rgba(217,119,6,0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: #fbbf24; margin: 0 0 12px;">${bookingTitle}</h2>
      <p style="color: #f1f5f9; margin: 4px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
      <p style="color: #f1f5f9; margin: 4px 0;"><strong>⏰ Time:</strong> ${bookingTime}</p>
      ${providerName ? `<p style="color: #f1f5f9; margin: 4px 0;"><strong>👤 Provider:</strong> ${providerName}</p>` : ''}
    </div>
    <p style="color: #94a3b8; font-size: 14px;">Please be on time. If you need to reschedule, open the PlaySoFlo app as soon as possible.</p>
    <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">© PlaySoFlo · This is an automated reminder.</p>
  </div>
</div>`;
        break;

      case 'payment_completed':
        title = '💳 Payment Successful';
        message = `Payment of $${totalPrice} for "${bookingTitle}" was successful.`;
        actionUrl = '/Wallet';
        emailSubject = `💳 Payment Receipt: $${totalPrice} for ${bookingTitle}`;
        emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #059669, #0891b2); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">💳 Payment Receipt</h1>
  </div>
  <div style="padding: 32px;">
    <div style="background: rgba(5,150,105,0.15); border: 1px solid rgba(5,150,105,0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="color: #94a3b8; margin: 0 0 4px; font-size: 14px;">Amount Paid</p>
      <p style="color: #4ade80; font-size: 40px; font-weight: bold; margin: 0;">$${totalPrice}</p>
      <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">for ${bookingTitle}</p>
    </div>
    <p style="color: #94a3b8; font-size: 14px;">Your payment has been processed successfully. View your full transaction history in the Wallet section of PlaySoFlo.</p>
    <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">© PlaySoFlo · This is an automated payment receipt.</p>
  </div>
</div>`;
        break;
      
      case 'payment_received':
        title = '💰 Payment Received';
        message = `You received $${totalPrice} from ${customerName} for "${bookingTitle}"`;
        actionUrl = '/ProviderHub?tab=earnings';
        // No email for provider payment received — in-app notification is sufficient
        break;

      default:
        title = 'Notification';
        message = 'You have a new notification';
    }

    // Create in-app notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email: recipientEmail,
      type: type,
      title: title,
      message: message,
      reference_type: 'booking',
      reference_id: bookingId,
      sender_name: (type.includes('new_booking') || type.includes('payment_received')) ? customerName : providerName,
      read: false,
      action_url: actionUrl
    });

    // Send email if we have a body
    if (emailSubject && emailBody) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: emailSubject,
        body: emailBody,
        from_name: 'PlaySoFlo'
      });
      console.log('✅ Email sent to:', recipientEmail);
    }

    console.log('✅ Notification created:', notification.id);

    return Response.json({ 
      success: true, 
      notification_id: notification.id 
    });

  } catch (error) {
    console.error('❌ Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});