import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { 
  Heart, MessageCircle, Share2, Bookmark, MapPin,
  Music, Sparkles, Plus, MoreHorizontal, Activity, Wand2, Upload, Image, Copy, Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import TipButton from "../components/TipButton";
import CommentSection from "../components/social/CommentSection";
import FollowButton from "../components/social/FollowButton";
import { trackPostCreated, trackPostLiked, trackPostShared } from "@/components/analytics/analytics";

export default function Social() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyMedia, setStoryMedia] = useState(null);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [viewingStory, setViewingStory] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("User not authenticated");
      }
    };
    fetchUser();
  }, []);

  // Fetch user's following list
  const { data: following = [] } = useQuery({
    queryKey: ['my-following', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const follows = await base44.entities.Follow.filter({ follower_email: currentUser.email });
      return follows.map(f => f.following_email);
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch posts from followed users + own posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-feed', currentUser?.email],
    queryFn: async () => {
      const allPosts = await base44.entities.SocialPost.list('-created_date', 100);
      if (!currentUser) return allPosts;
      
      // Show posts from followed users + own posts
      const feedPosts = allPosts.filter(post => 
        following.includes(post.created_by) || post.created_by === currentUser.email
      );
      
      return feedPosts.length > 0 ? feedPosts : allPosts.slice(0, 20); // Fallback to all if no following
    },
    enabled: !!currentUser,
    refetchInterval: 30000,
    initialData: []
  });

  // Fetch stories (24-hour ephemeral content)
  const { data: stories = [] } = useQuery({
    queryKey: ['stories', currentUser?.email],
    queryFn: async () => {
      const allStories = await base44.entities.Story.list('-created_date');
      const now = new Date();
      
      // Filter out expired stories (older than 24 hours)
      const activeStories = allStories.filter(story => {
        const expiresAt = new Date(story.expires_at || story.created_date);
        return expiresAt > now;
      });
      
      // Group by user
      const groupedByUser = {};
      activeStories.forEach(story => {
        if (!groupedByUser[story.created_by]) {
          groupedByUser[story.created_by] = [];
        }
        groupedByUser[story.created_by].push(story);
      });
      
      return groupedByUser;
    },
    enabled: !!currentUser,
    refetchInterval: 60000,
    initialData: {}
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async (post) => {
      const isLiked = likedPosts.has(post.id);
      const newLikesCount = isLiked ? post.likes_count - 1 : post.likes_count + 1;
      
      await base44.entities.SocialPost.update(post.id, {
        likes_count: newLikesCount
      });

      // Send notification if liking (not unliking)
      if (!isLiked && post.created_by !== currentUser.email) {
        await base44.entities.Notification.create({
          recipient_email: post.created_by,
          type: "post_like",
          title: "New like!",
          message: `${currentUser.full_name} liked your post`,
          reference_type: "post",
          reference_id: post.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_photo
        });
        
        // Track analytics
        trackPostLiked(post.id);
      }
      
      return newLikesCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['social-feed']);
      queryClient.invalidateQueries(['social-posts']);
    }
  });

  const toggleLike = (post) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(post.id)) {
        newSet.delete(post.id);
      } else {
        newSet.add(post.id);
      }
      return newSet;
    });
    toggleLikeMutation.mutate(post);
  };

  const handleSharePost = async (post) => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.created_by}`,
          text: post.caption,
          url: shareUrl,
        });
        trackPostShared(post.id);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Post link copied to clipboard!");
        trackPostShared(post.id);
      }
    } catch (error) {
      console.log('Share failed:', error);
    }
  };

  const handleRepost = async (post) => {
    if (!currentUser) {
      toast.error("Please log in to repost");
      return;
    }

    try {
      await base44.entities.SocialPost.create({
        caption: `Repost from @${post.created_by}\n\n${post.caption}`,
        image_url: post.image_url,
        location: post.location,
        music_playing: post.music_playing,
        vibe: post.vibe,
        is_experience: post.is_experience,
        experience_type: post.experience_type,
        likes_count: 0,
        comments_count: 0
      });

      toast.success("Post shared to your feed!");
      queryClient.invalidateQueries(['social-posts']);
    } catch (error) {
      toast.error("Failed to share post");
    }
  };

  const handleStoryUpload = async (file) => {
    if (!file) return;
    
    setUploadingStory(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setStoryMedia({ url: file_url, type: file.type.startsWith('video/') ? 'video' : 'image' });
      setShowStoryModal(true);
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploadingStory(false);
    }
  };

  const createStoryMutation = useMutation({
    mutationFn: async (data) => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      return await base44.entities.Story.create({
        ...data,
        expires_at: expiresAt.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stories']);
      setShowStoryModal(false);
      setStoryMedia(null);
      toast.success("Story posted!");
    }
  });

  const viewStoryMutation = useMutation({
    mutationFn: async (storyId) => {
      const story = Object.values(stories).flat().find(s => s.id === storyId);
      if (!story || story.views?.includes(currentUser.email)) return;
      
      await base44.entities.Story.update(storyId, {
        views: [...(story.views || []), currentUser.email]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stories']);
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      if (!currentUser?.email) throw new Error("User not authenticated");
      const post = await base44.entities.SocialPost.create(postData);
      
      // Notify followers about new post
      const followers = await base44.entities.Follow.filter({ 
        following_email: currentUser.email 
      });
      
      // Send notifications to followers (batch)
      const notificationPromises = followers.map(follower => 
        base44.entities.Notification.create({
          recipient_email: follower.follower_email,
          type: "new_post",
          title: "New post from someone you follow",
          message: `${currentUser.full_name} shared a new post`,
          reference_type: "post",
          reference_id: post.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_photo
        })
      );
      
      await Promise.all(notificationPromises);
      
      // Track analytics
      trackPostCreated(post.id, post.is_experience ? 'experience' : 'standard');
      
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['social-feed']);
      queryClient.invalidateQueries(['social-posts']);
      setShowCreatePost(false);
      setPostContent("");
      setPostImage("");
      toast.success("Post created!");
    },
    onError: (error) => {
      console.error('Create post error:', error);
      toast.error(error.message || "Failed to create post");
    }
  });

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    if (!currentUser) {
      toast.error("Please log in to upload");
      return;
    }
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPostImage(file_url);
      toast.success("Image uploaded!");
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Upload failed: " + (error.message || 'Unknown error'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !postImage) {
      toast.error("Add some content or an image");
      return;
    }

    if (!currentUser?.email) {
      toast.error("Please log in to create a post");
      return;
    }

    createPostMutation.mutate({
      caption: postContent,
      image_url: postImage || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800",
      likes_count: 0,
      comments_count: 0,
      vibe: "energetic"
    });
  };

  const generateAIPost = async () => {
    if (!postContent.trim()) {
      toast.error("Enter a topic first");
      return;
    }

    setGeneratingAI(true);
    try {
      const prompt = `Write an engaging social media post about: "${postContent}". 
      Make it catchy, authentic, include 3-5 relevant hashtags, and keep it concise (2-3 sentences max).
      Be creative and make it shareable.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true
      });

      setPostContent(result);
      toast.success("AI content generated!");
    } catch (error) {
      toast.error("Failed to generate content");
    } finally {
      setGeneratingAI(false);
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

  return (
    <div className="min-h-screen pb-20">
      {/* Stories Bar */}
      <div className="sticky top-16 z-30 glass-effect border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Stories</h3>
          <Button
            onClick={() => navigate(createPageUrl("CommunityHub"))}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <Users className="w-4 h-4 mr-2" />
            Community Hub
          </Button>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {/* Add Your Story */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <input
              type="file"
              id="story-upload"
              className="hidden"
              accept="image/*,video/*"
              onChange={(e) => handleStoryUpload(e.target.files?.[0])}
            />
            <button 
              onClick={() => document.getElementById('story-upload').click()}
              disabled={uploadingStory}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center relative hover:scale-105 transition"
            >
              {uploadingStory ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-6 h-6 text-white" />
              )}
            </button>
            <span className="text-white text-xs font-medium">Your Story</span>
          </div>

          {/* Stories from users */}
          {Object.entries(stories).map(([userEmail, userStories]) => {
            const hasViewed = userStories.every(s => s.views?.includes(currentUser?.email));
            return (
              <button 
                key={userEmail}
                onClick={() => {
                  setViewingStory(userStories);
                  setCurrentStoryIndex(0);
                  viewStoryMutation.mutate(userStories[0].id);
                }}
                className="flex flex-col items-center gap-2 flex-shrink-0 hover:scale-105 transition"
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${hasViewed ? 'from-gray-500 to-gray-600' : 'from-pink-500 to-purple-500'} p-0.5`}>
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-white font-bold">
                    {userEmail[0].toUpperCase()}
                  </div>
                </div>
                <span className="text-gray-400 text-xs truncate max-w-[64px]">{userEmail.split('@')[0]}</span>
              </button>
            );
          })}
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
              <button 
                onClick={() => navigate(createPageUrl("UserProfile") + `?user=${encodeURIComponent(post.created_by)}`)}
                className="flex items-center gap-3 hover:opacity-80 transition"
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
              <div className="flex items-center gap-2">
                {currentUser && post.created_by !== currentUser.email && (
                  <FollowButton
                    targetEmail={post.created_by}
                    targetName={post.created_by}
                    currentUser={currentUser}
                    size="sm"
                  />
                )}
                <button className="text-gray-400 hover:text-white">
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Post Media */}
            <div className="relative">
              {post.media_type === 'video' ? (
                <video
                  src={post.image_url}
                  controls
                  className="w-full aspect-square object-cover bg-black"
                  playsInline
                />
              ) : post.media_type === 'audio' ? (
                <div className="w-full aspect-square bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
                  <div className="text-center">
                    <Music className="w-20 h-20 text-white mx-auto mb-4" />
                    <audio
                      src={post.image_url}
                      controls
                      className="w-full max-w-sm mx-auto"
                    />
                  </div>
                </div>
              ) : (
                <img 
                  src={post.image_url} 
                  alt={post.caption}
                  className="w-full aspect-square object-cover"
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
                  onClick={() => toggleLike(post)}
                  className="transform active:scale-125 transition-transform hover:scale-110"
                >
                  <Heart 
                    className={`w-7 h-7 ${
                      likedPosts.has(post.id) 
                        ? 'fill-red-500 text-red-500' 
                        : 'text-white hover:text-red-400'
                    }`} 
                  />
                </button>
                <button className="transform hover:scale-110 transition-transform">
                  <MessageCircle className="w-7 h-7 text-white hover:text-blue-400" />
                </button>
                <button 
                  onClick={() => handleRepost(post)}
                  className="transform hover:scale-110 transition-transform group/repost"
                  title="Share to your feed"
                >
                  <Share2 className="w-7 h-7 text-white hover:text-green-400" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-white text-xs whitespace-nowrap opacity-0 group-hover/repost:opacity-100 transition-opacity pointer-events-none">
                    Share to Feed
                  </span>
                </button>
                <button 
                  onClick={() => handleSharePost(post)}
                  className="transform hover:scale-110 transition-transform group/share"
                  title="Copy link"
                >
                  <Copy className="w-6 h-6 text-white hover:text-purple-400" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-white text-xs whitespace-nowrap opacity-0 group-hover/share:opacity-100 transition-opacity pointer-events-none">
                    Copy Link
                  </span>
                </button>
                <div className="transform hover:scale-110 transition-transform">
                  <TipButton 
                    creatorEmail={post.created_by}
                    creatorName={post.created_by}
                    contentId={post.id}
                    variant="ghost"
                    size="sm"
                    showAmount={false}
                  />
                </div>
              </div>
              <button className="transform hover:scale-110 transition-transform">
                <Bookmark className="w-7 h-7 text-white hover:text-yellow-400" />
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
                <button 
                  onClick={() => navigate(createPageUrl("UserProfile") + `?user=${encodeURIComponent(post.created_by)}`)}
                  className="font-semibold mr-2 hover:opacity-80 transition"
                >
                  {post.created_by || "User"}
                </button>
                {post.caption}
              </p>
            </div>

            {/* Comments Section */}
            <CommentSection 
              postId={post.id} 
              commentsCount={post.comments_count}
              currentUser={currentUser}
            />

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
            <h3 className="text-2xl font-bold text-white mb-2">Welcome to Social</h3>
            <p className="text-gray-400 mb-6">Share your lifestyle experiences with the community</p>
            <button 
              onClick={() => setShowCreatePost(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-bold hover:scale-105 transition-transform"
            >
              Create Your First Post
            </button>
          </div>
        )}
      </div>

      {/* Floating Create Button */}
      <button 
        onClick={() => setShowCreatePost(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform glow-effect z-40"
      >
        <Plus className="w-8 h-8 text-white" />
      </button>

      {/* Story Modal */}
      <AnimatePresence>
        {showStoryModal && storyMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => {
              setShowStoryModal(false);
              setStoryMedia(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-4">Post Story</h3>
              
              {storyMedia.type === 'video' ? (
                <video src={storyMedia.url} controls className="w-full rounded-xl mb-4" />
              ) : (
                <img src={storyMedia.url} alt="Story" className="w-full rounded-xl mb-4" />
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowStoryModal(false);
                    setStoryMedia(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createStoryMutation.mutate({
                    media_url: storyMedia.url,
                    media_type: storyMedia.type
                  })}
                  disabled={createStoryMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {createStoryMutation.isPending ? "Posting..." : "Post Story"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story Viewer */}
      <AnimatePresence>
        {viewingStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            <div className="relative h-full">
              {/* Story Progress Bars */}
              <div className="absolute top-0 left-0 right-0 p-2 z-10 flex gap-1">
                {viewingStory.map((_, idx) => (
                  <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-white transition-all ${idx === currentStoryIndex ? 'w-full duration-[5000ms]' : idx < currentStoryIndex ? 'w-full' : 'w-0'}`}
                    />
                  </div>
                ))}
              </div>

              {/* Story Header */}
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {viewingStory[currentStoryIndex].created_by[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{viewingStory[currentStoryIndex].created_by}</p>
                    <p className="text-gray-300 text-xs">
                      {new Date(viewingStory[currentStoryIndex].created_date).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button onClick={() => setViewingStory(null)} className="text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Story Content */}
              <div className="h-full flex items-center justify-center">
                {viewingStory[currentStoryIndex].media_type === 'video' ? (
                  <video
                    src={viewingStory[currentStoryIndex].media_url}
                    className="max-h-full max-w-full"
                    autoPlay
                    onEnded={() => {
                      if (currentStoryIndex < viewingStory.length - 1) {
                        setCurrentStoryIndex(currentStoryIndex + 1);
                        viewStoryMutation.mutate(viewingStory[currentStoryIndex + 1].id);
                      } else {
                        setViewingStory(null);
                      }
                    }}
                  />
                ) : (
                  <img
                    src={viewingStory[currentStoryIndex].media_url}
                    alt="Story"
                    className="max-h-full max-w-full"
                  />
                )}
              </div>

              {/* Navigation */}
              <div className="absolute inset-0 flex">
                <button
                  onClick={() => {
                    if (currentStoryIndex > 0) {
                      setCurrentStoryIndex(currentStoryIndex - 1);
                    }
                  }}
                  className="flex-1"
                />
                <button
                  onClick={() => {
                    if (currentStoryIndex < viewingStory.length - 1) {
                      setCurrentStoryIndex(currentStoryIndex + 1);
                      viewStoryMutation.mutate(viewingStory[currentStoryIndex + 1].id);
                    } else {
                      setViewingStory(null);
                    }
                  }}
                  className="flex-1"
                />
              </div>

              {/* Caption */}
              {viewingStory[currentStoryIndex].caption && (
                <div className="absolute bottom-20 left-4 right-4 text-center">
                  <p className="text-white text-lg font-medium">{viewingStory[currentStoryIndex].caption}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowCreatePost(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gray-900 rounded-3xl p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-4">Create Post</h3>
              
              <div className="space-y-3 mb-4">
                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What's on your mind? (Type a topic for AI to help)"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-500 min-h-[120px]"
                />

                {postImage && (
                  <div className="relative">
                    <img src={postImage} alt="Upload" className="w-full h-48 object-cover rounded-lg" />
                    <button
                      onClick={() => setPostImage("")}
                      className="absolute top-2 right-2 p-2 bg-red-500 rounded-full hover:bg-red-600 transition"
                    >
                      <Plus className="w-4 h-4 text-white rotate-45" />
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('image-upload').click()}
                    disabled={uploadingImage}
                    variant="outline"
                    className="flex-1 bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30"
                  >
                    {uploadingImage ? (
                      "Uploading..."
                    ) : (
                      <>
                        <Image className="w-4 h-4 mr-2" />
                        Add Image
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={generateAIPost}
                    disabled={generatingAI || !postContent.trim()}
                    variant="outline"
                    className="flex-1 bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30"
                  >
                    {generatingAI ? (
                      "Generating..."
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        AI Assist
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setShowCreatePost(false);
                    setPostContent("");
                    setPostImage("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePost}
                  disabled={(!postContent.trim() && !postImage) || createPostMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {createPostMutation.isPending ? "Posting..." : "Post"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}