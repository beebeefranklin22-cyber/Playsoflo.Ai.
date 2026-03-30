import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create' || !data || data.status !== 'active') {
      return Response.json({ success: true, message: 'No action needed' });
    }

    // Get all user job preferences with notifications enabled
    const allPreferences = await base44.asServiceRole.entities.UserJobPreferences.filter({
      notifications_enabled: true
    });

    let notificationsCreated = 0;

    for (const pref of allPreferences) {
      let isMatch = false;

      // Check category match
      if (pref.categories?.length > 0) {
        if (pref.categories.includes(data.category)) {
          isMatch = true;
        }
      }

      // Check job type match
      if (pref.job_types?.length > 0) {
        if (pref.job_types.includes(data.type)) {
          isMatch = true;
        }
      }

      // Check location match
      if (pref.locations?.length > 0 && data.location) {
        const locationMatch = pref.locations.some(loc => 
          data.location.toLowerCase().includes(loc.toLowerCase())
        );
        if (locationMatch) {
          isMatch = true;
        }
      }

      // Check remote preference
      if (pref.remote_only && data.remote_ok) {
        isMatch = true;
      }

      // Check keywords match
      if (pref.keywords?.length > 0) {
        const keywordMatch = pref.keywords.some(keyword => {
          const kw = keyword.toLowerCase();
          return data.title?.toLowerCase().includes(kw) || 
                 data.description?.toLowerCase().includes(kw);
        });
        if (keywordMatch) {
          isMatch = true;
        }
      }

      // Check minimum pay
      if (pref.min_pay && data.pay_rate) {
        const payAmount = parseFloat(data.pay_rate.replace(/[^0-9.]/g, ''));
        if (payAmount < pref.min_pay) {
          isMatch = false;
        }
      }

      // Create notification if matched
      if (isMatch) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: pref.user_email,
          type: 'message',
          title: 'New Job Match',
          message: `New ${data.type} opportunity: ${data.title}`,
          reference_type: 'order',
          reference_id: event.entity_id,
          sender_email: data.poster_email,
          sender_name: data.poster_name || data.company_name,
          action_url: `/CommunityJobs?job=${event.entity_id}`,
          metadata: {
            job_id: event.entity_id,
            category: data.category,
            location: data.location
          }
        });
        notificationsCreated++;
      }
    }

    return Response.json({ 
      success: true, 
      message: `Sent ${notificationsCreated} job match notifications` 
    });
  } catch (error) {
    console.error('Error in notifyJobMatches:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});