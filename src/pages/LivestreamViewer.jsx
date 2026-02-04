import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Users, Video, Crown, Settings, Share2, UserPlus, Bell, 
  Maximize2, Minimize2, Volume2, VolumeX, Heart, Gift, MessageCircle,
  BarChart3, HelpCircle, ShoppingCart, Sparkles, Send
} from "lucide-react";
import LivestreamChat from "../components/livestream/LivestreamChat.jsx";
import LivestreamReactions from "../components/livestream/LivestreamReactions.jsx";
import PPVAccessGate from "../components/creator/PPVAccessGate.jsx";
import LivestreamPolls from "../components/livestream/LivestreamPolls.jsx";
import LivestreamQA from "../components/livestream/LivestreamQA.jsx";
import AgoraVideoPlayer from "../components/livestream/AgoraVideoPlayer.jsx";
import CoHostManager from "../components/livestream/CoHostManager.jsx";
import ReactionEffects from "../components/livestream/ReactionEffects.jsx";
import PPVTicketGate from "../components/livestream/PPVTicketGate.jsx";
import LiveTippingOverlay from "../components/livestream/LiveTippingOverlay.jsx";
import ProductShowcase from "../components/livestream/ProductShowcase.jsx";
import JoinRequestButton from "../components/livestream/JoinRequestButton.jsx";
import JoinRequestsPanel from "../components/livestream/JoinRequestsPanel.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function LivestreamViewer() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [streamId, setStreamId] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("Error loading user:", error);
      }
    };
    fetchUser();

    // Get stream ID and broadcaster status from URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const broadcaster = params.get('broadcaster') === 'true';
    setStreamId(id);
    setIsBroadcaster(broadcaster);

    // Track viewer analytics
    if (id) {
      const trackViewing = async () => {
        try {
          await base44.entities.ViewerAnalytics.create({
            content_id: id,
            is_currently_watching: true
          });
        } catch (err) {
          console.log("Analytics tracking error:", err);
        }
      };
      trackViewing();

      // Cleanup when leaving
      return () => {
        const cleanup = async () => {
          try {
            const user = await base44.auth.me().catch(() => null);
            const analytics = await base44.entities.ViewerAnalytics.filter({
              content_id: id,
              created_by: user?.email
            });
            if (analytics[0]) {
              await base44.entities.ViewerAnalytics.update(analytics[0].id, {
                is_currently_watching: false
              });
            }
          } catch (err) {
            console.log("Cleanup error:", err);
          }
        };
        cleanup();
      };
    }
  }, []);

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: async () => {
      const streams = await base44.entities.StreamingContent.filter({ id: streamId });
      if (streams[0]) {
        // Fetch creator username
        try {
          const users = await base44.entities.User.filter({ email: streams[0].created_by });
          return {
            ...streams[0],
            creator_username: users[0]?.username || streams[0].created_by
          };
        } catch {
          return streams[0];
        }
      }
      return streams[0];
    },
    enabled: !!streamId
  });

  // Check if stream has pricing tiers
  const { data: streamTiers = [] } = useQuery({
    queryKey: ['stream-tiers', streamId],
    queryFn: async () => {
      return await base44.entities.LivestreamPricingTier.filter({ stream_id: streamId });
    },
    enabled: !!streamId
  });

  // Check user's membership status
  const { data: myMembership } = useQuery({
    queryKey: ['my-membership', stream?.created_by, currentUser?.email],
    queryFn: async () => {
      if (!currentUser || !stream) return null;
      const memberships = await base44.entities.MembershipSubscription.filter({
        creator_email: stream.created_by,
        subscriber_email: currentUser.email,
        status: 'active'
      });
      return memberships[0];
    },
    enabled: !!currentUser && !!stream
  });

  const [viewerCount, setViewerCount] = useState(0);
  
  const isStreamCreator = currentUser?.email === stream?.created_by;

  // Real-time viewer count
  useEffect(() => {
    if (!streamId) return;
    
    const updateCount = async () => {
      const analytics = await base44.entities.ViewerAnalytics.filter({ 
        content_id: streamId,
        is_currently_watching: true
      });
      setViewerCount(analytics.length);
    };
    updateCount();

    // Subscribe to analytics changes
    const unsubscribe = base44.entities.ViewerAnalytics.subscribe((event) => {
      if (event.data?.content_id === streamId) {
        updateCount();
      }
    });

    return () => unsubscribe();
  }, [streamId]);

  // Check if following creator
  useEffect(() => {
    const checkFollowing = async () => {
      if (!currentUser || !stream) return;
      const follows = await base44.entities.Follow.filter({
        follower_email: currentUser.email,
        following_email: stream.created_by
      });
      setIsFollowing(follows.length > 0);
    };
    checkFollowing();
  }, [currentUser, stream]);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const follows = await base44.entities.Follow.filter({
          follower_email: currentUser.email,
          following_email: stream.created_by
        });
        if (follows[0]) await base44.entities.Follow.delete(follows[0].id);
      } else {
        await base44.entities.Follow.create({
          follower_email: currentUser.email,
          following_email: stream.created_by
        });
      }
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
    }
  });

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: stream.title,
          text: `Watch ${stream.created_by}'s livestream!`,
          url: shareUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(shareUrl);
          toast.success('Link copied to clipboard!');
        }
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  if (!stream) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-white">Loading stream...</p>
      </div>
    );
  }

  const content = (
    <div className={`min-h-screen bg-black ${isTheaterMode ? '' : 'pb-20'}`}>
      {/* Premium Header */}
      {!isTheaterMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-[2000px] mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left - Back & Creator Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Button
                  onClick={() => navigate(-1)}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 flex-shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {stream.creator_username?.[0]?.toUpperCase() || stream.created_by?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-white font-bold text-base truncate">{stream.title}</h1>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 truncate">@{stream.creator_username || stream.created_by}</span>
                      <Badge className="bg-red-500 text-white border-0 px-2 py-0 text-xs flex-shrink-0">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1" />
                        LIVE
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center - Viewer Count */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full flex-shrink-0">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-white font-bold">{viewerCount.toLocaleString()}</span>
                <span className="text-gray-400 text-sm">watching</span>
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isStreamCreator && (
                  <>
                    <JoinRequestButton
                      streamId={streamId}
                      currentUser={currentUser}
                      isCreator={isStreamCreator}
                    />
                    <Button
                      onClick={() => followMutation.mutate()}
                      size="sm"
                      className={isFollowing 
                        ? "bg-white/10 hover:bg-white/20 border border-white/20" 
                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      }
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  </>
                )}
                
                <Button
                  onClick={handleShare}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                >
                  <Share2 className="w-4 h-4" />
                </Button>

                <Button
                  onClick={() => setIsTheaterMode(!isTheaterMode)}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/10 hidden lg:flex"
                >
                  {isTheaterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isTheaterMode ? 'pt-16' : 'pt-20 px-4 lg:px-6'} max-w-[2000px] mx-auto`}>
        <div className={`grid ${isTheaterMode ? 'grid-cols-1' : 'lg:grid-cols-[1fr_400px]'} gap-6`}>
          
          {/* Left - Video Player */}
          <div className="space-y-4">
            {/* Video Container */}
            <div className={`relative ${isTheaterMode ? 'h-screen' : 'aspect-video'} bg-black overflow-hidden ${isTheaterMode ? '' : 'rounded-2xl border border-white/10'} group`}>
          {stream.is_live && stream.agora_channel_name ? (
            <>
              <AgoraVideoPlayer 
                channelName={stream.agora_channel_name}
                role={isBroadcaster ? "host" : "audience"}
                onViewerJoin={() => {}}
              />
              <ReactionEffects streamId={streamId} />

              {/* Floating Controls - Top Left */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={() => setIsTheaterMode(!isTheaterMode)}
                  size="sm"
                  className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20"
                >
                  {isTheaterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>

              {/* Quick Actions - Right Side */}
              <div className="absolute right-4 bottom-24 flex flex-col gap-3 pointer-events-auto z-20">
                {/* Quick Reactions */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    base44.entities.LivestreamReaction.create({
                      stream_id: streamId,
                      reaction_type: 'heart',
                      user_email: currentUser?.email
                    });
                  }}
                  className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition"
                >
                  <Heart className="w-6 h-6 text-white" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')}
                  className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition"
                >
                  <MessageCircle className="w-6 h-6 text-white" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveTab(activeTab === 'products' ? null : 'products')}
                  className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition"
                >
                  <ShoppingCart className="w-6 h-6 text-white" />
                </motion.button>
              </div>

              {/* Interactive Panel - Slides from bottom */}
              <AnimatePresence>
                {activeTab && (
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25 }}
                    className="absolute bottom-0 left-0 right-0 pointer-events-auto z-30"
                  >
                    <div className="bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-xl border-t border-white/20 max-h-[50vh] overflow-hidden flex flex-col">
                      {/* Tab Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                              activeTab === 'chat' 
                                ? 'bg-purple-500 text-white' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            <MessageCircle className="w-4 h-4" />
                            Chat
                          </button>
                          <button
                            onClick={() => setActiveTab('polls')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                              activeTab === 'polls' 
                                ? 'bg-blue-500 text-white' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            <BarChart3 className="w-4 h-4" />
                            Polls
                          </button>
                          <button
                            onClick={() => setActiveTab('qa')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                              activeTab === 'qa' 
                                ? 'bg-green-500 text-white' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            <HelpCircle className="w-4 h-4" />
                            Q&A
                          </button>
                          <button
                            onClick={() => setActiveTab('products')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                              activeTab === 'products' 
                                ? 'bg-green-500 text-white' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Shop
                          </button>
                        </div>
                        <Button
                          onClick={() => setActiveTab(null)}
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                        >
                          Close
                        </Button>
                      </div>

                      {/* Tab Content */}
                      <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'chat' && (
                          <LivestreamChat 
                            streamId={streamId} 
                            isCreator={isStreamCreator}
                            currentUser={currentUser}
                          />
                        )}

                        {activeTab === 'polls' && (
                          <LivestreamPolls
                            streamId={streamId}
                            isCreator={isStreamCreator}
                            currentUser={currentUser}
                          />
                        )}

                        {activeTab === 'qa' && (
                          <LivestreamQA
                            streamId={streamId}
                            isCreator={isStreamCreator}
                            currentUser={currentUser}
                          />
                        )}

                        {activeTab === 'products' && (
                          <ProductShowcase
                            streamId={streamId}
                            isCreator={isStreamCreator}
                            currentUser={currentUser}
                            creatorEmail={stream.created_by}
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
              <div className="text-center p-8">
                <Video className="w-20 h-20 text-white/40 mx-auto mb-4" />
                <p className="text-white text-2xl font-bold mb-2">Stream Ended</p>
                <p className="text-gray-400 mb-6">This livestream is no longer active</p>
                <Button onClick={() => navigate(-1)} className="bg-purple-600 hover:bg-purple-700">
                  Back to Browse
                </Button>
              </div>
            </div>
          )}
            </div>

            {/* Stream Info - Below Video */}
            {!isTheaterMode && (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-white font-bold text-2xl">{stream.title}</h2>
                    </div>
                    <p className="text-purple-400 text-sm mb-2">@{stream.creator_username || stream.created_by}</p>
                    {stream.description && (
                      <p className="text-gray-300 text-sm mb-4">{stream.description}</p>
                    )}
                    <div className="flex items-center gap-4 flex-wrap">
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        {stream.category}
                      </Badge>
                      <span className="text-gray-400 text-sm">{stream.views || 0} total views</span>
                    </div>
                  </div>
                </div>

                {/* Engagement Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <LiveTippingOverlay
                    streamId={streamId}
                    creatorEmail={stream.created_by}
                    currentUser={currentUser}
                  />
                </div>
              </div>
            )}

            {/* Join Requests Panel - Host Only */}
            {!isTheaterMode && isStreamCreator && (
              <JoinRequestsPanel streamId={streamId} currentUser={currentUser} isCreator={isStreamCreator} />
            )}

            {/* Co-Host Manager */}
            {!isTheaterMode && isStreamCreator && (
              <CoHostManager streamId={streamId} currentUser={currentUser} isCreator={isStreamCreator} />
            )}
          </div>

          {/* Right Sidebar - Desktop Only */}
          {!isTheaterMode && (
            <div className="hidden lg:block space-y-4">
              {/* Live Chat Panel */}
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 h-[calc(100vh-200px)] flex flex-col">
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-purple-400" />
                      Live Chat
                    </h3>
                    <div className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-green-400 font-semibold">Real-time</span>
                    </div>
                  </div>

                  {/* Quick Tab Switcher */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        activeTab === 'chat' 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setActiveTab('polls')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        activeTab === 'polls' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      Polls
                    </button>
                    <button
                      onClick={() => setActiveTab('qa')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        activeTab === 'qa' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      Q&A
                    </button>
                    <button
                      onClick={() => setActiveTab('products')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        activeTab === 'products' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      Shop
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                  {activeTab === 'chat' && (
                    <LivestreamChat 
                      streamId={streamId} 
                      isCreator={isStreamCreator}
                      currentUser={currentUser}
                    />
                  )}

                  {activeTab === 'polls' && (
                    <div className="p-4">
                      <LivestreamPolls
                        streamId={streamId}
                        isCreator={isStreamCreator}
                        currentUser={currentUser}
                      />
                    </div>
                  )}

                  {activeTab === 'qa' && (
                    <div className="p-4">
                      <LivestreamQA
                        streamId={streamId}
                        isCreator={isStreamCreator}
                        currentUser={currentUser}
                      />
                    </div>
                  )}

                  {activeTab === 'products' && (
                    <div className="p-4">
                      <ProductShowcase
                        streamId={streamId}
                        isCreator={isStreamCreator}
                        currentUser={currentUser}
                        creatorEmail={stream.created_by}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );

  // Check if stream has paid tiers and user needs access  
  if (streamTiers.length > 0 && !isStreamCreator) {
    return (
      <PPVTicketGate stream={stream} currentUser={currentUser}>
        {content}
      </PPVTicketGate>
    );
  }

  return content;
}