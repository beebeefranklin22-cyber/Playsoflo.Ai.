import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Calendar, TrendingUp } from "lucide-react";
import ViewerEngagementChart from "./ViewerEngagementChart";
import RevenueAnalytics from "./RevenueAnalytics";
import AudienceDemographics from "./AudienceDemographics";
import SocialMetrics from "./SocialMetrics";

export default function ComprehensiveAnalyticsDashboard({ currentUser }) {
  const [timeRange, setTimeRange] = useState("30d");

  // Fetch all analytics data
  const { data: contentAnalytics = [] } = useQuery({
    queryKey: ['content-analytics', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.ContentAnalytics.filter({
        creator_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: viewerAnalytics = [] } = useQuery({
    queryKey: ['viewer-analytics', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.ViewerAnalytics.filter({
        content_id: { $exists: true }
      });
    },
    enabled: !!currentUser
  });

  const { data: tips = [] } = useQuery({
    queryKey: ['creator-tips', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.TipTransaction.filter({
        creator_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: ppvPurchases = [] } = useQuery({
    queryKey: ['ppv-purchases', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.PPVPurchase.filter({
        creator_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['stream-tickets', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.LivestreamTicket.filter({
        creator_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.UserSubscription.filter({
        creator_email: currentUser.email,
        status: 'active'
      });
    },
    enabled: !!currentUser
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.Follow.filter({
        following_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: userInterests = [] } = useQuery({
    queryKey: ['user-interests'],
    queryFn: async () => {
      return await base44.entities.UserInterests.list();
    }
  });

  // Mock social data (would come from actual entities)
  const mockLikes = Array.from({ length: 150 }, (_, i) => ({
    id: i,
    created_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  }));

  const mockComments = Array.from({ length: 45 }, (_, i) => ({
    id: i,
    created_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  }));

  const mockShares = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    created_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-gray-400 mt-1">Comprehensive insights into your creator performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-white text-3xl font-bold">
                  ${(
                    tips.reduce((sum, t) => sum + (t.amount_usd || 0), 0) +
                    ppvPurchases.reduce((sum, p) => sum + (p.amount_paid_usd || 0), 0) +
                    tickets.reduce((sum, t) => sum + (t.amount_paid_usd || 0), 0)
                  ).toFixed(0)}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm">Total Views</p>
            <p className="text-white text-3xl font-bold">{contentAnalytics.length.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm">Total Followers</p>
            <p className="text-white text-3xl font-bold">{followers.length.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm">Avg. Engagement</p>
            <p className="text-white text-3xl font-bold">
              {contentAnalytics.length > 0 
                ? (contentAnalytics.reduce((sum, a) => sum + (a.completion_rate || 0), 0) / contentAnalytics.length).toFixed(0)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="engagement" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1">
          <TabsTrigger value="engagement" className="data-[state=active]:bg-purple-600">
            Viewer Engagement
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-purple-600">
            Revenue Performance
          </TabsTrigger>
          <TabsTrigger value="audience" className="data-[state=active]:bg-purple-600">
            Audience Demographics
          </TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-purple-600">
            Social Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="mt-6">
          <ViewerEngagementChart analytics={contentAnalytics} timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <RevenueAnalytics 
            tips={tips}
            ppvPurchases={ppvPurchases}
            tickets={tickets}
            subscriptions={subscriptions}
            timeRange={timeRange}
          />
        </TabsContent>

        <TabsContent value="audience" className="mt-6">
          <AudienceDemographics 
            analytics={contentAnalytics}
            followers={followers}
            userInterests={userInterests}
          />
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <SocialMetrics 
            likes={mockLikes}
            comments={mockComments}
            shares={mockShares}
            followers={followers}
            timeRange={timeRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}