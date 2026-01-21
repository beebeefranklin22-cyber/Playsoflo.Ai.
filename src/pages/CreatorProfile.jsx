import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Play, Users, Heart, DollarSign, Calendar, Grid, Film, Radio, 
  Star, TrendingUp, Share2, ChevronLeft, Plus, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function CreatorProfile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("videos");
  
  // Get creator email from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const creatorEmail = urlParams.get('creator') || "";

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch creator user data
  const { data: creator } = useQuery({
    queryKey: ['creator-user', creatorEmail],
    queryFn: async () => {
      if (!creatorEmail) return null;
      const users = await base44.entities.User.filter({ email: creatorEmail });
      return users[0] || null;
    },
    enabled: !!creatorEmail
  });

  // Fetch creator's content (VOD and saved livestreams)
  const { data: creatorContent = [] } = useQuery({
    queryKey: ['creator-content', creatorEmail],
    queryFn: async () => {
      if (!creatorEmail) return [];
      return await base44.entities.StreamingContent.filter({ 
        creator_email: creatorEmail,
        status: "published",
        is_live: false
      }, '-created_date');
    },
    enabled: !!creatorEmail,
    initialData: []
  });

  // Fetch active livestreams
  const { data: activeLivestreams = [] } = useQuery({
    queryKey: ['creator-active-streams', creatorEmail],
    queryFn: async () => {
      if (!creatorEmail) return [];
      return await base44.entities.StreamingContent.filter({ 
        creator_email: creatorEmail,
        is_live: true
      });
    },
    enabled: !!creatorEmail,
    refetchInterval: 10000,
    initialData: []
  });

  // Fetch subscription tiers
  const { data: subscriptionTiers = [] } = useQuery({
    queryKey: ['creator-tiers', creatorEmail],
    queryFn: async () => {
      if (!creatorEmail) return [];
      return await base44.entities.SubscriptionTier.filter({ 
        creator_email: creatorEmail,
        is_active: true
      });
    },
    enabled: !!creatorEmail,
    initialData: []
  });

  // Fetch digital products
  const { data: digitalProducts = [] } = useQuery({
    queryKey: ['creator-products', creatorEmail],
    queryFn: async () => {
      if (!creatorEmail) return [];
      return await base44.entities.DigitalProduct.filter({ 
        creator_email: creatorEmail,
        is_active: true
      });
    },
    enabled: !!creatorEmail,
    initialData: []
  });

  // Check if current user is subscribed
  const { data: isSubscribed = false } = useQuery({
    queryKey: ['is-subscribed', currentUser?.email, creatorEmail],
    queryFn: async () => {
      if (!currentUser || !creatorEmail) return false;
      const subs = await base44.entities.CreatorSubscription.filter({
        subscriber_email: currentUser.email,
        creator_email: creatorEmail,
        status: "active"
      });
      return subs.length > 0;
    },
    enabled: !!currentUser && !!creatorEmail
  });

  // Fetch follower count
  const { data: followerCount = 0 } = useQuery({
    queryKey: ['creator-followers', creatorEmail],
    queryFn: async () => {
      if (!creatorEmail) return 0;
      const follows = await base44.entities.Follow.filter({ 
        following_email: creatorEmail 
      });
      return follows.length;
    },
    enabled: !!creatorEmail
  });

  const handleSubscribe = async (tier) => {
    if (!currentUser) {
      toast.error("Please log in to subscribe");
      return;
    }

    try {
      await base44.entities.CreatorSubscription.create({
        subscriber_email: currentUser.email,
        creator_email: creatorEmail,
        tier_id: tier.id,
        tier_name: tier.name,
        amount_usd: tier.price_usd,
        billing_period: tier.billing_period,
        status: "active"
      });

      toast.success(`Subscribed to ${tier.name}!`);
    } catch (error) {
      toast.error("Subscription failed: " + error.message);
    }
  };

  const handleContentClick = async (content) => {
    // Check access
    const hasAccess = !content.is_monetized || 
                     content.creator_email === currentUser?.email ||
                     isSubscribed;

    if (!hasAccess && content.is_monetized) {
      const purchases = await base44.entities.ContentPurchase.filter({
        content_id: content.id,
        buyer_email: currentUser?.email
      });
      
      if (purchases.length === 0) {
        toast.error("Purchase this content or subscribe to access");
        return;
      }
    }

    navigate(createPageUrl("LivestreamViewer") + `?id=${content.id}`);
  };

  const totalViews = creatorContent.reduce((sum, c) => sum + (c.views || 0), 0);

  if (!creator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-pink-950 to-purple-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white text-lg">Loading creator profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-pink-950 to-purple-950 pb-20">
      {/* Header */}
      <div className="relative h-80">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/50 to-purple-950" />
        {creator.cover_image && (
          <img 
            src={creator.cover_image} 
            alt="Cover" 
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto flex items-end gap-6">
            <img 
              src={creator.profile_picture || `https://ui-avatars.com/api/?name=${creator.full_name}`}
              alt={creator.full_name}
              className="w-32 h-32 rounded-full border-4 border-purple-500 object-cover"
            />
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">{creator.full_name}</h1>
              {creator.username && (
                <p className="text-purple-300 text-lg mb-2">@{creator.username}</p>
              )}
              <div className="flex items-center gap-6 text-gray-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {followerCount} followers
                </div>
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  {creatorContent.length} videos
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {totalViews} total views
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {currentUser?.email !== creatorEmail && (
                <>
                  <Button
                    onClick={() => navigate(createPageUrl("Messages") + `?user=${creatorEmail}`)}
                    variant="outline"
                    className="bg-white/10 border-white/20"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                    <Heart className="w-4 h-4 mr-2" />
                    Follow
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* Active Livestreams */}
        {activeLivestreams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Radio className="w-6 h-6 text-red-500 animate-pulse" />
              Live Now
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLivestreams.map(stream => (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative h-64 rounded-2xl overflow-hidden cursor-pointer group"
                  onClick={() => navigate(createPageUrl("LivestreamViewer") + `?id=${stream.id}`)}
                >
                  <img 
                    src={stream.thumbnail_url}
                    alt={stream.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                  
                  <div className="absolute top-4 left-4 px-3 py-1 bg-red-500 rounded-full flex items-center gap-1 animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full" />
                    <span className="text-white text-xs font-bold">LIVE</span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{stream.title}</h3>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">{stream.description}</p>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-300" />
                      <span className="text-gray-300">{stream.views || 0} watching</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Subscription Tiers */}
        {subscriptionTiers.length > 0 && currentUser?.email !== creatorEmail && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Support {creator.full_name}</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {subscriptionTiers.map(tier => (
                <div key={tier.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                    <div className="text-4xl font-bold text-purple-400 mb-1">
                      ${tier.price_usd}
                      <span className="text-lg text-gray-400">/{tier.billing_period}</span>
                    </div>
                  </div>
                  <div className="space-y-2 mb-6">
                    {tier.benefits?.map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                        <Star className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => handleSubscribe(tier)}
                    disabled={isSubscribed}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isSubscribed ? "Subscribed" : "Subscribe"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs for Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="videos">
              <Film className="w-4 h-4 mr-2" />
              Videos ({creatorContent.length})
            </TabsTrigger>
            <TabsTrigger value="products">
              <DollarSign className="w-4 h-4 mr-2" />
              Products ({digitalProducts.length})
            </TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-6">
            {creatorContent.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-2xl">
                <Film className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No content uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {creatorContent.map(content => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group cursor-pointer"
                    onClick={() => handleContentClick(content)}
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 mb-2">
                      <img 
                        src={content.thumbnail_url}
                        alt={content.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-purple-500/90 rounded-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>

                      {content.is_monetized && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          <DollarSign className="w-3 h-3 inline" />
                          {content.price_usd || content.rental_price_usd}
                        </div>
                      )}

                      {content.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs">
                          {content.duration}
                        </div>
                      )}
                    </div>

                    <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">
                      {content.title}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <Users className="w-3 h-3" />
                      {content.views || 0} views
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            {digitalProducts.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-2xl">
                <DollarSign className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No products available</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {digitalProducts.map(product => (
                  <div key={product.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <img 
                      src={product.thumbnail_url}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="text-white font-bold mb-2">{product.name}</h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-3">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-purple-400">${product.price_usd}</span>
                        <Button className="bg-purple-600 hover:bg-purple-700">
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <div className="bg-white/5 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">About</h2>
              <p className="text-gray-300 leading-relaxed">
                {creator.bio || "No bio available"}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}