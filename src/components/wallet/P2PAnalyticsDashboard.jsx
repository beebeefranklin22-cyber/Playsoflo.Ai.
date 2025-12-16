import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, TrendingUp, TrendingDown, DollarSign, Activity, Clock, Target, Sparkles, BarChart3, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function P2PAnalyticsDashboard({ currentUser, onClose }) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['p2p-analytics', currentUser.email],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('calculateP2PAnalytics', {
        userEmail: currentUser.email
      });
      return data.analytics;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white">Analyzing your trading performance...</p>
        </div>
      </motion.div>
    );
  }

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-7xl bg-gray-900 rounded-3xl overflow-hidden my-8"
      >
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-8 h-8" />
                P2P Trading Analytics
              </h2>
              <p className="text-purple-100 mt-1">Performance insights and recommendations</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <Badge className="bg-purple-500/20 text-purple-300">Total</Badge>
                </div>
                <p className="text-white text-3xl font-bold">{analytics.overview.total_orders}</p>
                <p className="text-purple-300 text-sm mt-1">Total Orders</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 text-green-400" />
                  <Badge className="bg-green-500/20 text-green-300">Rate</Badge>
                </div>
                <p className="text-white text-3xl font-bold">{analytics.overview.completion_rate.toFixed(1)}%</p>
                <p className="text-green-300 text-sm mt-1">Completion Rate</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  <Badge className="bg-blue-500/20 text-blue-300">Volume</Badge>
                </div>
                <p className="text-white text-3xl font-bold">${analytics.overview.total_volume.toFixed(0)}</p>
                <p className="text-blue-300 text-sm mt-1">Total Volume</p>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${
              analytics.overview.profit_loss >= 0 
                ? 'from-green-500/20 to-emerald-600/20 border-green-500/30' 
                : 'from-red-500/20 to-red-600/20 border-red-500/30'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  {analytics.overview.profit_loss >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                  <Badge className={analytics.overview.profit_loss >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                    P/L
                  </Badge>
                </div>
                <p className={`text-3xl font-bold ${analytics.overview.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${Math.abs(analytics.overview.profit_loss).toFixed(2)}
                </p>
                <p className={`text-sm mt-1 ${analytics.overview.profit_loss >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {analytics.overview.profit_loss >= 0 ? 'Profit' : 'Loss'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Volume Trend Chart */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Trading Volume Trend (30 Days)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analytics.trends.volume_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="volume" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Market Comparison & Top Trading Pairs */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Market Comparison */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-white font-bold text-lg mb-4">Market Comparison</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Your Completion Rate</span>
                      <span className="text-white font-semibold">{analytics.market_comparison.user_completion_rate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${analytics.market_comparison.user_completion_rate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Market Average</span>
                      <span className="text-white font-semibold">{analytics.market_comparison.market_completion_rate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${analytics.market_comparison.market_completion_rate}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
                    <p className="text-blue-300 font-semibold text-sm">Performance Score</p>
                    <p className={`text-2xl font-bold mt-1 ${
                      analytics.market_comparison.performance_score === 'above_average' 
                        ? 'text-green-400' 
                        : 'text-orange-400'
                    }`}>
                      {analytics.market_comparison.performance_score === 'above_average' ? '✓ Above Average' : '⚠ Below Average'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Trading Pairs */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-white font-bold text-lg mb-4">Top Trading Pairs</h3>
                <div className="space-y-3">
                  {analytics.trading_pairs.map((pair, index) => (
                    <div key={pair.pair} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white`}
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{pair.pair}</p>
                          <p className="text-gray-400 text-xs">{pair.orders} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">${pair.volume.toFixed(0)}</p>
                        <p className="text-gray-400 text-xs">volume</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Best Trading Hours */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Best Trading Hours
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {analytics.time_analysis.best_hours.map((hourData, index) => (
                  <div key={hourData.hour} className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        #{index + 1}
                      </div>
                      <Clock className="w-4 h-4 text-orange-400" />
                    </div>
                    <p className="text-white text-2xl font-bold">{hourData.hour}:00</p>
                    <p className="text-orange-300 text-sm">{hourData.orders} orders</p>
                    <p className="text-orange-200 text-xs">${hourData.volume.toFixed(0)} volume</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardContent className="p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                AI-Powered Recommendations
              </h3>

              <div className="bg-purple-500/10 rounded-lg p-4 mb-4">
                <p className="text-purple-200 text-sm leading-relaxed">
                  {analytics.recommendations.overall_assessment}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-green-400 font-semibold text-sm mb-2">✓ Strengths</p>
                  <ul className="space-y-1">
                    {analytics.recommendations.strength_areas.map((strength, i) => (
                      <li key={i} className="text-green-200 text-sm">• {strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-orange-400 font-semibold text-sm mb-2">⚡ Areas to Improve</p>
                  <ul className="space-y-1">
                    {analytics.recommendations.improvement_areas.map((area, i) => (
                      <li key={i} className="text-orange-200 text-sm">• {area}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                {analytics.recommendations.recommendations.map((rec, index) => (
                  <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-semibold">{rec.title}</h4>
                      <Badge className={
                        rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-gray-300 text-sm">{rec.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}