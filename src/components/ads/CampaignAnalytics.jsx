import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye, MousePointer, DollarSign, TrendingUp, Users,
  Calendar, Target, ArrowLeft, Download
} from "lucide-react";
import { motion } from "framer-motion";

export default function CampaignAnalytics({ campaign, onBack }) {
  if (!campaign) return null;

  const ctr = campaign.impressions > 0 
    ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) 
    : 0;

  const cpm = campaign.impressions > 0 
    ? ((campaign.spend / campaign.impressions) * 1000).toFixed(2) 
    : 0;

  const cpc = campaign.clicks > 0 
    ? (campaign.spend / campaign.clicks).toFixed(2) 
    : 0;

  const conversionRate = campaign.clicks > 0 
    ? ((campaign.conversions / campaign.clicks) * 100).toFixed(2) 
    : 0;

  const budgetUsed = campaign.budget_type === 'daily'
    ? ((campaign.spend / (campaign.budget_amount * 30)) * 100).toFixed(1)
    : ((campaign.spend / campaign.budget_amount) * 100).toFixed(1);

  const estimatedReach = campaign.estimated_reach || Math.floor(campaign.impressions * 1.2);
  const remainingBudget = campaign.budget_type === 'daily'
    ? (campaign.budget_amount * 30) - campaign.spend
    : campaign.budget_amount - campaign.spend;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaigns
        </Button>
        <Button
          variant="outline"
          className="bg-white/5 border-white/20"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Campaign Header */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {campaign.media_urls?.[0] && (
              <img
                src={campaign.media_urls[0]}
                className="w-24 h-24 rounded-lg object-cover"
                alt={campaign.headline}
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">{campaign.campaign_name}</h2>
                <Badge className={
                  campaign.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }>
                  {campaign.status}
                </Badge>
              </div>
              <p className="text-gray-400">{campaign.headline}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  {campaign.objective.replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Started {new Date(campaign.created_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 text-xs">Impressions</p>
                  <p className="text-2xl font-bold text-white">{campaign.impressions.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Unique views of your ad</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                  <MousePointer className="w-5 h-5 text-pink-400" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 text-xs">Clicks</p>
                  <p className="text-2xl font-bold text-white">{campaign.clicks.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Total ad clicks</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 text-xs">CTR</p>
                  <p className="text-2xl font-bold text-green-400">{ctr}%</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Click-through rate</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 text-xs">Total Spend</p>
                  <p className="text-2xl font-bold text-white">${campaign.spend.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">of ${campaign.budget_amount} budget</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Metrics */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Cost Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-400">CPM (Cost per 1000 impressions)</span>
              <span className="text-white font-bold">${cpm}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-400">CPC (Cost per click)</span>
              <span className="text-white font-bold">${cpc}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-400">Budget Used</span>
              <span className="text-purple-400 font-bold">{budgetUsed}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-400">Remaining Budget</span>
              <span className="text-green-400 font-bold">${remainingBudget.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Engagement & Reach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-400">Conversions</span>
              <span className="text-white font-bold">{campaign.conversions || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-400">Conversion Rate</span>
              <span className="text-green-400 font-bold">{conversionRate}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-400">Estimated Reach</span>
              <span className="text-white font-bold">{estimatedReach.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-400">Frequency</span>
              <span className="text-white font-bold">
                {campaign.impressions > 0 && estimatedReach > 0
                  ? (campaign.impressions / estimatedReach).toFixed(2)
                  : '0'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Targeting Summary */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Audience Targeting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Age Range</p>
              <p className="text-white font-semibold">
                {campaign.targeting?.age_min || 18} - {campaign.targeting?.age_max || 65} years
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Gender</p>
              <p className="text-white font-semibold">
                {campaign.targeting?.genders?.join(', ') || 'All'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Locations</p>
              <p className="text-white font-semibold">
                {campaign.targeting?.locations?.slice(0, 2).join(', ') || 'All'}
                {campaign.targeting?.locations?.length > 2 && ` +${campaign.targeting.locations.length - 2} more`}
              </p>
            </div>
            {campaign.targeting?.interests?.length > 0 && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-gray-400 text-sm mb-2">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {campaign.targeting.interests.map((interest, idx) => (
                    <Badge key={idx} className="bg-purple-500/20 text-purple-300">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Optimization Insights */}
      {campaign.ai_optimized && (
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              AI Optimization Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Audience Match Score</span>
              <span className="text-green-400 font-bold">
                {campaign.ai_audience_score || 0}/100
              </span>
            </div>
            {campaign.ai_suggested_budget && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">AI Suggested Daily Budget</span>
                <span className="text-white font-bold">${campaign.ai_suggested_budget}</span>
              </div>
            )}
            <p className="text-sm text-gray-400">
              Your campaign is being automatically optimized for better performance based on real-time data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}