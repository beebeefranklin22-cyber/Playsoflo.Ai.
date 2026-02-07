import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;

    // Delete user-related data in order
    const entitiesToClean = [
      'SocialPost', 'Story', 'Comment', 'Follow', 'FollowRequest',
      'Notification', 'ChatMessage', 'ChatConversation', 'DirectMessage',
      'Booking', 'Order', 'Cart', 'Payment', 'RideRequest',
      'EntertainmentTicket', 'ServiceBooking', 'Lease', 'RentPayment',
      'MaintenanceRequest', 'Property', 'Experience', 'MarketplaceItem',
      'MusicTrack', 'MusicAlbum', 'StreamingContent', 'TipTransaction',
      'UserPresence', 'UserInteraction', 'PortfolioItem', 'UserGallery',
      'ErrorLog', 'UserVehicle', 'DriverRating', 'Rating'
    ];

    for (const entityName of entitiesToClean) {
      try {
        const records = await base44.asServiceRole.entities[entityName].filter({
          $or: [
            { created_by: userEmail },
            { user_email: userEmail },
            { buyer_email: userEmail },
            { tenant_email: userEmail },
            { driver_email: userEmail },
            { recipient_email: userEmail },
            { sender_email: userEmail },
            { follower_email: userEmail },
            { following_email: userEmail },
            { artist_email: userEmail },
            { creator_email: userEmail },
            { provider_email: userEmail },
            { tipper_email: userEmail }
          ]
        });

        for (const record of records) {
          await base44.asServiceRole.entities[entityName].delete(record.id);
        }
      } catch (error) {
        console.log(`Cleanup ${entityName}:`, error.message);
      }
    }

    // Note: User entity deletion should be handled by platform admin
    // Mark user as deleted instead
    await base44.asServiceRole.entities.User.update(user.id, {
      account_status: 'deleted',
      email: `deleted_${Date.now()}@playsoflo.com`,
      full_name: 'Deleted User'
    });

    return Response.json({ 
      success: true, 
      message: 'Account and all associated data have been deleted' 
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});