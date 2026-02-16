import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Eye, 
  MousePointer, 
  DollarSign, 
  BarChart3,
  ExternalLink,
  Edit2,
  Pause,
  Play,
  Copy,
  Star
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AffiliateDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: myListings = [] } = useQuery({
    queryKey: ['my-affiliate-listings'],
    queryFn: () => base44.entities.AffiliateListing.filter({ 
      poster_email: currentUser?.email 
    }),
    enabled: !!currentUser
  });

  const totalViews = myListings.reduce((sum, l) => sum + (l.views || 0), 0);
  const totalClicks = myListings.reduce((sum, l) => sum + (l.clicks || 0), 0);
  const totalRevenue = myListings.reduce((sum, l) => sum + (l.revenue_generated || 0), 0);
  const totalConversions = myListings.reduce((sum, l) => sum + (l.conversions || 0), 0);
  const avgRating = myListings.length > 0 
    ? (myListings.reduce((sum, l) => sum + (l.rating || 0), 0) / myListings.length).toFixed(1)
    : 0;

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Affiliate Dashboard</h1>
            <p className="text-gray-400">Track your affiliate performance</p>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("CommunityAffiliate"))}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View All Listings
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Eye className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Views</p>
                <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <MousePointer className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Clicks</p>
                <p className="text-2xl font-bold text-white">{totalClicks.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Conversions</p>
                <p className="text-2xl font-bold text-white">{totalConversions}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Revenue</p>
                <p className="text-2xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-500/20 rounded-xl">
                <Star className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Rating</p>
                <p className="text-2xl font-bold text-white">{avgRating} ⭐</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listings Table */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Your Listings
          </h2>

          <div className="space-y-4">
            {myListings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No affiliate listings yet</p>
                <Button
                  onClick={() => navigate(createPageUrl("CommunityAffiliate"))}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Create Your First Listing
                </Button>
              </div>
            ) : (
              myListings.map((listing) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/50 transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{listing.title}</h3>
                        <Badge className={listing.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                          {listing.status}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{listing.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-300">
                          <Eye className="w-4 h-4" />
                          {listing.views || 0} views
                        </div>
                        <div className="flex items-center gap-1 text-gray-300">
                          <MousePointer className="w-4 h-4" />
                          {listing.clicks || 0} clicks
                        </div>
                        <div className="flex items-center gap-1 text-gray-300">
                          <TrendingUp className="w-4 h-4" />
                          {listing.conversions || 0} conversions
                        </div>
                        <div className="flex items-center gap-1 text-gray-300">
                          <DollarSign className="w-4 h-4" />
                          ${(listing.revenue_generated || 0).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1 text-gray-300">
                          <Star className="w-4 h-4 text-yellow-400" />
                          {listing.rating || 0} ({listing.review_count || 0} reviews)
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(listing.affiliate_url)}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        {listing.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}