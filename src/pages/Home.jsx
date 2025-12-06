
import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Heart, MessageCircle, Share2, Bookmark, MapPin,
  Music, Sparkles, Plus, MoreHorizontal, Activity,
  Compass, ShoppingBag, Tv, Wand2, Wallet
} from "lucide-react";
import { motion } from "framer-motion";

// Simple Badge component for styling, as it's used in the recommendations section
const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${className}`}>
    {children}
  </span>
);

export default function Home() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Award welcome bonus if not claimed - wrapped in try/catch
        if (user && !user.welcome_bonus_claimed) {
          try {
            const bonusAmount = 5; // Changed from 10/5 to flat 5 for all users
            await base44.auth.updateMe({
              soflo_coins: (user.soflo_coins || 0) + bonusAmount,
              welcome_bonus_claimed: true
            });
            const updatedUser = await base44.auth.me();
            setCurrentUser(updatedUser);
            alert(`Welcome! You've received ${bonusAmount} SoFloCoin as a welcome bonus!`);
          } catch (bonusError) {
            console.log("Could not award welcome bonus:", bonusError);
            // Continue anyway - don't block the app
          }
        }
      } catch (error) {
        console.log("User not authenticated or error fetching user:", error);
        // Continue anyway - the app should work for guests
      }
    };
    fetchUser();
  }, []);

  // Check onboarding status - but only once per session
  const { data: onboardingProgress } = useQuery({
    queryKey: ["onboarding-check"],
    queryFn: async () => {
      if (!currentUser) return null;
      try {
        const progress = await base44.entities.OnboardingProgress.filter({
          user_email: currentUser.email
        });
        return progress[0] || null;
      } catch (error) {
        console.error("Error fetching onboarding progress:", error);
        return null;
      }
    },
    enabled: !!currentUser && !hasCheckedOnboarding
  });

  // Redirect to onboarding only once and only if truly not completed
  useEffect(() => {
    if (!currentUser || hasCheckedOnboarding) return;
    
    // If we have the onboarding data (i.e., it's not 'undefined' initial state)
    if (onboardingProgress !== undefined) {
      setHasCheckedOnboarding(true);
      
      // Only redirect if onboarding was never started OR explicitly incomplete
      if (onboardingProgress === null || (onboardingProgress && !onboardingProgress.completed)) {
        // Check if user has explicitly skipped onboarding (stored in sessionStorage)
        const hasSkippedOnboarding = sessionStorage.getItem('onboarding_skipped');
        if (!hasSkippedOnboarding) {
          navigate(createPageUrl("OnboardingFlow"));
        }
      }
    }
  }, [currentUser, onboardingProgress, hasCheckedOnboarding, navigate]);

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

  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['social-posts'],
    queryFn: async () => {
      try {
        const allPosts = await base44.entities.SocialPost.list('-created_date');
        
        // Track post views for the first few posts (e.g., top 5)
        if (currentUser?.email) {
          allPosts.slice(0, 5).forEach(post => {
            trackView("post", post.id, post.vibe || "social");
          });
        }
        
        return allPosts;
      } catch (err) {
        console.log("Error loading posts:", err);
        return [];
      }
    },
    initialData: [],
    retry: 1,
    retryDelay: 1000
  });

  const toggleLike = (postId) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
        // Track like interaction
        if (currentUser?.email) {
          trackInteractionMutation.mutate({
            interaction_type: "like",
            content_type: "post",
            content_id: postId,
            content_category: "social"
          });
        }
      }
      return newSet;
    });
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
    { icon: Compass, label: "Explore", color: "purple", path: "explore" },
    { icon: Wallet, label: "Wallet", color: "green", path: "Wallet" },
    { icon: ShoppingBag, label: "Shop", color: "orange", path: "Marketplace" },
    { icon: Tv, label: "Stream", color: "red", path: "Streaming" },
    { icon: Wand2, label: "AI Studio", color: "violet", path: "AIStudio" },
    { icon: Music, label: "Music", color: "pink", path: "Vibe" },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Stories Bar */}
      <div className="sticky top-16 z-30 glass-effect border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {/* Add Your Story */}
          <button className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center relative">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-medium">Your Story</span>
          </button>

          {/* Stories from others */}
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 p-0.5">
                <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-white font-bold">
                  U{i}
                </div>
              </div>
              <span className="text-gray-400 text-xs">User {i}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Access Pills */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {quickAccess.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(createPageUrl(item.path))}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 glass-effect rounded-full hover:bg-white/10 transition border border-white/20`}
            >
              <item.icon className={`w-4 h-4 text-${item.color}-400`} />
              <span className="text-white text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto">
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="mb-6"
          >
            {/* Post Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
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
              </div>
              <button className="text-gray-400 hover:text-white">
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </div>

            {/* Post Image */}
            <div className="relative">
              <img 
                src={post.image_url} 
                alt={post.caption}
                className="w-full aspect-square object-cover"
              />
              
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
                  onClick={() => toggleLike(post.id)}
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
            <p className="px-4 pb-3 text-gray-500 text-xs uppercase">
              {new Date(post.created_date).toLocaleDateString()}
            </p>
          </motion.div>
        ))}

        {posts.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-10 h-10 text-pink-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Welcome to PlaySoFlo</h3>
            <p className="text-gray-400 mb-6">Share your lifestyle experiences with the community</p>
            <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-bold hover:scale-105 transition-transform">
              Create Your First Post
            </button>
          </div>
        )}
      </div>

      {/* Floating Create Button */}
      <button className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform glow-effect z-40">
        <Plus className="w-8 h-8 text-white" />
      </button>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
