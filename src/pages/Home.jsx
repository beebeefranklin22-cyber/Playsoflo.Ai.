import React, { useState, useEffect } from "react";
import RealtimeFeedManager from '../components/feed/RealtimeFeedManager';
import AIPersonalizationEngine from '../components/feed/AIPersonalizationEngine';
import UniversalFeedFilter from '../components/feed/UniversalFeedFilter';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Heart, MessageCircle, Share2, Bookmark, MapPin,
  Music, Sparkles, Plus, MoreHorizontal, Activity,
  Compass, TrendingUp, ShoppingBag, Tv, Wand2, Wallet, UserPlus, Truck, RefreshCw, X, Radio, Star
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import PullToRefresh from "../components/PullToRefresh";
import { formatLocalTime } from "../components/utils/dateUtils";
import CreateContentModal from "../components/CreateContentModal";
import StoryViewer from "../components/story/StoryViewer";
import FriendFinder from "../components/FriendFinder";
import FollowRequestsModal from "../components/FollowRequestsModal";
import ViewerRecommendations from "../components/discovery/ViewerRecommendations";
import EditPostModal from "../components/social/EditPostModal";
import AdDisplay from "../components/ads/AdDisplay";
import HomeBannerAd from "../components/ads/HomeBannerAd";
import PeopleSuggestions from "../components/discovery/PeopleSuggestions";
import GoLiveButton from "../components/social/GoLiveButton";

// Simple Badge component for styling, as it's used in the recommendations section
const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${className}`}>
    {children}
  </span>
);

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [aiPreferences, setAiPreferences] = useState(null);
  const [feedFilters, setFeedFilters] = useState({
    category: 'all',
    sortBy: 'recent',
    aiPersonalized: true
  });
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalDefaultType, setCreateModalDefaultType] = useState(null);
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewingStories, setViewingStories] = useState(null);
  const [storyStartIndex, setStoryStartIndex] = useState(0);
  const [editingPost, setEditingPost] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Award welcome bonus if not claimed - wrapped in try/catch
        if (user && !user.welcome_bonus_claimed) {
          try {
            const bonusAmount = 5;
            await base44.auth.updateMe({
              soflo_coins: (user.soflo_coins || 0) + bonusAmount,
              welcome_bonus_claimed: true
            });
            const updatedUser = await base44.auth.me();
            setCurrentUser(updatedUser);
            toast.success(`Welcome! You've received ${bonusAmount} SoFloCoin as a welcome bonus!`);
          } catch (bonusError) {
            console.log("Could not award welcome bonus:", bonusError);
          }
        }
      } catch (error) {
        console.log("User not authenticated:", error);
        setCurrentUser(null);
      }
    };
    fetchUser();
  }, []);

  // Onboarding check removed - users can access freely

  // Track interactions for AI
  const trackInteractionMutation = useMutation({
    mutationFn: async (data) => {
      if (!currentUser?.email) {
        console.warn("Cannot track interaction: currentUser email not available.");
        return;
      }
      return await base44.entities.UserInteraction.create({
        user_email: currentUser.email,
        ...data
      });
    },
    onError: (error) => {
      console.error("Error tracking user interaction:", error);
    }
  });

  // Track content views
  const trackView = (contentType, contentId, category) => {
    if (!currentUser?.email) return;
    trackInteractionMutation.mutate({
      interaction_type: "view",
      content_type: contentType,
      content_id: contentId,
      content_category: category
    });
  };

  const [showFriendFinder, setShowFriendFinder] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['social-posts'] }),
      queryClient.invalidateQueries({ queryKey: ['stories'] }),
      queryClient.invalidateQueries({ queryKey: ['pending-requests-count'] })
    ]);
    setTimeout(() => setRefreshing(false), 500);
  };

  const { data: pendingRequestsCount = 0 } = useQuery({
    queryKey: ['pending-requests-count', currentUser?.email],
    queryFn: async () => {
      const requests = await base44.entities.FollowRequest.filter({ 
        to_email: currentUser.email, 
        status: 'pending' 
      });
      return requests.length;
    },
    enabled: !!currentUser,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 60000
  });

  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['social-posts', currentUser?.email],
    queryFn: async () => {
      try {
        const allPosts = await base44.entities.SocialPost.list('-created_date');
        
        // Filter to show only real posts (not stories) from friends and self
        const friendPosts = allPosts.filter(post => {
          const isFromNetwork = post.created_by === currentUser?.email || 
                                currentUser?.following?.includes(post.created_by) ||
                                true; // show all posts in feed for discovery
          const hasValidMedia = post.image_url && 
                               post.image_url !== 'text-story' && 
                               !post.image_url.includes('example-') &&
                               post.image_url.startsWith('http');
          const isNotStory = !post.is_story && post.caption;
          
          return hasValidMedia && isNotStory;
        });
        
        // Track post views for the first few posts
        if (currentUser?.email) {
          friendPosts.slice(0, 5).forEach(post => {
            trackView("post", post.id, post.vibe || "social");
          });
        }
        
        return friendPosts;
      } catch (err) {
        console.log("Error loading posts:", err);
        return [];
      }
    },
    initialData: [],
    retry: false,
    enabled: !!currentUser,
    refetchInterval: false,
    refetchOnWindowFocus: false
  });

  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked, post }) => {
      if (isLiked) {
        // Unlike: decrement
        await base44.entities.SocialPost.update(postId, { likes_count: Math.max(0, (post.likes_count || 0) - 1) });
      } else {
        // Like: increment + notify
        await base44.entities.SocialPost.update(postId, { likes_count: (post.likes_count || 0) + 1 });
        if (currentUser && post.created_by && post.created_by !== currentUser.email) {
          await base44.entities.Notification.create({
            recipient_email: post.created_by,
            type: 'post_like',
            title: `${currentUser.full_name || 'Someone'} liked your post`,
            message: post.caption?.substring(0, 80) || 'Liked your post',
            sender_email: currentUser.email,
            sender_name: currentUser.full_name,
            sender_photo: currentUser.profile_picture,
            reference_id: postId,
            reference_type: 'post',
            read: false
          }).catch(() => {});
        }
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (isLiked) newSet.delete(postId);
        else newSet.add(postId);
        return newSet;
      });
    },
    onError: (error, { postId, isLiked }) => {
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (!isLiked) newSet.delete(postId);
        else newSet.add(postId);
        return newSet;
      });
      toast.error('Failed to update like');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    }
  });

  const toggleLike = (postId, post) => {
    const isLiked = likedPosts.has(postId);
    likeMutation.mutate({ postId, isLiked, post });
    if (!isLiked && currentUser?.email) {
      trackInteractionMutation.mutate({ interaction_type: "like", content_type: "post", content_id: postId, content_category: "social" });
    }
  };

  const vibeColors = {
    energetic: "from-red-500 to-orange-500",
    chill: "from-blue-500 to-cyan-500",
    luxury: "from-yellow-500 to-amber-500",
    adventure: "from-green-500 to-emerald-500",
    romantic: "from-pink-500 to-rose-500",
    party: "from-purple-500 to-pink-500"
  };

  const quickAccess = [
    { icon: TrendingUp, label: "Discover", color: "yellow", path: "Discover" },
    { icon: Music, label: "Music", color: "pink", path: "Vibe" },
    { icon: Compass, label: "Explore", color: "purple", path: "Universe" },
    { icon: Wallet, label: "Wallet", color: "green", path: "Wallet" },
    { icon: ShoppingBag, label: "Shop", color: "orange", path: "Marketplace" },
    { icon: Truck, label: "Delivery", color: "blue", path: "PackageDelivery" },
    { icon: Wand2, label: "AI", color: "violet", path: "RonronAI" },
    { icon: Tv, label: "Stream", color: "red", path: "Universe" },
  ];

  // Fetch followers list
  const { data: followers = [] } = useQuery({
    queryKey: ['my-followers', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const followData = await base44.entities.Follow.filter({
        following_email: currentUser.email
      });
      return followData.map(f => f.follower_email);
    },
    enabled: !!currentUser
  });

  const { data: stories = [] } = useQuery({
    queryKey: ['stories', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      
      const following = await base44.entities.Follow.filter({ follower_email: currentUser.email });
      const followingEmails = following.map(f => f.following_email);
      
      const allStories = await base44.entities.Story.list('-created_date');
      const now = new Date();
      
      return allStories.filter(story => {
        const isNotExpired = new Date(story.expires_at) > now;
        const isOwnStory = story.created_by === currentUser.email;
        const isFromFollowing = followingEmails.includes(story.created_by);
        
        return isNotExpired && (isOwnStory || isFromFollowing);
      });
    },
    enabled: !!currentUser,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 120000
  });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen pb-32" style={{ overscrollBehavior: 'contain' }}>
      {/* Stories Bar */}
      <div className="sticky top-16 z-10 glass-effect border-b border-white/10 px-4 py-4" style={{ overscrollBehavior: 'contain' }}>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollable-content" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', overscrollBehavior: 'contain' }}>
          {/* Add Your Story */}
          <button 
            onClick={() => { setCreateModalDefaultType(null); setShowCreateModal(true); }}
            className="flex flex-col items-center gap-2 flex-shrink-0 hover:opacity-80 transition"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center relative shadow-lg hover:scale-105 transition-transform">
              <Plus className="w-7 h-7 text-white" />
            </div>
            <span className="text-white text-xs font-medium">Add Story</span>
          </button>

          {/* Sponsored Story Ad */}
          <AdDisplay currentUser={currentUser} position="stories" />

          {/* Stories from following */}
          {stories.slice(0, 15).map((story) => {
            const isMyStory = story.created_by === currentUser?.email;
            return (
              <div key={story.id} className="relative flex flex-col items-center gap-2 flex-shrink-0 group" style={{ scrollSnapAlign: 'start' }}>
                <button 
                  onClick={() => {
                    const storyIndex = stories.findIndex(s => s.id === story.id);
                    setStoryStartIndex(storyIndex);
                    setViewingStories(stories);
                  }}
                  className="relative"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 p-0.5 shadow-lg hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden">
                      {story.media_url && story.media_url !== 'text-story' ? (
                        <img src={story.media_url} className="w-full h-full object-cover" alt="Story" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-xl">
                          {story.created_by?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                  </div>
                  {story.music && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                      <Music className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>

                <span className="text-gray-300 text-xs max-w-[64px] truncate">
                  {isMyStory ? 'You' : story.created_by?.split('@')[0]}
                </span>

                {/* Delete button for own stories */}
                {isMyStory && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Delete this story?')) {
                        try {
                          await base44.entities.Story.delete(story.id);
                          await queryClient.invalidateQueries({ queryKey: ['stories'] });
                          toast.success('✅ Story deleted');
                        } catch (error) {
                          console.error('Delete error:', error);
                          toast.error('❌ Failed to delete story');
                        }
                      }
                    }}
                    className="absolute top-0 right-0 w-5 h-5 bg-red-500/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Access */}
      <div className="px-4 pt-3 pb-2 border-b border-white/10 bg-gray-900/80 backdrop-blur-xl relative z-20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-white text-sm font-semibold">Quick Access</h3>
            <button onClick={handleRefresh} disabled={refreshing} className="p-1 hover:bg-white/10 rounded-full transition">
              <RefreshCw className={`w-3.5 h-3.5 text-gray-400 hover:text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 relative z-30">
            <GoLiveButton currentUser={currentUser} />
            <button
              onClick={() => setShowFollowRequests(true)}
              className="relative flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full text-white text-xs font-medium hover:bg-white/20 transition"
            >
              Requests
              {pendingRequestsCount > 0 && (
                <span className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowFriendFinder(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 rounded-full text-white text-xs font-medium hover:bg-purple-700 transition"
            >
              <UserPlus className="w-3 h-3" />
              Find Friends
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar scrollable-content" style={{ overscrollBehavior: 'contain' }}>
          {quickAccess.map((item) => (
            <button
              key={item.path + item.label}
              onClick={() => navigate(createPageUrl(item.path))}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 glass-effect rounded-full hover:bg-white/10 transition border border-white/20"
            >
              <item.icon className={`w-3.5 h-3.5 text-${item.color}-400`} />
              <span className="text-white text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Platform Ad Banner */}
      <HomeBannerAd currentUser={currentUser} />

      {/* Feed */}
      <div className="max-w-2xl mx-auto">
        {posts.map((post, index) => (
          <React.Fragment key={post.id}>
            {index === 2 && <AdDisplay currentUser={currentUser} position="feed" />}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="mb-6"
            >
            {/* Post Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => navigate(createPageUrl("UserProfile") + `?user=${post.created_by}`)}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {post.created_by?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-white font-semibold">{post.created_by || "User"}</p>
                  {post.location && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <MapPin className="w-3 h-3" />
                      {post.location}
                    </div>
                  )}
                </div>
              </button>
              {post.created_by === currentUser?.email ? (
                <button 
                  onClick={() => setEditingPost(post)}
                  className="text-gray-400 hover:text-white"
                >
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              ) : (
                <button className="text-gray-400 hover:text-white">
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Post Media - supports images and videos */}
            <div className="relative">
              {post.image_url?.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) ? (
                <video
                  src={post.image_url}
                  className="w-full aspect-square object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img 
                  src={post.image_url} 
                  alt={post.caption}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
              )}
              
              {/* Vibe Overlay */}
              {post.vibe && (
                <div className={`absolute top-4 left-4 px-4 py-2 bg-gradient-to-r ${vibeColors[post.vibe]} rounded-full text-white text-sm font-bold backdrop-blur-sm`}>
                  {post.vibe}
                </div>
              )}

              {/* Experience Badge */}
              {post.is_experience && (
                <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/20 backdrop-blur-xl rounded-full flex items-center gap-2 border border-white/30">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-white text-sm font-bold capitalize">
                    {post.experience_type?.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              {/* Music Playing */}
              {post.music_playing && (
                <div className="absolute bottom-4 left-4 right-4 glass-effect rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Music className="w-5 h-5 text-purple-400 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {post.music_playing}
                    </p>
                  </div>
                  <button className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-xs">
                    ▶
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleLike(post.id, post)}
                  className="transform active:scale-125 transition-transform"
                >
                  <Heart 
                    className={`w-7 h-7 ${
                      likedPosts.has(post.id) 
                        ? 'fill-red-500 text-red-500' 
                        : 'text-white'
                    }`} 
                  />
                </button>
                <button onClick={() => trackView("post", post.id, post.vibe || "social")}>
                  <MessageCircle className="w-7 h-7 text-white" />
                </button>
                <button>
                  <Share2 className="w-7 h-7 text-white" />
                </button>
              </div>
              <button>
                <Bookmark className="w-7 h-7 text-white" />
              </button>
            </div>

            {/* Likes Count */}
            <div className="px-4 pb-2">
              <p className="text-white font-semibold">
                {post.likes_count + (likedPosts.has(post.id) ? 1 : 0)} likes
              </p>
            </div>

            {/* Caption */}
            <div className="px-4 pb-2">
              <p className="text-white">
                <span className="font-semibold mr-2">{post.created_by || "User"}</span>
                {post.caption}
              </p>
            </div>

            {/* Comments */}
            {post.comments_count > 0 && (
              <button className="px-4 pb-3 text-gray-400 text-sm">
                View all {post.comments_count} comments
              </button>
            )}

            {/* Time */}
            <p className="px-4 pb-3 text-gray-500 text-xs">
              {formatLocalTime(post.created_date)}
            </p>
          </motion.div>
          </React.Fragment>
        ))}

        {posts.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-10 h-10 text-pink-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Welcome to PlaySoFlo</h3>
            <p className="text-gray-400 mb-6">Share your lifestyle experiences with the community</p>
            <button 
              onClick={() => { setCreateModalDefaultType(null); setShowCreateModal(true); }}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-bold hover:scale-105 transition-transform"
            >
              Create Your First Post
            </button>
          </div>
        )}
      </div>

      {/* Floating Create Button */}
      <button 
        onClick={() => { setCreateModalDefaultType(null); setShowCreateModal(true); }}
        className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform glow-effect z-40"
      >
        <Plus className="w-8 h-8 text-white" />
      </button>

      {/* Unified Create Content Modal */}
      <CreateContentModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setCreateModalDefaultType(null); }}
        currentUser={currentUser}
        defaultType={createModalDefaultType}
      />

      {/* Friend Finder Modal */}
      <FriendFinder
        isOpen={showFriendFinder}
        onClose={() => setShowFriendFinder(false)}
        currentUser={currentUser}
      />

      {/* Follow Requests Modal */}
      <FollowRequestsModal
        isOpen={showFollowRequests}
        onClose={() => setShowFollowRequests(false)}
        currentUser={currentUser}
      />

      {/* Story Viewer */}
      {viewingStories && (
        <StoryViewer
          stories={viewingStories}
          initialIndex={storyStartIndex}
          onClose={() => {
            setViewingStories(null);
            setStoryStartIndex(0);
          }}
        />
      )}

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        post={editingPost}
      />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        /* Smooth scrolling improvements */
        * {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
    </PullToRefresh>
  );
}