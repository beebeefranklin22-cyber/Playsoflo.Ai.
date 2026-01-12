import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Heart, MessageCircle, Share2, UserPlus, TrendingUp } from "lucide-react";

export default function SocialMetrics({ likes, comments, shares, followers, timeRange = "30d" }) {
  // Calculate totals
  const totalLikes = likes?.length || 0;
  const totalComments = comments?.length || 0;
  const totalShares = shares?.length || 0;
  const totalFollowers = followers?.length || 0;

  // Calculate growth (mock - would need historical data)
  const likesGrowth = 15.3;
  const commentsGrowth = 22.7;
  const sharesGrowth = 8.4;
  const followersGrowth = 12.1;

  // Daily engagement trend
  const dailyEngagement = {};
  
  const allInteractions = [
    ...(likes || []).map(l => ({ date: l.created_date, type: 'likes' })),
    ...(comments || []).map(c => ({ date: c.created_date, type: 'comments' })),
    ...(shares || []).map(s => ({ date: s.created_date, type: 'shares' })),
  ];

  allInteractions.forEach(interaction => {
    const date = new Date(interaction.date).toLocaleDateString();
    if (!dailyEngagement[date]) {
      dailyEngagement[date] = { date, likes: 0, comments: 0, shares: 0 };
    }
    dailyEngagement[date][interaction.type]++;
  });

  const engagementChartData = Object.values(dailyEngagement).slice(-30);

  // Engagement rate calculation
  const engagementRate = totalFollowers > 0 
    ? (((totalLikes + totalComments + totalShares) / totalFollowers) * 100).toFixed(1)
    : 0;

  // Top engaging content (mock data)
  const topEngagingContent = [
    { title: "Recent Livestream", likes: 234, comments: 45, shares: 12 },
    { title: "Behind the Scenes", likes: 189, comments: 38, shares: 8 },
    { title: "Q&A Session", likes: 167, comments: 52, shares: 15 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Heart className="w-8 h-8 text-red-400" />
              <span className="text-green-400 text-sm font-semibold">+{likesGrowth}%</span>
            </div>
            <p className="text-gray-400 text-sm">Total Likes</p>
            <p className="text-white text-3xl font-bold">{totalLikes.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageCircle className="w-8 h-8 text-blue-400" />
              <span className="text-green-400 text-sm font-semibold">+{commentsGrowth}%</span>
            </div>
            <p className="text-gray-400 text-sm">Total Comments</p>
            <p className="text-white text-3xl font-bold">{totalComments.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Share2 className="w-8 h-8 text-green-400" />
              <span className="text-green-400 text-sm font-semibold">+{sharesGrowth}%</span>
            </div>
            <p className="text-gray-400 text-sm">Total Shares</p>
            <p className="text-white text-3xl font-bold">{totalShares.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <UserPlus className="w-8 h-8 text-purple-400" />
              <span className="text-green-400 text-sm font-semibold">+{followersGrowth}%</span>
            </div>
            <p className="text-gray-400 text-sm">Followers</p>
            <p className="text-white text-3xl font-bold">{totalFollowers.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-gray-400 text-sm">Engagement Rate</p>
            <p className="text-white text-3xl font-bold">{engagementRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Engagement Trend */}
        <Card className="bg-white/5 border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Social Engagement Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="likes" stroke="#EF4444" strokeWidth={2} name="Likes" />
                <Line type="monotone" dataKey="comments" stroke="#3B82F6" strokeWidth={2} name="Comments" />
                <Line type="monotone" dataKey="shares" stroke="#10B981" strokeWidth={2} name="Shares" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Engaging Content */}
        <Card className="bg-white/5 border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Top Engaging Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topEngagingContent.map((content, index) => (
                <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="text-white font-semibold mb-3">{content.title}</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-400" />
                      <span className="text-gray-300">{content.likes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-300">{content.comments}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">{content.shares}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}