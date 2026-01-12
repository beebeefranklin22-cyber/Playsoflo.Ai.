import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Heart, Video, ShoppingBag, Ticket, Users } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export default function EarningsBreakdown({ currentUser, detailed = false }) {
  const { data: revenueData } = useQuery({
    queryKey: ['revenue-breakdown', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;

      const tips = await base44.entities.TipTransaction.filter({ 
        recipient_email: currentUser.email,
        status: 'completed'
      });
      
      const tickets = await base44.entities.LivestreamTicket.filter({
        creator_email: currentUser.email
      });

      const ppvPurchases = await base44.entities.PPVPurchase.filter({
        creator_email: currentUser.email
      });

      const productSales = await base44.entities.CreatorProduct.filter({
        creator_email: currentUser.email
      });

      const subscriptions = await base44.entities.UserSubscription.filter({
        creator_email: currentUser.email,
        status: 'active'
      });

      return {
        tips: tips.reduce((sum, t) => sum + (t.amount || 0), 0),
        livestream_tickets: tickets.reduce((sum, t) => sum + (t.amount_paid_usd || 0), 0),
        ppv: ppvPurchases.reduce((sum, p) => sum + (p.amount || 0), 0),
        products: productSales.reduce((sum, p) => sum + ((p.price || 0) * (p.units_sold || 0)), 0),
        subscriptions: subscriptions.reduce((sum, s) => sum + (s.amount_paid || 0), 0)
      };
    },
    enabled: !!currentUser,
    initialData: { tips: 0, livestream_tickets: 0, ppv: 0, products: 0, subscriptions: 0 }
  });

  const revenueCategories = [
    { name: "Tips", value: revenueData.tips, icon: Heart, color: "#ec4899" },
    { name: "Livestream Tickets", value: revenueData.livestream_tickets, icon: Ticket, color: "#8b5cf6" },
    { name: "PPV Content", value: revenueData.ppv, icon: Video, color: "#3b82f6" },
    { name: "Products", value: revenueData.products, icon: ShoppingBag, color: "#10b981" },
    { name: "Subscriptions", value: revenueData.subscriptions, icon: Users, color: "#f59e0b" }
  ].filter(cat => cat.value > 0);

  const totalRevenue = revenueCategories.reduce((sum, cat) => sum + cat.value, 0);

  const pieData = revenueCategories.map(cat => ({
    name: cat.name,
    value: cat.value
  }));

  const COLORS = revenueCategories.map(cat => cat.color);

  // Monthly earnings data (mock for now)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      earnings: Math.random() * 5000 + 1000
    };
  });

  return (
    <div className="space-y-6">
      {/* Revenue Categories Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {revenueCategories.map(category => (
          <Card key={category.name} className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <category.icon className="w-8 h-8" style={{ color: category.color }} />
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    ${category.value.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {totalRevenue > 0 ? ((category.value / totalRevenue) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-400">{category.name}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {detailed && (
        <>
          {/* Revenue Distribution Pie Chart */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Revenue Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    No revenue data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Earnings Trend */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Monthly Earnings Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="earnings" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}