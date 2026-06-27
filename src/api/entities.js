import { supabase } from '@/lib/supabaseClient';

class Entity {
  constructor(tableName) { this.tableName = tableName; }

  async list(filters = {}, { orderBy, orderDesc, limit } = {}) {
    let q = supabase.from(this.tableName).select('*');
    Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
    if (orderBy) q = q.order(orderBy, { ascending: !orderDesc });
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  async filter(filters = {}, options = {}) { return this.list(filters, options); }

  async get(id) {
    const { data, error } = await supabase.from(this.tableName).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async create(data) {
    const payload = { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data: row, error } = await supabase.from(this.tableName).insert(payload).select().single();
    if (error) throw error;
    return row;
  }

  async update(id, data) {
    const payload = { ...data, updated_at: new Date().toISOString() };
    const { data: row, error } = await supabase.from(this.tableName).update(payload).eq('id', id).select().single();
    if (error) throw error;
    return row;
  }

  async delete(id) {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
  }

  async orderByDesc(field, limit = 100) { return this.list({}, { orderBy: field, orderDesc: true, limit }); }

  subscribe(callback) {
    const channel = supabase.channel(`${this.tableName}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: this.tableName }, callback)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }
}

class UserEntity extends Entity {
  constructor() { super('profiles'); }

  async me() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    return data ? { id: session.user.id, email: session.user.email, ...data } : null;
  }

  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  async logout() { await supabase.auth.signOut(); }

  async updateMyProfile(updates) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    const { data, error } = await supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', session.user.id).select().single();
    if (error) throw error;
    return data;
  }
}

export const User                        = new UserEntity();
export const AIRecommendation            = new Entity('ai_recommendations');
export const AITool                      = new Entity('ai_tools');
export const AdCampaign                  = new Entity('ad_campaigns');
export const AffiliateListing            = new Entity('affiliate_listings');
export const AffiliateReferral           = new Entity('affiliate_referrals');
export const AffiliateReview             = new Entity('affiliate_reviews');
export const AmazonOrder                 = new Entity('amazon_orders');
export const Asset                       = new Entity('assets');
export const BankAccount                 = new Entity('bank_accounts');
export const BillPayment                 = new Entity('bill_payments');
export const Block                       = new Entity('blocks');
export const Booking                     = new Entity('bookings');
export const CampaignBacker              = new Entity('campaign_backers');
export const CarRental                   = new Entity('car_rentals');
export const Cart                        = new Entity('carts');
export const CartItem                    = new Entity('cart_items');
export const Challenge                   = new Entity('challenges');
export const ChatConversation            = new Entity('chat_conversations');
export const ChatMessage                 = new Entity('chat_messages');
export const CoStreamParticipant         = new Entity('co_stream_participants');
export const Collaboration               = new Entity('collaborations');
export const CollaborativeDocument       = new Entity('collaborative_documents');
export const CollaborativeVideo          = new Entity('collaborative_videos');
export const Comment                     = new Entity('comments');
export const ContentAnalytics            = new Entity('content_analytics');
export const ContentEdit                 = new Entity('content_edits');
export const ContentPurchase             = new Entity('content_purchases');
export const CreatorMembership           = new Entity('creator_memberships');
export const CreatorMetrics              = new Entity('creator_metrics');
export const CreatorProduct              = new Entity('creator_products');
export const CreatorSubscription         = new Entity('creator_subscriptions');
export const CrowdfundingCampaign        = new Entity('crowdfunding_campaigns');
export const CryptoReward                = new Entity('crypto_rewards');
export const CryptoTransaction           = new Entity('crypto_transactions');
export const CryptoWallet                = new Entity('crypto_wallets');
export const DamageSettlement            = new Entity('damage_settlements');
export const DeFiPosition                = new Entity('defi_positions');
export const DeliveryFranchise           = new Entity('delivery_franchises');
export const DeliveryOrder               = new Entity('delivery_orders');
export const DeliveryVehicle             = new Entity('delivery_vehicles');
export const DigitalProduct              = new Entity('digital_products');
export const DirectMessage               = new Entity('direct_messages');
export const Dispute                     = new Entity('disputes');
export const DocumentComment             = new Entity('document_comments');
export const DocumentPresence            = new Entity('document_presences');
export const Donation                    = new Entity('donations');
export const DriverRating                = new Entity('driver_ratings');
export const DriverStats                 = new Entity('driver_stats');
export const EntertainmentTicket         = new Entity('entertainment_tickets');
export const ErrorLog                    = new Entity('error_logs');
export const EscrowTransaction           = new Entity('escrow_transactions');
export const Event                       = new Entity('events');
export const Experience                  = new Entity('experiences');
export const FailedPayment               = new Entity('failed_payments');
export const FanPool                     = new Entity('fan_pools');
export const Follow                      = new Entity('follows');
export const FollowRequest               = new Entity('follow_requests');
export const FoodOrder                   = new Entity('food_orders');
export const ForumGroup                  = new Entity('forum_groups');
export const ForumLike                   = new Entity('forum_likes');
export const ForumPost                   = new Entity('forum_posts');
export const ForumReply                  = new Entity('forum_replies');
export const ForumThread                 = new Entity('forum_threads');
export const FriendRequest               = new Entity('friend_requests');
export const Friendship                  = new Entity('friendships');
export const GameItem                    = new Entity('game_items');
export const GamePremiumSubscription     = new Entity('game_premium_subscriptions');
export const GameScore                   = new Entity('game_scores');
export const GameSession                 = new Entity('game_sessions');
export const HelpGuide                   = new Entity('help_guides');
export const InventoryProduct            = new Entity('inventory_products');
export const JobApplication              = new Entity('job_applications');
export const JobGig                      = new Entity('job_gigs');
export const Lease                       = new Entity('leases');
export const LeaseApplication            = new Entity('lease_applications');
export const LeaseDocument               = new Entity('lease_documents');
export const ListeningHistory            = new Entity('listening_histories');
export const LivestreamChat              = new Entity('livestream_chats');
export const LivestreamChatMessage       = new Entity('livestream_chat_messages');
export const LivestreamPoll              = new Entity('livestream_polls');
export const LivestreamPricingTier       = new Entity('livestream_pricing_tiers');
export const LivestreamReaction          = new Entity('livestream_reactions');
export const LivestreamSchedule          = new Entity('livestream_schedules');
export const LivestreamTicket            = new Entity('livestream_tickets');
export const MaintenanceRequest          = new Entity('maintenance_requests');
export const MarketplaceItem             = new Entity('marketplace_items');
export const MembershipSubscription      = new Entity('membership_subscriptions');
export const MenuItem                    = new Entity('menu_items');
export const ModerationFlag              = new Entity('moderation_flags');
export const MusicAlbum                  = new Entity('music_albums');
export const MusicContract               = new Entity('music_contracts');
export const MusicDealApplication        = new Entity('music_deal_applications');
export const MusicDistribution           = new Entity('music_distributions');
export const MusicMastering              = new Entity('music_masterings');
export const MusicTrack                  = new Entity('music_tracks');
export const NewsPost                    = new Entity('news_posts');
export const Notification                = new Entity('notifications');
export const NotificationPreferences     = new Entity('notification_preferences');
export const OnboardingProgress          = new Entity('onboarding_progress');
export const Order                       = new Entity('orders');
export const P2PEscrow                   = new Entity('p2p_escrows');
export const P2POrder                    = new Entity('p2p_orders');
export const P2PTransaction              = new Entity('p2p_transactions');
export const PPVContent                  = new Entity('ppv_contents');
export const PPVPurchase                 = new Entity('ppv_purchases');
export const PasswordEntry               = new Entity('password_entries');
export const Payment                     = new Entity('payments');
export const PaymentCard                 = new Entity('payment_cards');
export const PaymentMethod               = new Entity('payment_methods');
export const PaymentRequest              = new Entity('payment_requests');
export const PayoutMethod                = new Entity('payout_methods');
export const PayoutRequest               = new Entity('payout_requests');
export const PhysicalCardRequest         = new Entity('physical_card_requests');
export const Playlist                    = new Entity('playlists');
export const PollVote                    = new Entity('poll_votes');
export const PortfolioItem               = new Entity('portfolio_items');
export const Property                    = new Entity('properties');
export const PropertyBooking             = new Entity('property_bookings');
export const ProviderAvailability        = new Entity('provider_availabilities');
export const ProviderOnboarding          = new Entity('provider_onboardings');
export const ProviderVerification        = new Entity('provider_verifications');
export const QAQuestion                  = new Entity('qa_questions');
export const Rating                      = new Entity('ratings');
export const Reel                        = new Entity('reels');
export const RentPayment                 = new Entity('rent_payments');
export const Restaurant                  = new Entity('restaurants');
export const RevenueShare                = new Entity('revenue_shares');
export const Review                      = new Entity('reviews');
export const RideRequest                 = new Entity('ride_requests');
export const RoyaltyEarnings             = new Entity('royalty_earnings');
export const RoyaltyPayout               = new Entity('royalty_payouts');
export const RoyaltySplit                = new Entity('royalty_splits');
export const SavedGroup                  = new Entity('saved_groups');
export const SavedJob                    = new Entity('saved_jobs');
export const SavedProperty               = new Entity('saved_properties');
export const Service                     = new Entity('services');
export const ServiceAgreement            = new Entity('service_agreements');
export const ServiceAvailabilityOverride = new Entity('service_availability_overrides');
export const ServiceBooking              = new Entity('service_bookings');
export const ServiceContract             = new Entity('service_contracts');
export const SharedContentLibrary        = new Entity('shared_content_libraries');
export const ShowcasePost                = new Entity('showcase_posts');
export const SocialPost                  = new Entity('social_posts');
export const SponsoredContent            = new Entity('sponsored_contents');
export const Staking                     = new Entity('stakings');
export const StockAlert                  = new Entity('stock_alerts');
export const StoreSettings               = new Entity('store_settings');
export const Story                       = new Entity('stories');
export const StreamGoal                  = new Entity('stream_goals');
export const StreamingContent            = new Entity('streaming_contents');
export const StripePayment               = new Entity('stripe_payments');
export const Subscription                = new Entity('subscriptions');
export const SubscriptionTier            = new Entity('subscription_tiers');
export const SupportMessage              = new Entity('support_messages');
export const SupportTicket               = new Entity('support_tickets');
export const SyncMessage                 = new Entity('sync_messages');
export const SyncRequest                 = new Entity('sync_requests');
export const TaxReport                   = new Entity('tax_reports');
export const TicketAffiliate             = new Entity('ticket_affiliates');
export const TipTransaction              = new Entity('tip_transactions');
export const TraderRating                = new Entity('trader_ratings');
export const TravelAlert                 = new Entity('travel_alerts');
export const TravelBooking               = new Entity('travel_bookings');
export const TravelListing               = new Entity('travel_listings');
export const TwoFactorCode               = new Entity('two_factor_codes');
export const UserGallery                 = new Entity('user_galleries');
export const UserInteraction             = new Entity('user_interactions');
export const UserInterests               = new Entity('user_interests');
export const UserInventory               = new Entity('user_inventories');
export const UserJobPreferences          = new Entity('user_job_preferences');
export const UserPresence                = new Entity('user_presences');
export const UserReview                  = new Entity('user_reviews');
export const UserSubscription            = new Entity('user_subscriptions');
export const UserVehicle                 = new Entity('user_vehicles');
export const UtilityAccount              = new Entity('utility_accounts');
export const VideoComment                = new Entity('video_comments');
export const VideoLike                   = new Entity('video_likes');
export const VideoPost                   = new Entity('video_posts');
export const VideoTemplate               = new Entity('video_templates');
export const ViewerAnalytics             = new Entity('viewer_analytics');
export const WatchParty                  = new Entity('watch_parties');
export const WatchPartyMessage           = new Entity('watch_party_messages');
export const WatchPartyPlaylist          = new Entity('watch_party_playlists');
