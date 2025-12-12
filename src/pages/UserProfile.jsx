import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Grid, Video, Bookmark, UserPlus, UserCheck, MessageCircle, MoreHorizontal, ChevronLeft, Play, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import FollowButton from "../components/social/FollowButton";

export default function UserProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const userParam = searchParams.get("user") || searchParams.get("username") || searchParams.get("email");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: profileUser, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile-user', userParam],
    queryFn: async () => {
      if (!userParam) return null;
      
      // Try to find by email first, then username, then full_name
      const users = await base44.entities.User.list();
      
      // First try exact email match
      let user = users.find(u => u.email === userParam);
      
      // Then try username match
      if (!user) {
        user = users.find(u => u.username === userParam);
      }
      
      // Finally try full_name match
      if (!user) {
        user = users.find(u => u.full_name === userParam);
      }
      
      return user || null;
    },
    enabled: !!userParam
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['user-posts', profileUser?.email],
    queryFn: () => base44.entities.SocialPost.filter({ created_by: profileUser.email }, '-created_date'),
    enabled: !!profileUser?.email
  });

  const isOwnProfile = currentUser?.email === profileUser?.email;

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-2">User not found</p>
          <p className="text-gray-400 text-sm mb-4">The profile you're looking for doesn't exist</p>
          <Button onClick={() => navigate(-1)} className="bg-purple-600 hover:bg-purple-700">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-16 z-30 glass-effect border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">{profileUser.username || profileUser.full_name}</h1>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-full">
          <MoreHorizontal className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Profile Info */}
      <div className="px-4 py-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
            {(profileUser.full_name?.[0] || "U").toUpperCase()}
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-1">{profileUser.full_name}</h2>
            {profileUser.username && (
              <p className="text-gray-400 mb-2">@{profileUser.username}</p>
            )}
            {profileUser.bio && (
              <p className="text-gray-300 text-sm mb-3">{profileUser.bio}</p>
            )}
            
            <div className="flex gap-6 mb-4">
              <div className="text-center">
                <p className="text-white font-bold text-lg">{posts.length}</p>
                <p className="text-gray-400 text-sm">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">{profileUser.followers_count || 0}</p>
                <p className="text-gray-400 text-sm">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">{profileUser.following_count || 0}</p>
                <p className="text-gray-400 text-sm">Following</p>
              </div>
            </div>

            {!isOwnProfile && currentUser && (
              <div className="flex gap-2">
                <FollowButton
                  targetEmail={profileUser.email}
                  targetName={profileUser.full_name}
                  currentUser={currentUser}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  className="bg-white/5 border-white/20 hover:bg-white/10"
                  onClick={() => {
                    const conversationId = [currentUser.email, profileUser.email].sort().join('_');
                    navigate(`/messages?conversation=${conversationId}`);
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex-1 py-3 flex items-center justify-center gap-2 ${
            activeTab === "posts" ? "border-b-2 border-purple-500 text-white" : "text-gray-400"
          }`}
        >
          <Grid className="w-5 h-5" />
          Posts
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`flex-1 py-3 flex items-center justify-center gap-2 ${
            activeTab === "videos" ? "border-b-2 border-purple-500 text-white" : "text-gray-400"
          }`}
        >
          <Video className="w-5 h-5" />
          Videos
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-3 gap-1 p-1">
        {activeTab === "posts" && posts.map((post, idx) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="aspect-square relative cursor-pointer group"
            onClick={() => {
              // Navigate to post detail or open modal
              toast.info("Post detail view - coming soon!");
            }}
          >
            <img src={post.image_url} alt={post.caption} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-white">
                <Heart className="w-5 h-5 fill-white" />
                <span className="font-bold text-lg">{post.likes_count || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <MessageCircle className="w-5 h-5 fill-white" />
                <span className="font-bold text-lg">{post.comments_count || 0}</span>
              </div>
            </div>
            {post.music_playing && (
              <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-2">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
            )}
            {post.is_experience && (
              <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full px-2 py-1 text-white text-xs font-bold">
                Experience
              </div>
            )}
          </motion.div>
        ))}
        
        {activeTab === "videos" && posts.filter(p => p.music_playing || p.is_experience).map((post, idx) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="aspect-square relative cursor-pointer group"
          >
            <img src={post.image_url} alt={post.caption} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="w-12 h-12 text-white" />
            </div>
            <div className="absolute bottom-2 left-2 flex items-center gap-2 text-white text-sm">
              <Play className="w-4 h-4" />
              <span className="font-bold">{post.likes_count || 0}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400">No posts yet</p>
        </div>
      )}
    </div>
  );
}