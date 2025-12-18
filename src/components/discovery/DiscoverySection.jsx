import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  TrendingUp, Users, Flame, Heart, MessageCircle, 
  Crown, Sparkles, ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function DiscoverySection({ currentUser }) {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("trending");

  // Fetch trending posts
  const { data: trendingPosts = [] } = useQuery({
    queryKey: ['trending-posts-home'],
    queryFn: async () => {
      const posts = await base44.entities.SocialPost.list('-likes_count', 10);
      return posts.filter(p => p.image_url && !p.image_url.includes('text-story'));
    }
  });

  // Fetch popular users
  const { data: popularUsers = [] } = useQuery({
    queryKey: ['popular-users-home'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.email !== currentUser?.email).slice(0, 6);
    },
    enabled: !!currentUser
  });

  const getTrendingScore = (post) => {
    const ageHours = (Date.now() - new Date(post.created_date)) / (1000 * 60 * 60);
    return (post.likes_count * 10 + post.comments_count * 20) / (ageHours + 1);
  };

  const sortedPosts = [...trendingPosts].sort((a, b) => getTrendingScore(b) - getTrendingScore(a)).slice(0, 6);

  return (
    <div className="border-b border-white/10 pb-4">
      {/* Header */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-400" />
            Discover
          </h3>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 hide-scrollbar">
          <button
            onClick={() => setSelectedTab("trending")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
              selectedTab === "trending"
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Trending
          </button>
          <button
            onClick={() => setSelectedTab("people")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
              selectedTab === "people"
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Users className="w-4 h-4" />
            Popular People
          </button>
        </div>

        {/* Content */}
        {selectedTab === "trending" ? (
          <div className="grid grid-cols-3 gap-2">
            {sortedPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(createPageUrl("UserProfile") + `?user=${post.created_by}`)}
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
              >
                <img
                  src={post.image_url}
                  alt={post.caption}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likes_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.comments_count}
                      </div>
                    </div>
                  </div>
                </div>
                {index < 3 && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                )}
                {post.vibe && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600/90 backdrop-blur-sm rounded-full text-white text-[10px] font-bold">
                    {post.vibe}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {popularUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(createPageUrl("UserProfile") + `?user=${encodeURIComponent(user.email)}`)}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {user.full_name?.[0] || user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold truncate text-sm">{user.full_name || "User"}</h4>
                  <p className="text-gray-400 text-xs truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  {user.is_creator && (
                    <Badge className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-0">
                      <Sparkles className="w-3 h-3" />
                    </Badge>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}