import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Heart, MessageCircle, ArrowLeft, 
  Sparkles, Grid, Star, Users
} from "lucide-react";
import { motion } from "framer-motion";

export default function UserProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const [likedPosts, setLikedPosts] = useState(new Set());
  
  const params = new URLSearchParams(location.search);
  const userEmail = params.get('user');

  const { data: posts = [] } = useQuery({
    queryKey: ['user-posts', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return await base44.entities.SocialPost.filter({ created_by: userEmail });
    },
    enabled: !!userEmail,
    initialData: []
  });

  const { data: userRatings = [] } = useQuery({
    queryKey: ['user-ratings', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return await base44.entities.Rating.filter({ rated_email: userEmail });
    },
    enabled: !!userEmail,
    initialData: []
  });

  const averageRating = userRatings.length > 0
    ? (userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length).toFixed(1)
    : 5.0;

  const toggleLike = (postId) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">User not found</p>
      </div>
    );
  }

  const userName = userEmail.split('@')[0];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-16 z-30 glass-effect border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">{userName}</h1>
            <p className="text-gray-400 text-sm">{posts.length} posts</p>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 py-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
            {userName[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-white text-2xl font-bold mb-1">{userName}</h2>
            <p className="text-gray-400 mb-3">{userEmail}</p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-white">
                <Grid className="w-4 h-4" />
                <span className="font-bold">{posts.length}</span> posts
              </div>
              <div className="flex items-center gap-1 text-white">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="font-bold">{averageRating}</span> rating
              </div>
              <div className="flex items-center gap-1 text-white">
                <Users className="w-4 h-4" />
                <span className="font-bold">{userRatings.length}</span> reviews
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square relative group cursor-pointer"
              onClick={() => {
                // Could open a post detail modal here
              }}
            >
              <img
                src={post.image_url}
                alt={post.caption}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <div className="flex items-center gap-1 text-white">
                  <Heart className="w-5 h-5 fill-white" />
                  <span className="font-bold">{post.likes_count || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-white">
                  <MessageCircle className="w-5 h-5 fill-white" />
                  <span className="font-bold">{post.comments_count || 0}</span>
                </div>
              </div>
              
              {post.is_experience && (
                <div className="absolute top-2 right-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-20">
            <Grid className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No posts yet</h3>
            <p className="text-gray-400">When {userName} shares photos, you'll see them here</p>
          </div>
        )}
      </div>
    </div>
  );
}