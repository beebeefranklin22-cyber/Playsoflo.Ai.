import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active leases
    const leases = await base44.asServiceRole.entities.Lease.filter({ status: 'active' });
    
    const now = new Date();
    const reminders = [];
    
    for (const lease of leases) {
      const endDate = new Date(lease.lease_end_date);
      const daysUntilEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      // Send reminders at 90, 60, and 30 days before lease end
      if (daysUntilEnd === 90 || daysUntilEnd === 60 || daysUntilEnd === 30) {
        // Notify landlord
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: lease.landlord_email,
          subject: `Lease Renewal Reminder - ${lease.property_address}`,
          body: `Hello ${lease.landlord_name},\n\nThis is a reminder that the lease for ${lease.property_address} with tenant ${lease.tenant_name} will expire in ${daysUntilEnd} days on ${endDate.toLocaleDateString()}.\n\nPlease reach out to your tenant to discuss renewal options.`
        });
        
        // Notify tenant
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: lease.tenant_email,
          subject: `Lease Renewal Notice - ${lease.property_address}`,
          body: `Hello ${lease.tenant_name},\n\nThis is a reminder that your lease for ${lease.property_address} will expire in ${daysUntilEnd} days on ${endDate.toLocaleDateString()}.\n\nPlease contact your landlord ${lease.landlord_name} to discuss renewal options.`
        });
        
        reminders.push({
          lease_id: lease.id,
          days_until_end: daysUntilEnd,
          property: lease.property_address
        });
      }
      
      // Mark leases as expiring soon
      if (daysUntilEnd <= 30 && lease.status === 'active') {
        await base44.asServiceRole.entities.Lease.update(lease.id, {
          status: 'expiring_soon'
        });
      }
      
      // Mark expired leases
      if (daysUntilEnd < 0 && lease.status !== 'expired') {
        await base44.asServiceRole.entities.Lease.update(lease.id, {
          status: 'expired'
        });
      }
    }
    
    return Response.json({
      success: true,
      reminders_sent: reminders.length,
      details: reminders
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});