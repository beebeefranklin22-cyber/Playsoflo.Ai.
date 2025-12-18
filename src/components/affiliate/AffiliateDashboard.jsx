import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, DollarSign, MousePointer, ShoppingCart, 
  Users, Award, Target, Zap, Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];

export default function AffiliateDashboard({ referrals, currentUser }) {
  // Calculate metrics
  const totalClicks = referrals.reduce((sum, r) => sum + (r.click_count || 0), 0);
  const totalConversions = referrals.filter(r => r.status !== 'pending').length;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0;
  
  const totalRevenue = referrals.reduce((sum, r) => sum + (r.order_value || 0), 0);
  const totalCommission = referrals.reduce((sum, r) => sum + (r.commission_amount || 0), 0);
  const avgOrderValue = totalConversions > 0 ? (totalRevenue / totalConversions).toFixed(2) : 0;
  
  const subAffiliates = referrals.filter(r => r.is_sub_affiliate);
  const recruitmentBonus = referrals.reduce((sum, r) => sum + (r.recruitment_bonus || 0), 0);
  
  // Get current tier
  const getTier = () => {
    if (totalCommission >= 10000) return { name: 'Diamond', rate: 10, icon: '💎', color: 'cyan' };
    if (totalCommission >= 5000) return { name: 'Platinum', rate: 8, icon: '🏆', color: 'purple' };
    if (totalCommission >= 1000) return { name: 'Gold', rate: 7, icon: '👑', color: 'yellow' };
    if (totalCommission >= 100) return { name: 'Silver', rate: 6, icon: '⭐', color: 'gray' };
    return { name: 'Bronze', rate: 5, icon: '🥉', color: 'orange' };
  };
  
  const currentTier = getTier();
  
  // Earnings by product
  const productEarnings = referrals.reduce((acc, r) => {
    if (!r.product_name) return acc;
    const existing = acc.find(p => p.name === r.product_name);
    if (existing) {
      existing.earnings += r.commission_amount || 0;
      existing.conversions += 1;
    } else {
      acc.push({
        name: r.product_name,
        earnings: r.commission_amount || 0,
        conversions: 1
      });
    }
    return acc;
  }, []).sort((a, b) => b.earnings - a.earnings).slice(0, 5);
  
  // Daily earnings last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });
  
  const dailyEarnings = last7Days.map(date => {
    const dayReferrals = referrals.filter(r => 
      r.conversion_date && r.conversion_date.split('T')[0] === date
    );
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      earnings: dayReferrals.reduce((sum, r) => sum + (r.commission_amount || 0), 0),
      conversions: dayReferrals.length
    };
  });
  
  return (
    <div className="space-y-6">
      {/* Current Tier */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <Card className={`bg-gradient-to-br from-${currentTier.color}-500/20 to-${currentTier.color}-600/10 border-${currentTier.color}-500/30`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{currentTier.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{currentTier.name} Tier</h3>
                    <p className="text-gray-300">Commission Rate: {currentTier.rate}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div>
                    <p className="text-3xl font-bold text-white">${totalCommission.toFixed(2)}</p>
                    <p className="text-gray-400 text-sm">Lifetime Earnings</p>
                  </div>
                  {currentTier.name !== 'Diamond' && (
                    <div className="ml-6">
                      <p className="text-gray-300 text-sm">Next Tier:</p>
                      <p className="text-white font-semibold">
                        ${(currentTier.name === 'Bronze' ? 100 : 
                           currentTier.name === 'Silver' ? 1000 : 
                           currentTier.name === 'Gold' ? 5000 : 10000) - totalCommission} more
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Award className={`w-16 h-16 text-${currentTier.color}-400`} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <MousePointer className="w-5 h-5 text-blue-400" />
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{totalClicks}</p>
            <p className="text-gray-400 text-sm">Total Clicks</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-5 h-5 text-green-400" />
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{totalConversions}</p>
            <p className="text-gray-400 text-sm">Conversions</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-yellow-400" />
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">{conversionRate}%</p>
            <p className="text-gray-400 text-sm">Conversion Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">${avgOrderValue}</p>
            <p className="text-gray-400 text-sm">Avg Order Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Affiliates Stats */}
      {subAffiliates.length > 0 && (
        <Card className="bg-gradient-to-br from-pink-500/10 to-purple-600/5 border-pink-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Users className="w-6 h-6 text-pink-400" />
                  Recruited Affiliates Program
                </h3>
                <p className="text-gray-300 mb-4">Earn 2% bonus on your recruits' earnings!</p>
                <div className="flex gap-6">
                  <div>
                    <p className="text-3xl font-bold text-white">{subAffiliates.length}</p>
                    <p className="text-gray-400 text-sm">Active Recruits</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-pink-400">+${recruitmentBonus.toFixed(2)}</p>
                    <p className="text-gray-400 text-sm">Recruitment Bonus</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Earnings Over Time */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Last 7 Days Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyEarnings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="earnings" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Top 5 Products by Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            {productEarnings.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={productEarnings}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `$${entry.earnings.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="earnings"
                  >
                    {productEarnings.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center">
                <p className="text-gray-400">No product data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Performance Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Product Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          {productEarnings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-gray-400 py-3 px-4">Product</th>
                    <th className="text-right text-gray-400 py-3 px-4">Conversions</th>
                    <th className="text-right text-gray-400 py-3 px-4">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {productEarnings.map((product, idx) => (
                    <tr key={idx} className="border-b border-white/5">
                      <td className="py-3 px-4 text-white">{product.name}</td>
                      <td className="py-3 px-4 text-right text-gray-300">{product.conversions}</td>
                      <td className="py-3 px-4 text-right text-green-400 font-bold">
                        ${product.earnings.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No product conversions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}