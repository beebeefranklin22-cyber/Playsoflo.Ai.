import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, TrendingUp, Users, Eye, Radio, 
  Crown, Sparkles, Filter
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import UserFollowButton from "../components/UserFollowButton";

export default function CreatorDiscovery() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("trending");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allContent = [] } = useQuery({
    queryKey: ['discovery-content'],
    queryFn: () => base44.entities.StreamingContent.list(),
    initialData: []
  });

  const { data: analytics = [] } = useQuery({
    queryKey: ['discovery-analytics'],
    queryFn: () => base44.entities.ViewerAnalytics.list(),
    initialData: []
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['discovery-memberships'],
    queryFn: () => base44.entities.CreatorMembership.list(),
    initialData: []
  });

  // Group content by creator
  const creatorStats = allContent.reduce((acc, content) => {
    const creator = content.created_by;
    if (!acc[creator]) {
      acc[creator] = {
        email: creator,
        contentCount: 0,
        liveStreams: 0,
        categories: new Set(),
        totalViews: 0,
        followers: 0,
        hasMemberships: false
      };
    }
    acc[creator].contentCount++;
    if (content.is_live) acc[creator].liveStreams++;
    if (content.category) acc[creator].categories.add(content.category);
    
    // Calculate views from analytics
    const contentViews = analytics.filter(a => a.stream_id === content.id).length;
    acc[creator].totalViews += contentViews;
    
    return acc;
  }, {});

  // Add membership info
  memberships.forEach(m => {
    if (creatorStats[m.creator_email]) {
      creatorStats[m.creator_email].hasMemberships = true;
    }
  });

  const creators = Object.values(creatorStats);

  // Filtering and sorting
  const filteredCreators = creators.filter(creator => {
    const matchesSearch = !searchQuery || 
      creator.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || 
      Array.from(creator.categories).includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const sortedCreators = [...filteredCreators].sort((a, b) => {
    if (sortBy === 'trending') return b.totalViews - a.totalViews;
    if (sortBy === 'popular') return b.followers - a.followers;
    if (sortBy === 'active') return b.liveStreams - a.liveStreams;
    if (sortBy === 'new') return b.contentCount - a.contentCount;
    return 0;
  });

  const categories = [...new Set(allContent.map(c => c.category).filter(Boolean))];

  const liveCreators = sortedCreators.filter(c => c.liveStreams > 0);
  const trendingCreators = sortedCreators.slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Sparkles className="w-10 h-10 text-purple-400" />
            Discover Creators
          </h1>
          <p className="text-gray-400">Find amazing creators and content</p>
        </div>

        {/* Search and Filters */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat} className="capitalize">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="active">Most Active</SelectItem>
              <SelectItem value="new">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="all">All Creators</TabsTrigger>
            <TabsTrigger value="live">
              Live Now
              {liveCreators.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{liveCreators.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {sortedCreators.map(creator => (
                <CreatorCard key={creator.email} creator={creator} currentUser={currentUser} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="live" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {liveCreators.map(creator => (
                <CreatorCard key={creator.email} creator={creator} currentUser={currentUser} isLive />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {trendingCreators.map(creator => (
                <CreatorCard key={creator.email} creator={creator} currentUser={currentUser} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CreatorCard({ creator, currentUser, isLive }) {
  const navigate = useNavigate();

  return (
    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
            {creator.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold truncate">{creator.email}</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {Array.from(creator.categories).slice(0, 2).map(cat => (
                <Badge key={cat} className="bg-blue-500/20 text-blue-300 text-xs capitalize">
                  {cat}
                </Badge>
              ))}
              {isLive && (
                <Badge className="bg-red-500 text-white text-xs flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  LIVE
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div>
            <div className="text-white font-bold">{creator.contentCount}</div>
            <div className="text-gray-400 text-xs">Content</div>
          </div>
          <div>
            <div className="text-white font-bold">{creator.totalViews}</div>
            <div className="text-gray-400 text-xs">Views</div>
          </div>
          <div>
            <div className="text-white font-bold">{creator.followers}</div>
            <div className="text-gray-400 text-xs">Followers</div>
          </div>
        </div>

        {creator.hasMemberships && (
          <div className="mb-3 flex items-center gap-2 text-yellow-400 text-sm">
            <Crown className="w-4 h-4" />
            <span>Offers Memberships</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => navigate(createPageUrl('UserProfile') + `?user=${encodeURIComponent(creator.email)}`)}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            View Profile
          </Button>
          {currentUser && currentUser.email !== creator.email && (
            <UserFollowButton 
              targetEmail={creator.email} 
              currentUser={currentUser}
              variant="icon"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}