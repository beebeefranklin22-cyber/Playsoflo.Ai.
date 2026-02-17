import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;

    // Comprehensive deletion of ALL user data across ALL entities
    const entitiesToClean = [
      // Social & Content
      'SocialPost', 'Story', 'Comment', 'Follow', 'FollowRequest', 'Friendship', 'FriendRequest',
      'VideoPost', 'VideoComment', 'VideoLike', 'ForumThread', 'ForumPost', 'ForumReply', 'ForumLike',
      'NewsPost', 'LivestreamChat', 'LivestreamChatMessage', 'LivestreamReaction', 'LivestreamTicket',
      'CoStreamParticipant', 'StreamGoal', 'WatchParty', 'WatchPartyMessage', 'Challenge',
      
      // Communications
      'Notification', 'ChatMessage', 'ChatConversation', 'DirectMessage', 'UserPresence',
      'SupportTicket', 'SupportMessage',
      
      // Transactions & Financial
      'Booking', 'Order', 'Cart', 'CartItem', 'Payment', 'StripePayment', 'P2PTransaction',
      'TipTransaction', 'Donation', 'EscrowTransaction', 'PayoutRequest', 'PayoutMethod',
      'FailedPayment', 'BillPayment', 'CryptoTransaction', 'P2POrder', 'P2PEscrow',
      'CryptoWallet', 'BankAccount', 'PaymentCard', 'PaymentMethod', 'PhysicalCardRequest',
      'Staking', 'DeFiPosition', 'TaxReport', 'ContentPurchase', 'PPVPurchase',
      
      // Services & Bookings
      'RideRequest', 'EntertainmentTicket', 'ServiceBooking', 'FoodOrder', 'DeliveryOrder',
      'CarRental', 'DamageSettlement',
      
      // Real Estate
      'Lease', 'RentPayment', 'LeaseApplication', 'LeaseDocument', 'MaintenanceRequest', 'Property',
      
      // Marketplace & Products
      'Experience', 'MarketplaceItem', 'CreatorProduct', 'DigitalProduct', 'Service',
      'Restaurant', 'MenuItem', 'StoreSettings', 'StockAlert',
      
      // Music & Media
      'MusicTrack', 'MusicAlbum', 'ListeningHistory', 'MusicDistribution', 'MusicContract',
      'MusicDealApplication', 'MusicMastering', 'RoyaltySplit', 'RoyaltyEarnings', 'RoyaltyPayout',
      'FanPool', 'StreamingContent', 'CollaborativeVideo', 'VideoTemplate',
      
      // Affiliates & Jobs
      'AffiliateListing', 'AffiliateReview', 'AffiliateReferral', 'TicketAffiliate',
      'JobGig', 'UserJobPreferences',
      
      // Groups & Forums
      'ForumGroup', 'SavedGroup',
      
      // User Data
      'UserPresence', 'UserInteraction', 'PortfolioItem', 'UserGallery', 'UserReview',
      'UserInterests', 'UserVehicle', 'OnboardingProgress', 'UserInventory',
      'NotificationPreferences', 'AIRecommendation', 'ViewerAnalytics',
      
      // Gaming
      'GameSession', 'GameScore', 'GameItem', 'GamePremiumSubscription',
      
      // Ratings & Reviews
      'Rating', 'DriverRating', 'TraderRating',
      
      // Analytics & Ads
      'AdCampaign', 'ContentAnalytics', 'CreatorMetrics', 'DriverStats',
      
      // Documents & Collaboration
      'CollaborativeDocument', 'DocumentComment', 'DocumentPresence', 'Collaboration',
      'SharedContentLibrary', 'ContentEdit',
      
      // Subscriptions & Memberships
      'Subscription', 'UserSubscription', 'CreatorSubscription', 'MembershipSubscription',
      'SubscriptionTier', 'CreatorMembership',
      
      // Provider & Business
      'ProviderVerification', 'ProviderOnboarding', 'ProviderAvailability', 'ServiceAvailabilityOverride',
      'ServiceAgreement', 'ServiceContract', 'DeliveryFranchise', 'DeliveryVehicle',
      
      // Misc
      'ErrorLog', 'Asset', 'Dispute', 'TravelAlert', 'UtilityAccount', 
      'PasswordEntry', 'TwoFactorCode', 'SyncRequest', 'SyncMessage',
      'CrowdfundingCampaign', 'CampaignBacker', 'SponsoredContent', 'AITool',
      'RevenueShare', 'LivestreamSchedule', 'LivestreamPoll', 'PollVote', 'QAQuestion',
      'ModerationFlag', 'LivestreamPricingTier', 'PPVContent'
    ];

    const emailFields = [
      'created_by', 'user_email', 'buyer_email', 'seller_email', 'tenant_email', 
      'landlord_email', 'driver_email', 'passenger_email', 'recipient_email', 
      'sender_email', 'follower_email', 'following_email', 'artist_email', 
      'creator_email', 'provider_email', 'tipper_email', 'reviewer_email',
      'poster_email', 'author_email', 'host_email', 'participant_email',
      'owner_email', 'customer_email', 'from_email', 'to_email',
      'investor_email', 'backer_email', 'merchant_email', 'vendor_email',
      'trader_email', 'agent_email', 'moderator_email', 'invited_by'
    ];

    for (const entityName of entitiesToClean) {
      try {
        // Build dynamic filter for all possible email fields
        const orConditions = emailFields.map(field => ({ [field]: userEmail }));
        const records = await base44.asServiceRole.entities[entityName].filter({
          $or: orConditions
        });

        for (const record of records) {
          await base44.asServiceRole.entities[entityName].delete(record.id);
        }
        
        if (records.length > 0) {
          console.log(`Deleted ${records.length} records from ${entityName}`);
        }
      } catch (error) {
        console.log(`Cleanup ${entityName}:`, error.message);
      }
    }

    // COMPLETE DATA PURGE: Delete the User entity entirely (permanent deletion)
    // This ensures NO user data remains in the system per App Store requirements
    try {
      await base44.asServiceRole.entities.User.delete(user.id);
      console.log(`User ${userEmail} permanently deleted from User entity`);
    } catch (error) {
      console.error('Failed to delete User entity:', error);
      // If deletion fails, anonymize as fallback
      const authData = {
        account_status: 'deleted',
        email: `deleted_${Date.now()}@deleted.invalid`,
        full_name: 'Deleted User',
        profile_photo: null,
        cover_photo: null,
        profile_picture: null,
        bio: null,
        username: null,
        phone: null,
        address: null,
        website: null,
        social_links: null,
        interests: [],
        spotify_access_token: null,
        notification_preferences: null,
        privacy_settings: null,
        usd_balance: 0,
        soflo_balance: 0,
        crypto_balances: null,
        kyc_verified: false,
        stripe_customer_id: null,
        stripe_account_id: null
      };
      await base44.asServiceRole.entities.User.update(user.id, authData);
    }

    return Response.json({ 
      success: true, 
      message: 'Account and all associated data have been permanently deleted per App Store requirements.' 
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});