import React, { useState, useEffect, useRef } from "react";
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
  Compass, TrendingUp, ShoppingBag, Tv, Wand2, Wallet, UserPlus, Truck, RefreshCw, X, Radio, Star,
  Flag, EyeOff, ChevronRight, Mic2, Building, User
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
import ShareToInboxModal from "../components/social/ShareToInboxModal";
import AdDisplay from "../components/ads/AdDisplay";
import HomeBannerAd from "../components/ads/HomeBannerAd";
import PeopleSuggestions from "../components/discovery/PeopleSuggestions";
import GoLiveButton from "../components/social/GoLiveButton";
import PostComments from "../components/social/PostComments";
import VideoPost from "../components/social/VideoPost";
import PersonalizedOffersWidget from "../components/offers/PersonalizedOffersWidget";
import EarningsSetupBanner from "../components/onboarding/EarningsSetupBanner";
import { AnimatePresence } from "framer-motion";
import FullScreenFeed from "../components/feed/FullScreenFeed";
import { Layers, LayoutList } from "lucide-react";

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
  const [userMap, setUserMap] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalDefaultType, setCreateModalDefaultType] = useState(null);
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewingStories, setViewingStories] = useState(null);
  const [storyStartIndex, setStoryStartIndex] = useState(0);
  const [editingPost, setEditingPost] = useState(null);
  const [commentingPost, setCommentingPost] = useState(null);
  const [sharingPost, setSharingPost] = useState(null);
  const [postMenuOpen, setPostMenuOpen] = useState(null); // postId of open context menu
  const [hiddenPosts, setHiddenPosts] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(10);
  const loadMoreRef = useRef(null);
  const [fullScreenMode, setFullScreenMode] = useState(false);
  const [fullScreenStartIndex, setFullScreenStartIndex] = useState(0);

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

  // Build a map of email -> display info from the User entity
  useEffect(() => {
    if (!currentUser) return;
    base44.entities.User.list().then(users => {
      const map = {};
      users.forEach(u => {
        map[u.email] = u.username || u.full_name || u.email?.split("@")[0];
      });
      setUserMap(map);
    }).catch(() => {});
  }, [currentUser]);

  const getDisplayName = (post) =>
    post.creator_name || post.creator_username || post.author_name ||
    userMap[post.created_by] || post.created_by?.split("@")[0] || "User";

  // Track interactions — silently disabled (UserInteraction RLS blocks creates)
  const trackView = () => {};

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
        const allPosts = await base44.entities.SocialPost.list('-created_date', 100);

        // Filter: must have media, must not be a story, ignore placeholder/broken URLs
        const feedPosts = allPosts.filter(post => {
          if (!post.image_url) return false;
          if (post.image_url === 'text-story') return false;
          if (post.image_url.includes('example-')) return false;
          if (post.is_story === true) return false;
          return true;
        });

        // Track post views for the first few posts
        if (currentUser?.email) {
          feedPosts.slice(0, 5).forEach(post => {
            trackView("post", post.id, post.vibe || "social");
          });
        }

        return feedPosts;
      } catch (err) {
        console.log("Error loading posts:", err);
        return [];
      }
    },
    initialData: [],
    retry: false,
    enabled: !!currentUser,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 60000
  });

  // Initialise liked set from real liked_by data once posts load
  useEffect(() => {
    if (posts.length > 0 && currentUser?.email) {
      const likedSet = new Set(
        posts.filter(p => Array.isArray(p.liked_by) && p.liked_by.includes(currentUser.email)).map(p => p.id)
      );
      setLikedPosts(likedSet);
    }
  }, [posts, currentUser?.email]);

  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked, post }) => {
      const likedBy = Array.isArray(post.liked_by) ? [...post.liked_by] : [];
      if (isLiked) {
        // Unlike
        const updated = likedBy.filter(e => e !== currentUser.email);
        await base44.entities.SocialPost.update(postId, {
          liked_by: updated,
          likes_count: updated.length,
        });
      } else {
        // Like
        if (!likedBy.includes(currentUser.email)) likedBy.push(currentUser.email);
        await base44.entities.SocialPost.update(postId, {
          liked_by: likedBy,
          likes_count: likedBy.length,
        });
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
    onSettled: () => {
      // Refetch in background to sync server state without clearing optimistic update
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    }
  });

  // Infinite scroll — load 10 more posts when sentinel comes into view
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(c => c + 10); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [posts]);

  const toggleLike = (postId, post) => {
    if (!currentUser) { toast.error('Sign in to like posts'); return; }
    const isLiked = likedPosts.has(postId);
    likeMutation.mutate({ postId, isLiked, post });
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
    { icon: TrendingUp, label: "Discover", bg: "bg-yellow-500/20", iconColor: "text-yellow-400", path: "Discover" },
    { icon: Music, label: "Music", bg: "bg-pink-500/20", iconColor: "text-pink-400", path: "Vibe" },
    { icon: MessageCircle, label: "DMs", bg: "bg-blue-500/20", iconColor: "text-blue-400", path: "Messages" },
    { icon: Wallet, label: "Wallet", bg: "bg-green-500/20", iconColor: "text-green-400", path: "Wallet" },
    { icon: ShoppingBag, label: "Shop", bg: "bg-orange-500/20", iconColor: "text-orange-400", path: "Marketplace" },
    { icon: Truck, label: "Delivery", bg: "bg-sky-500/20", iconColor: "text-sky-400", path: "PackageDelivery" },
    { icon: Wand2, label: "AI", bg: "bg-violet-500/20", iconColor: "text-violet-400", path: "RonronAI" },
    { icon: Tv, label: "Stream", bg: "bg-red-500/20", iconColor: "text-red-400", path: "Streaming" },
    { icon: User, label: "My Profile", bg: "bg-purple-500/20", iconColor: "text-purple-400", path: currentUser?.email ? `UserProfile?email=${encodeURIComponent(currentUser.email)}` : "Profile" },
    // Progressive disclosure: show role-specific shortcuts only for relevant users
    ...(currentUser?.is_creator || currentUser?.is_musician ? [{ icon: Mic2, label: "Studio", bg: "bg-fuchsia-500/20", iconColor: "text-fuchsia-400", path: "MusicStudio" }] : []),
    ...(currentUser?.is_provider || currentUser?.is_restaurant_owner ? [{ icon: Building, label: "My Hub", bg: "bg-teal-500/20", iconColor: "text-teal-400", path: "ProviderHub" }] : []),
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

      {/* Personalized Greeting */}
      {currentUser && (
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs">
              {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"} 👋
            </p>
            <h2 className="text-white font-bold text-lg leading-tight">
              {currentUser.full_name?.split(" ")[0] || "Welcome back"}
            </h2>
          </div>
          <button
            onClick={() => navigate(createPageUrl("Notifications"))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-gray-300 text-xs hover:bg-white/20 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            What's new
          </button>
        </div>
      )}

      {/* Stories Bar */}
      <div className="sticky top-16 z-10 glass-effect border-b border-white/10 px-4 py-4" style={{ overscrollBehavior: 'contain' }}>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollable-content" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', overscrollBehavior: 'contain' }}>
          
          {/* Your Story — always first (Instagram style: profile pic + plus button) */}
          {(() => {
            const myStories = stories.filter(s => s.created_by === currentUser?.email);
            const hasMyStory = myStories.length > 0;
            return (
              <div className="relative flex flex-col items-center gap-2 flex-shrink-0 group" style={{ scrollSnapAlign: 'start' }}>
                <button
                  onClick={() => {
                    if (hasMyStory) {
                      const idx = stories.findIndex(s => s.id === myStories[0].id);
                      setStoryStartIndex(idx);
                      setViewingStories(stories);
                    } else {
                      setCreateModalDefaultType(null);
                      setShowCreateModal(true);
                    }
                  }}
                  className="relative"
                >
                  {/* Profile picture ring */}
                  <div className={`w-16 h-16 rounded-full p-0.5 shadow-lg hover:scale-105 transition-transform ${hasMyStory ? 'bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500' : 'bg-gray-700'}`}>
                    <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden">
                      {currentUser?.profile_picture ? (
                        <img src={currentUser.profile_picture} className="w-full h-full object-cover" alt="Your story" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-xl">
                          {currentUser?.full_name?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Plus button overlay at bottom-right */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-gray-900 shadow">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                </button>
                <span className="text-white text-xs font-medium">Your story</span>
                {/* Delete own stories on hover */}
                {hasMyStory && myStories.map(s => null) /* handled below */ }
              </div>
            );
          })()}

          {/* Sponsored Story Ad */}
          <AdDisplay currentUser={currentUser} position="stories" />

          {/* Friends' stories — sorted most recent first, no own story */}
          {stories
            .filter(s => s.created_by !== currentUser?.email)
            .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
            .slice(0, 15)
            .map((story) => (
              <div key={story.id} className="relative flex flex-col items-center gap-2 flex-shrink-0 group" style={{ scrollSnapAlign: 'start' }}>
                <button
                  onClick={async () => {
                    // Check if story owner has private account and current user doesn't follow them
                    try {
                      const users = await base44.entities.User.list();
                      const storyOwner = users.find(u => u.email === story.created_by);
                      const isPrivate = storyOwner?.is_private || storyOwner?.privacy_settings?.is_private;
                      if (isPrivate && currentUser) {
                        const follows = await base44.entities.Follow.filter({
                          follower_email: currentUser.email,
                          following_email: story.created_by,
                        });
                        if (follows.length === 0) {
                          toast.error("This account is private. Follow them to view their stories.");
                          return;
                        }
                      }
                    } catch (_) {}
                    const storyIndex = stories.findIndex(s => s.id === story.id);
                    setStoryStartIndex(storyIndex);
                    setViewingStories(stories);
                  }}
                  className="relative"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 p-0.5 shadow-lg hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden">
                      {story.creator_profile_picture ? (
                        <img src={story.creator_profile_picture} className="w-full h-full object-cover" alt="Story" />
                      ) : story.media_url && story.media_url !== '__text__' ? (
                        <img src={story.media_url} className="w-full h-full object-cover" alt="Story" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-xl">
                          {(story.creator_name || story.created_by)?.[0]?.toUpperCase() || "U"}
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
                  {story.creator_name || story.creator_username || userMap[story.created_by] || story.created_by?.split("@")[0] || "User"}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Earnings Setup Banner for providers/drivers/creators */}
      {currentUser && <EarningsSetupBanner currentUser={currentUser} />}

      {/* Quick Access */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10 bg-gray-900/80 backdrop-blur-xl relative z-20">
        {/* Row 1: Title + Actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-white text-base font-bold tracking-tight">Quick Access</h3>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh feed"
              className="p-1.5 hover:bg-white/10 rounded-full transition active:scale-90"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-400 hover:text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-2 relative z-30">
            <GoLiveButton currentUser={currentUser} />
            {/* Follow Requests badge — shown only when there are pending requests */}
            {pendingRequestsCount > 0 && (
              <button
                onClick={() => setShowFollowRequests(true)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-white text-xs font-semibold hover:bg-white/20 transition active:scale-95"
              >
                Requests
                <span className="min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                  {pendingRequestsCount}
                </span>
              </button>
            )}
            {pendingRequestsCount === 0 && (
              <button
                onClick={() => setShowFollowRequests(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-gray-300 text-xs font-semibold hover:bg-white/20 transition active:scale-95"
              >
                Requests
              </button>
            )}
            <button
              onClick={() => setShowFriendFinder(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-full text-white text-xs font-semibold transition shadow-md shadow-purple-900/40"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Find Friends
            </button>
          </div>
        </div>

        {/* Row 2: Quick-access chips with colored icons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar scrollable-content" style={{ overscrollBehavior: 'contain' }}>
          {quickAccess.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.isOffers) {
                  document.querySelector('[data-offers-widget]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else if (item.path.includes('?')) {
                  navigate('/' + item.path);
                } else {
                  navigate(createPageUrl(item.path));
                }
              }}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/10 active:scale-95 transition"
            >
              {/* Colored icon container for clear visual hierarchy */}
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${item.bg}`}>
                <item.icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
              </span>
              <span className="text-white text-xs font-semibold">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Row 3: Personalized Offers */}
        <div className="mt-3" data-offers-widget>
          <PersonalizedOffersWidget user={currentUser} />
        </div>
      </div>

      {/* Platform Ad Banner */}
      <HomeBannerAd currentUser={currentUser} />

      {/* Feed view toggle */}
      <div className="max-w-2xl mx-auto flex items-center justify-end px-4 pt-3 pb-1 gap-2">
        <span className="text-gray-500 text-xs">{fullScreenMode ? "Swipe mode" : "Scroll mode"}</span>
        <button
          onClick={() => setFullScreenMode(m => !m)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${fullScreenMode ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}
        >
          {fullScreenMode ? <LayoutList className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
          {fullScreenMode ? "List view" : "Swipe view"}
        </button>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto">
        {posts.filter(p => !hiddenPosts.has(p.id)).slice(0, visibleCount).map((post, index) => (
          <React.Fragment key={post.id}>
            {index === 2 && <AdDisplay currentUser={currentUser} position="feed" />}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="mb-6"
            >
            {/* Post Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => navigate(createPageUrl("UserProfile") + `?email=${encodeURIComponent(post.created_by)}`)}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden text-white font-bold">
                  {post.creator_profile_picture ? (
                    <img src={post.creator_profile_picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (getDisplayName(post))?.[0]?.toUpperCase() || "U"
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold">{getDisplayName(post)}</p>
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
                  className="text-gray-400 hover:text-white p-1"
                >
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setPostMenuOpen(postMenuOpen === post.id ? null : post.id)}
                    className="text-gray-400 hover:text-white p-1"
                  >
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                  <AnimatePresence>
                    {postMenuOpen === post.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-8 z-50 w-44 bg-gray-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                      >
                        <button
                          onClick={() => { setSharingPost(post); setPostMenuOpen(null); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-white text-sm hover:bg-white/10 transition"
                        >
                          <Share2 className="w-4 h-4 text-blue-400" /> Share
                        </button>
                        <button
                          onClick={() => { setHiddenPosts(p => new Set([...p, post.id])); setPostMenuOpen(null); toast.success("Post hidden"); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-white text-sm hover:bg-white/10 transition"
                        >
                          <EyeOff className="w-4 h-4 text-gray-400" /> Hide post
                        </button>
                        <button
                          onClick={() => { toast.success("Post reported — we'll review it."); setPostMenuOpen(null); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 text-sm hover:bg-white/10 transition"
                        >
                          <Flag className="w-4 h-4" /> Report
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Post Media - supports images and videos */}
            <div
              className="relative cursor-pointer"
              onClick={() => {
                const visIdx = posts.filter(p => !hiddenPosts.has(p.id)).findIndex(p => p.id === post.id);
                setFullScreenStartIndex(visIdx);
                setFullScreenMode(true);
              }}
            >
              {(post.media_type === 'video' || post.image_url?.match(/\.(mp4|webm|ogg|mov)/i) || post.image_url?.includes('video')) ? (
                <VideoPost post={post} />) : (
              <img 
                  src={post.image_url} 
                  alt={post.caption || "Post"}
                  className="w-full aspect-square object-cover bg-gray-800"
                  loading={index < 3 ? "eager" : "lazy"}
                  decoding="async"
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

            {/* Action Buttons — familiar Instagram-style pattern */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-5">
                {/* Like */}
                <button
                  onClick={() => toggleLike(post.id, post)}
                  title={likedPosts.has(post.id) ? "Unlike" : "Like"}
                  className="flex items-center gap-1.5 active:scale-125 transition-transform"
                >
                  <Heart className={`w-6 h-6 transition-colors ${likedPosts.has(post.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  {(Array.isArray(post.liked_by) ? post.liked_by.length : (post.likes_count || 0)) > 0 && (
                    <span className={`text-sm font-semibold ${likedPosts.has(post.id) ? 'text-red-400' : 'text-gray-300'}`}>
                      {Array.isArray(post.liked_by) ? post.liked_by.length : post.likes_count}
                    </span>
                  )}
                </button>
                {/* Comment */}
                <button
                  onClick={() => setCommentingPost(post)}
                  title="Comment"
                  className="flex items-center gap-1.5 active:scale-110 transition-transform"
                >
                  <MessageCircle className="w-6 h-6 text-white" />
                  {post.comments_count > 0 && (
                    <span className="text-sm font-semibold text-gray-300">{post.comments_count}</span>
                  )}
                </button>
                {/* Share */}
                <button
                  onClick={() => setSharingPost(post)}
                  title="Share"
                  className="active:scale-110 transition-transform"
                >
                  <Share2 className="w-6 h-6 text-white" />
                </button>
              </div>
              {/* Bookmark */}
              <button title="Save post" className="active:scale-110 transition-transform">
                <Bookmark className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Caption — inline count removed, now lives inside action buttons */}
            <div className="px-4 pb-2">
              <p className="text-white text-sm leading-relaxed">
                <span className="font-bold mr-1.5">{getDisplayName(post)}</span>
                {post.caption}
              </p>
            </div>

            {/* Comments CTA */}
            <button
              onClick={() => setCommentingPost(post)}
              className="px-4 pb-1 text-gray-500 text-sm hover:text-gray-300 transition text-left"
            >
              {post.comments_count > 0 ? `View all ${post.comments_count} comments` : "Add a comment…"}
            </button>

            {/* Timestamp — smallest, least prominent */}
            <p className="px-4 pb-4 text-gray-600 text-xs uppercase tracking-wide">
              {formatLocalTime(post.created_date)}
            </p>
          </motion.div>
          </React.Fragment>
        ))}

        {/* Infinite scroll sentinel */}
        {visibleCount < posts.filter(p => !hiddenPosts.has(p.id)).length && (
          <div ref={loadMoreRef} className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}

        {posts.length === 0 && !isLoading && (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-pink-400" />
            </div>
            <p className="text-gray-500 text-sm">No posts yet. Follow people to see their content here.</p>
          </div>
        )}
      </div>

      {/* Full-Screen Swipe Feed */}
      <AnimatePresence>
        {fullScreenMode && posts.filter(p => !hiddenPosts.has(p.id)).length > 0 && (
          <FullScreenFeed
            posts={posts.filter(p => !hiddenPosts.has(p.id))}
            currentUser={currentUser}
            likedPosts={likedPosts}
            onToggleLike={toggleLike}
            onComment={(post) => setCommentingPost(post)}
            onShare={(post) => setSharingPost(post)}
            onHide={(postId) => setHiddenPosts(p => new Set([...p, postId]))}
            onClose={() => setFullScreenMode(false)}
            startIndex={fullScreenStartIndex}
          />
        )}
      </AnimatePresence>

      {/* Floating Create Button — standard FAB pattern with tooltip label */}
      <button
        onClick={() => { setCreateModalDefaultType(null); setShowCreateModal(true); }}
        title="Create a post"
        aria-label="Create a post"
        className="fixed bottom-24 right-6 flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-2xl shadow-purple-900/50 hover:scale-105 active:scale-95 transition-transform glow-effect z-40"
      >
        <Plus className="w-5 h-5 text-white" />
        <span className="text-white text-sm font-bold">Post</span>
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

      {/* Share to Inbox Modal */}
      <ShareToInboxModal
        isOpen={!!sharingPost}
        onClose={() => setSharingPost(null)}
        post={sharingPost}
        currentUser={currentUser}
      />

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        post={editingPost}
      />

      {/* Comments Modal */}
      <AnimatePresence>
        {commentingPost && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[69] bg-black/60"
              onClick={() => setCommentingPost(null)}
            />
            <PostComments
              post={commentingPost}
              currentUser={currentUser}
              onClose={() => setCommentingPost(null)}
            />
          </>
        )}
      </AnimatePresence>

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