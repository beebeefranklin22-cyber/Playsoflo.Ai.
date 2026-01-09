import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Ticket, TrendingUp, MousePointer } from "lucide-react";

export default function TicketAffiliateStats({ currentUser }) {
  const { data: clicks = [] } = useQuery({
    queryKey: ['ticket-affiliate-clicks'],
    queryFn: () => base44.entities.TicketAffiliate.list('-created_date'),
    enabled: !!currentUser,
    initialData: []
  });

  const totalClicks = clicks.length;
  const totalConversions = clicks.filter(c => c.conversion_status === 'converted').length;
  const totalEarnings = clicks.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const pendingEarnings = clicks
    .filter(c => c.conversion_status === 'converted' && !c.payout_date)
    .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0;

  return (
    <div className="grid md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <MousePointer className="w-8 h-8 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {totalClicks.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm">Total Clicks</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Ticket className="w-8 h-8 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {totalConversions}
          </div>
          <div className="text-gray-400 text-sm">Conversions</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {conversionRate}%
          </div>
          <div className="text-gray-400 text-sm">Conversion Rate</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${totalEarnings.toFixed(2)}
          </div>
          <div className="text-gray-400 text-sm">Total Earnings</div>
          {pendingEarnings > 0 && (
            <div className="text-yellow-400 text-xs mt-1">
              ${pendingEarnings.toFixed(2)} pending
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}