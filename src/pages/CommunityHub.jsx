import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Newspaper, Briefcase, MessageSquare, DollarSign,
  TrendingUp, Users, ChevronRight, Clock, Eye,
  Plus, Star, Search, Flame, ThumbsUp, Radio, MapPin
} from "lucide-react";
import CitySelector from "../components/location/CitySelector";
import { useUserLocation } from "../hooks/useUserLocation";
import { motion, AnimatePresence } from "framer-motion";

export default function CommunityHub() {
  const navigate = useNavigate();
  const { userCity, refreshLocation } = useUserLocation();
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [contentFilter, setContentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: newsCount = 0 } = useQuery({
    queryKey: ['news-count'],
    queryFn: async () => {
      const posts = await base44.entities.NewsPost.filter({ status: "published" });
      return posts.length;
    },
    initialData: 0
  });

  const { data: jobsCount = 0 } = useQuery({
    queryKey: ['jobs-count'],
    queryFn: async () => {
      const jobs = await base44.entities.JobGig.filter({ status: "active" });
      return jobs.length;
    },
    initialData: 0
  });

  const { data: threadsCount = 0 } = useQuery({
    queryKey: ['threads-count'],
    queryFn: async () => {
      const threads = await base44.entities.ForumThread.list();
      return threads.length;
    },
    initialData: 0
  });

  const { data: affiliateCount = 0 } = useQuery({
    queryKey: ['affiliate-count'],
    queryFn: async () => {
      const listings = await base44.entities.AffiliateListing.filter({ status: "active" });
      return listings.length;
    },
    initialData: 0
  });

  const { data: allContent = [] } = useQuery({
    queryKey: ['community-feed', sortBy],
    queryFn: async () => {
      const [news, threads, groups] = await Promise.all([
        base44.entities.NewsPost.filter({ status: 'published' }, '-created_date', 50),
        base44.entities.ForumThread.list('-created_date', 50),
        base44.entities.ForumGroup.filter({ is_active: true }, '-created_date', 30)
      ]);

      const combined = [
        ...news.map(n => ({ ...n, type: 'news', engagement: (n.views || 0) + (n.likes?.length || 0) * 5 })),
        ...threads.map(t => ({ ...t, type: 'thread', engagement: (t.views || 0) + (t.reply_count || 0) * 3 })),
        ...groups.map(g => ({ ...g, type: 'group', engagement: (g.member_count || 0) * 2 + (g.thread_count || 0) }))
      ];

      if (sortBy === 'trending') {
        return combined.sort((a, b) => b.engagement - a.engagement);
      }
      return combined.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    initialData: []
  });

  const { data: followedCreators = [] } = useQuery({
    queryKey: ['followed-creators'],
    queryFn: async () => {
      if (!currentUser) return [];
      const follows = await base44.entities.Follow.filter({ follower_email: currentUser.email });
      return follows.map(f => f.following_email);
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: savedGroups = [] } = useQuery({
    queryKey: ['user-saved-groups'],
    queryFn: async () => {
      if (!currentUser) return [];
      const saved = await base44.entities.SavedGroup.filter({ user_email: currentUser.email });
      return saved.map(s => s.group_id);
    },
    enabled: !!currentUser,
    initialData: []
  });

  const filteredContent = allContent.filter(item => {
    if (contentFilter === 'following' && item.type === 'news') {
      return followedCreators.includes(item.author_email);
    }
    if (contentFilter === 'following' && item.type === 'thread') {
      return followedCreators.includes(item.author_email);
    }
    if (contentFilter === 'saved' && item.type === 'group') {
      return savedGroups.includes(item.id);
    }
    if (contentFilter === 'news') return item.type === 'news';
    if (contentFilter === 'forums') return item.type === 'thread';
    if (contentFilter === 'groups') return item.type === 'group';
    return true;
  }).filter(item => {
    if (!searchQuery) return true;
    return item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.content?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const trendingContent = [...allContent]
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 10);

  const sections = [
    {
      id: "news",
      title: "News & Updates",
      description: "Community news, announcements, and trending stories",
      icon: Newspaper,
      color: "from-blue-600 to-cyan-600",
      path: "CommunityNews",
      count: newsCount,
      stats: "Latest stories"
    },
    {
      id: "jobs",
      title: "Jobs & Gigs",
      description: "Find work opportunities, post jobs, and connect with talent",
      icon: Briefcase,
      color: "from-purple-600 to-pink-600",
      path: "CommunityJobs",
      count: jobsCount,
      stats: "Active listings"
    },
    {
      id: "forums",
      title: "Community Forums",
      description: "Join discussions, ask questions, and share knowledge",
      icon: MessageSquare,
      color: "from-green-600 to-emerald-600",
      path: "ForumGroups",
      count: threadsCount,
      stats: "Active threads"
    },
    {
      id: "affiliate",
      title: "Affiliate Programs",
      description: "Discover partnerships and monetization opportunities",
      icon: DollarSign,
      color: "from-orange-600 to-red-600",
      path: "CommunityAffiliate",
      count: affiliateCount,
      stats: "Active programs"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-3">
              <Users className="w-10 h-10" />
              Community Hub
            </h1>
            <p className="text-white/90 text-lg max-w-2xl">
              Your central feed for all community activity
            </p>
            {userCity && (
              <button
                onClick={() => setShowCitySelector(true)}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm transition"
              >
                <MapPin className="w-4 h-4" />
                {userCity} — Change City
              </button>
            )}
            {!userCity && (
              <button
                onClick={() => setShowCitySelector(true)}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm transition"
              >
                <MapPin className="w-4 h-4" />
                Set Your City for Local Content
              </button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search community content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            <Select value={contentFilter} onValueChange={setContentFilter}>
              <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content</SelectItem>
                <SelectItem value="news">News Only</SelectItem>
                <SelectItem value="forums">Forums Only</SelectItem>
                <SelectItem value="groups">Groups Only</SelectItem>
                {currentUser && <SelectItem value="following">Following</SelectItem>}
                {currentUser && <SelectItem value="saved">Saved Groups</SelectItem>}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content Feed */}
        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="bg-white/5 grid grid-cols-2 w-full max-w-md mx-auto">
            <TabsTrigger value="feed">Activity Feed</TabsTrigger>
            <TabsTrigger value="trending">
              <Flame className="w-4 h-4 mr-2" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            <AnimatePresence>
              {filteredContent.map((item, idx) => (
                <motion.div
                  key={`${item.type}-${item.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer" onClick={() => {
                    if (item.type === 'news') navigate(createPageUrl("CommunityNews"));
                    if (item.type === 'thread') navigate(createPageUrl("CommunityForums") + `?thread=${item.id}`);
                    if (item.type === 'group') navigate(createPageUrl("ForumGroups"));
                  }}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {item.type === 'news' && item.featured_image && (
                          <img src={item.featured_image} alt="" className="w-24 h-24 object-cover rounded-lg" />
                        )}
                        {item.type === 'group' && item.icon && (
                          <img src={item.icon} alt="" className="w-24 h-24 object-cover rounded-lg" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {item.type === 'news' && <Badge className="bg-blue-500/20 text-blue-400"><Newspaper className="w-3 h-3 mr-1" />News</Badge>}
                            {item.type === 'thread' && <Badge className="bg-purple-500/20 text-purple-400"><MessageSquare className="w-3 h-3 mr-1" />Forum</Badge>}
                            {item.type === 'group' && <Badge className="bg-green-500/20 text-green-400"><Users className="w-3 h-3 mr-1" />Group</Badge>}
                            {item.is_live && (
                              <Badge className="bg-red-500 text-white animate-pulse">
                                <Radio className="w-3 h-3 mr-1" />LIVE
                              </Badge>
                            )}
                            <span className="text-gray-500 text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(item.created_date).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">{item.title || item.name}</h3>
                          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                            {item.content || item.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            {item.views !== undefined && (
                              <div className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {item.views || 0}
                              </div>
                            )}
                            {item.likes && (
                              <div className="flex items-center gap-1">
                                <ThumbsUp className="w-4 h-4" />
                                {item.likes.length}
                              </div>
                            )}
                            {item.reply_count !== undefined && (
                              <div className="flex items-center gap-1">
                                <MessageSquare className="w-4 h-4" />
                                {item.reply_count}
                              </div>
                            )}
                            {item.member_count !== undefined && (
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {item.member_count}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredContent.length === 0 && (
              <div className="text-center py-20">
                <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No content yet</h3>
                <p className="text-gray-400">Start exploring the community sections below!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-6 mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                <Flame className="w-6 h-6 text-orange-400" />
                Trending Now
              </h2>
              <p className="text-gray-400">Most engaging content across all community features</p>
            </div>

            {trendingContent.map((item, idx) => (
              <Card key={`trending-${item.type}-${item.id}`} className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer" onClick={() => {
                if (item.type === 'news') navigate(createPageUrl("CommunityNews"));
                if (item.type === 'thread') navigate(createPageUrl("CommunityForums") + `?thread=${item.id}`);
                if (item.type === 'group') navigate(createPageUrl("ForumGroups"));
              }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {item.type === 'news' && <Badge className="bg-blue-500/20 text-blue-400">News</Badge>}
                        {item.type === 'thread' && <Badge className="bg-purple-500/20 text-purple-400">Forum</Badge>}
                        {item.type === 'group' && <Badge className="bg-green-500/20 text-green-400">Group</Badge>}
                      </div>
                      <h3 className="text-white font-bold">{item.title || item.name}</h3>
                      <p className="text-gray-400 text-sm">Engagement: {item.engagement} points</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Quick Access Sections */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Access</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {sections.map((section, idx) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card
                    onClick={() => navigate(createPageUrl(section.path))}
                    className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer group h-full"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center transform group-hover:scale-110 transition`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-white transition" />
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-2">
                        {section.title}
                      </h3>
                      <p className="text-gray-400 mb-4">
                        {section.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-500/20 text-purple-400 text-lg px-3 py-1">
                            {section.count}
                          </Badge>
                          <span className="text-gray-500 text-sm">{section.stats}</span>
                        </div>
                        <Button
                          variant="ghost"
                          className="text-purple-400 hover:bg-purple-500/20"
                        >
                          Explore
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
      {showCitySelector && (
        <CitySelector
          user={{ city: userCity }}
          onClose={() => setShowCitySelector(false)}
          onSaved={() => { refreshLocation(); setShowCitySelector(false); }}
        />
      )}
    </div>
  );
}