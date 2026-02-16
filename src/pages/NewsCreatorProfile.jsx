import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Eye, ThumbsUp, ChevronLeft, Calendar, Radio, MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";
import FollowButton from "@/components/social/FollowButton";

export default function NewsCreatorProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const creatorEmail = searchParams.get("email");
  const [currentUser, setCurrentUser] = useState(null);
  const [creator, setCreator] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchCreator = async () => {
      if (creatorEmail) {
        const users = await base44.entities.User.list();
        const found = users.find(u => u.email === creatorEmail);
        setCreator(found);
      }
    };
    fetchCreator();
  }, [creatorEmail]);

  const { data: creatorPosts = [] } = useQuery({
    queryKey: ['creator-news-posts', creatorEmail],
    queryFn: async () => {
      if (!creatorEmail) return [];
      return await base44.entities.NewsPost.filter({ 
        author_email: creatorEmail,
        status: 'published'
      }, '-created_date');
    },
    enabled: !!creatorEmail,
    initialData: []
  });

  const stats = {
    totalPosts: creatorPosts.length,
    totalViews: creatorPosts.reduce((sum, p) => sum + (p.views || 0), 0),
    totalLikes: creatorPosts.reduce((sum, p) => sum + (p.likes?.length || 0), 0),
    liveNow: creatorPosts.filter(p => p.is_live).length
  };

  if (!creator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 flex items-center justify-center">
        <p className="text-white">Loading creator profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 pb-20">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <button onClick={() => navigate(-1)} className="mb-6 p-2 hover:bg-white/10 rounded-full transition">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* Creator Header */}
        <Card className="bg-white/5 border-white/10 mb-8">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <img
                src={creator.profile_picture || "https://via.placeholder.com/120"}
                alt={creator.full_name}
                className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{creator.full_name}</h1>
                    <p className="text-gray-400">News Creator</p>
                  </div>
                  {currentUser && currentUser.email !== creator.email && (
                    <FollowButton targetUserEmail={creator.email} />
                  )}
                  {currentUser?.email === creator.email && (
                    <Button onClick={() => navigate(createPageUrl("NewsCreatorDashboard"))} className="bg-blue-600">
                      Go to Dashboard
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-6 mt-6">
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalPosts}</p>
                    <p className="text-gray-400 text-sm">Posts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalViews}</p>
                    <p className="text-gray-400 text-sm">Views</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalLikes}</p>
                    <p className="text-gray-400 text-sm">Likes</p>
                  </div>
                  {stats.liveNow > 0 && (
                    <div>
                      <Badge className="bg-red-500 text-white animate-pulse">
                        <Radio className="w-3 h-3 mr-1" />
                        LIVE NOW
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts */}
        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList className="bg-white/5">
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="popular">Most Popular</TabsTrigger>
            <TabsTrigger value="live">Live Streams</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-4">
            {creatorPosts.map((post) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer"
                  onClick={() => navigate(createPageUrl("CommunityNews"))}
                >
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      {post.featured_image && (
                        <img src={post.featured_image} alt={post.title} className="w-48 h-32 object-cover rounded-lg" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{post.title}</h3>
                          {post.is_live && (
                            <Badge className="bg-red-500 text-white animate-pulse">
                              <Radio className="w-3 h-3 mr-1" />
                              LIVE
                            </Badge>
                          )}
                          <Badge className="bg-blue-500/20 text-blue-400">{post.category}</Badge>
                        </div>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-6 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {post.views || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            {post.likes?.length || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(post.created_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="popular">
            {[...creatorPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).map((post) => (
              <Card key={post.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {post.views || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {post.likes?.length || 0}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="live">
            {creatorPosts.filter(p => p.is_live).map((post) => (
              <Card key={post.id} className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                      <p className="text-gray-400 text-sm">Live viewers: {post.live_viewers || 0}</p>
                    </div>
                    <Button className="bg-red-600" onClick={() => navigate(createPageUrl("CommunityNews"))}>
                      <Radio className="w-4 h-4 mr-2" />
                      Watch Live
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}