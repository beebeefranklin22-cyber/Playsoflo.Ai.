import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { listing_type, listing_id, action } = await req.json();

    // Fetch all users who might be interested
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    const notificationPromises = [];

    for (const user of allUsers) {
      const prefs = user.notification_preferences || {};
      
      // Check if user wants new listing notifications
      if (prefs.new_listings !== false) {
        notificationPromises.push(
          base44.asServiceRole.entities.Notification.create({
            user_email: user.email,
            title: `New ${listing_type} available!`,
            message: `A new ${listing_type} has been listed on the platform.`,
            type: 'new_listing',
            read: false,
            metadata: { listing_type, listing_id, action }
          })
        );
      }
    }

    await Promise.all(notificationPromises);

    return Response.json({ 
      success: true,
      notifications_sent: notificationPromises.length
    });

  } catch (error) {
    console.error('Listing notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});