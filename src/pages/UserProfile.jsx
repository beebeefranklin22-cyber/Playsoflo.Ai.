import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Grid, Video, Bookmark, UserPlus, UserCheck, MessageCircle, MoreHorizontal, ChevronLeft, Play } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function UserProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const username = searchParams.get("username") || searchParams.get("email");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: profileUser } = useQuery({
    queryKey: ['profile-user', username],
    queryFn: async () => {
      if (!username) return null;
      const users = await base44.entities.User.filter({ 
        $or: [{ username }, { email: username }]
      });
      return users[0];
    },
    enabled: !!username
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['user-posts', profileUser?.email],
    queryFn: () => base44.entities.SocialPost.filter({ created_by: profileUser.email }, '-created_date'),
    enabled: !!profileUser?.email
  });

  const isFollowing = currentUser?.following?.includes(profileUser?.email);
  const isOwnProfile = currentUser?.email === profileUser?.email;

  const followMutation = useMutation({
    mutationFn: async () => {
      const newFollowing = isFollowing
        ? currentUser.following.filter(e => e !== profileUser.email)
        : [...(currentUser.following || []), profileUser.email];
      
      await base44.auth.updateMe({ following: newFollowing });
      
      // Update follower counts
      await base44.asServiceRole.entities.User.update(profileUser.id, {
        followers_count: (profileUser.followers_count || 0) + (isFollowing ? -1 : 1)
      });
      
      return newFollowing;
    },
    onSuccess: (newFollowing) => {
      setCurrentUser(prev => ({ ...prev, following: newFollowing }));
      queryClient.invalidateQueries({ queryKey: ['profile-user'] });
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
    }
  });

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl">User not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
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

            {!isOwnProfile && (
              <div className="flex gap-2">
                <Button
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  className={isFollowing ? "bg-white/10 hover:bg-white/20" : "bg-purple-600 hover:bg-purple-700"}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
                <Button variant="outline" className="bg-white/5 border-white/20">
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
        {posts.map((post, idx) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="aspect-square relative cursor-pointer group"
          >
            <img src={post.image_url} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 text-white">
                <span className="font-bold">{post.likes_count || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-white">
                <MessageCircle className="w-5 h-5" />
                <span className="font-bold">{post.comments_count || 0}</span>
              </div>
            </div>
            {post.music_playing && (
              <div className="absolute top-2 right-2">
                <Play className="w-6 h-6 text-white" />
              </div>
            )}
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