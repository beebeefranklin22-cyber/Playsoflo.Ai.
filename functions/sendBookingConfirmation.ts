import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const {
      booking_id,
      service_title,
      provider_email,
      customer_email,
      booking_date,
      booking_time,
      duration_hours,
      total_price,
      confirmation_code,
      customer_notes,
      location
    } = await req.json();

    if (!booking_id || !service_title || !provider_email || !customer_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const formattedDate = new Date(booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send email to customer
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: customer_email,
      subject: `✅ Booking Confirmed - ${service_title}`,
      body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Booking Confirmed! 🎉</h1>
  </div>
  
  <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hi there!</p>
    
    <p style="font-size: 16px; color: #333;">Your booking has been confirmed. Here are the details:</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0; color: #667eea;">Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Service:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${service_title}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Date:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Time:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${booking_time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Duration:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${duration_hours} hour${duration_hours > 1 ? 's' : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Location:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${location}</td>
        </tr>
        <tr style="border-top: 2px solid #eee;">
          <td style="padding: 12px 0; color: #666; font-weight: bold;">Total:</td>
          <td style="padding: 12px 0; font-weight: bold; color: #667eea; font-size: 18px;">$${total_price.toFixed(2)}</td>
        </tr>
      </table>
      
      <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 6px;">
        <p style="margin: 0; color: #666; font-size: 14px;">Confirmation Code:</p>
        <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; color: #667eea; letter-spacing: 2px;">${confirmation_code}</p>
      </div>
    </div>
    
    ${customer_notes ? `
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #856404;"><strong>Your Notes:</strong></p>
      <p style="margin: 10px 0 0; color: #856404;">${customer_notes}</p>
    </div>
    ` : ''}
    
    <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #0369a1; font-size: 14px;">
        <strong>💡 Next Steps:</strong><br>
        • You'll receive a reminder 24 hours before your appointment<br>
        • The provider may contact you to confirm details<br>
        • Please arrive 5-10 minutes early
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Need to make changes? Contact the provider or manage your booking in the app.
    </p>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #999; font-size: 12px;">PlaySoFlo - Your Lifestyle Operating System</p>
    </div>
  </div>
</div>
      `
    });

    // Send email to provider
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: provider_email,
      subject: `🔔 New Booking - ${service_title}`,
      body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">New Booking Received! 📅</h1>
  </div>
  
  <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">You have a new booking for <strong>${service_title}</strong></p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin-top: 0; color: #10b981;">Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Customer:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${customer_email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Date:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Time:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${booking_time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Duration:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${duration_hours} hour${duration_hours > 1 ? 's' : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Location:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${location}</td>
        </tr>
        <tr style="border-top: 2px solid #eee;">
          <td style="padding: 12px 0; color: #666; font-weight: bold;">Total:</td>
          <td style="padding: 12px 0; font-weight: bold; color: #10b981; font-size: 18px;">$${total_price.toFixed(2)}</td>
        </tr>
      </table>
      
      <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 6px;">
        <p style="margin: 0; color: #666; font-size: 14px;">Confirmation Code:</p>
        <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; color: #10b981; letter-spacing: 2px;">${confirmation_code}</p>
      </div>
    </div>
    
    ${customer_notes ? `
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e;"><strong>Customer Notes:</strong></p>
      <p style="margin: 10px 0 0; color: #92400e;">${customer_notes}</p>
    </div>
    ` : ''}
    
    <div style="background: #ddd6fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #5b21b6; font-size: 14px;">
        <strong>👉 Action Required:</strong><br>
        • Confirm the booking in your ProviderHub<br>
        • Review any special requests<br>
        • Prepare materials if needed
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #999; font-size: 12px;">PlaySoFlo Provider Network</p>
    </div>
  </div>
</div>
      `
    });

    // Create notifications in the app
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: customer_email,
      type: 'booking_confirmed',
      title: '✅ Booking Confirmed',
      message: `Your appointment for ${service_title} on ${formattedDate} at ${booking_time} has been confirmed.`,
      reference_type: 'booking',
      reference_id: booking_id
    });

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: provider_email,
      type: 'booking_confirmed',
      title: '🔔 New Booking',
      message: `New booking for ${service_title} on ${formattedDate} at ${booking_time}.`,
      reference_type: 'booking',
      reference_id: booking_id
    });

    return Response.json({ 
      success: true,
      message: 'Booking confirmation emails sent successfully'
    });

  } catch (error) {
    console.error('Booking confirmation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to send booking confirmations' 
    }, { status: 500 });
  }
});