import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  TrendingUp, Users, Hash, Sparkles, Search, Flame,
  Heart, MessageCircle, Eye, Clock, Crown, Star,
  Globe, MapPin, ChevronRight, Radio, Clapperboard
} from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GoLiveNowModal from "../components/livestream/GoLiveNowModal";

export default function Social() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showGoLive, setShowGoLive] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch trending posts
  const { data: trendingPosts = [] } = useQuery({
    queryKey: ['trending-posts'],
    queryFn: async () => {
      const posts = await base44.entities.SocialPost.list('-likes_count', 20);
      return posts.filter(p => p.image_url && !p.image_url.includes('text-story'));
    }
  });

  // Fetch active livestreams
  const { data: activeLivestreams = [] } = useQuery({
    queryKey: ['social-live-streams'],
    queryFn: () => base44.entities.StreamingContent.filter({ is_live: true, status: "published" }),
    refetchInterval: 30000,
  });

  // Fetch popular users
  const { data: popularUsers = [] } = useQuery({
    queryKey: ['popular-users'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.email !== currentUser?.email).slice(0, 10);
    },
    enabled: !!currentUser
  });

  // Fetch recent activity
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => base44.entities.UserInteraction.list('-created_date', 50)
  });

  const categories = ["all", "energetic", "chill", "luxury", "adventure", "romantic", "party"];

  const filteredPosts = trendingPosts.filter(post => {
    const matchesSearch = post.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || post.vibe === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTrendingScore = (post) => {
    const ageHours = (Date.now() - new Date(post.created_date)) / (1000 * 60 * 60);
    const score = (post.likes_count * 10 + post.comments_count * 20) / (ageHours + 1);
    return score;
  };

  const sortedPosts = [...filteredPosts].sort((a, b) => getTrendingScore(b) - getTrendingScore(a));

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="glass-effect border-b border-white/10 px-6 py-6 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Flame className="w-10 h-10 text-orange-400" />
            Discover
          </h1>
          <p className="text-gray-400">Trending content, popular creators, and what's hot right now</p>

          {/* Reels shortcut */}
          <button
            onClick={() => navigate(createPageUrl("Reels"))}
            className="mt-4 w-full flex items-center gap-3 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/30 rounded-2xl px-4 py-3 hover:from-purple-600/50 hover:to-pink-600/50 transition mb-3"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm">Reels</p>
              <p className="text-gray-400 text-xs">Short videos from creators</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </button>

          {/* Search + Go Live */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts, users, locations..."
                className="pl-12 bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
            </div>
            {currentUser && (
              <Button
                onClick={() => setShowGoLive(true)}
                className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 animate-pulse flex-shrink-0"
              >
                <Radio className="w-4 h-4 mr-2" />
                Go Live
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Live Streams Section */}
        {activeLivestreams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Radio className="w-6 h-6 text-red-500 animate-pulse" />
              Live Now ({activeLivestreams.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeLivestreams.map((stream) => (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => navigate(createPageUrl("LivestreamViewer") + `?id=${stream.id}`)}
                  className="relative h-44 rounded-2xl overflow-hidden cursor-pointer group"
                >
                  <img
                    src={stream.thumbnail_url || "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400"}
                    alt={stream.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                  <div className="absolute top-3 left-3 px-2 py-1 bg-red-500 rounded-full text-xs font-bold text-white flex items-center gap-1 animate-pulse">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" /> LIVE
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    {stream.creator_username && (
                      <p className="text-purple-300 text-xs mb-0.5">@{stream.creator_username}</p>
                    )}
                    <h3 className="text-white font-bold line-clamp-1">{stream.title}</h3>
                    <div className="flex items-center gap-1 text-gray-300 text-xs mt-1">
                      <Users className="w-3 h-3" />{stream.views || 0} watching
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="bg-white/10 border border-white/20 mb-6">
            <TabsTrigger value="trending">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="people">
              <Users className="w-4 h-4 mr-2" />
              People
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Hash className="w-4 h-4 mr-2" />
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending">
            {/* Category Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>

            {/* Trending Posts Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(createPageUrl("UserProfile") + `?user=${post.created_by}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-800">
                    <img
                      src={post.image_url}
                      alt={post.caption}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white text-sm line-clamp-2 mb-2">{post.caption}</p>
                        <div className="flex items-center gap-4 text-white text-sm">
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {post.likes_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {post.comments_count}
                          </div>
                        </div>
                      </div>
                    </div>

                    {post.vibe && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-purple-600/90 backdrop-blur-sm rounded-full text-white text-xs font-bold">
                        {post.vibe}
                      </div>
                    )}

                    {index < 3 && (
                      <div className="absolute top-3 right-3 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {sortedPosts.length === 0 && (
              <div className="text-center py-20">
                <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No trending posts found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="people">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(createPageUrl("UserProfile") + `?user=${encodeURIComponent(user.email)}`)}
                  className="glass-effect border-white/10 rounded-2xl p-6 hover:bg-white/10 transition cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
                      {user.full_name?.[0] || user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold truncate">{user.full_name || "User"}</h3>
                      <p className="text-gray-400 text-sm truncate">{user.email}</p>
                    </div>
                  </div>

                  {user.bio && (
                    <p className="text-gray-300 text-sm line-clamp-2 mb-3">{user.bio}</p>
                  )}

                  <div className="flex items-center gap-2">
                    {user.is_creator && (
                      <Badge className="bg-purple-500/20 text-purple-400">Creator</Badge>
                    )}
                    {user.is_provider && (
                      <Badge className="bg-blue-500/20 text-blue-400">Provider</Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="categories">
            <div className="grid md:grid-cols-2 gap-4">
              {categories.filter(c => c !== "all").map((category, index) => {
                const categoryPosts = trendingPosts.filter(p => p.vibe === category);
                const topPost = categoryPosts[0];

                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedCategory(category)}
                    className="glass-effect border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition cursor-pointer group"
                  >
                    {topPost?.image_url && (
                      <div className="relative h-48">
                        <img
                          src={topPost.image_url}
                          alt={category}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-white text-2xl font-bold capitalize mb-1">{category}</h3>
                          <p className="text-gray-300 text-sm">{categoryPosts.length} posts</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {showGoLive && currentUser && (
        <GoLiveNowModal
          currentUser={currentUser}
          onClose={() => setShowGoLive(false)}
        />
      )}
    </div>
  );
}