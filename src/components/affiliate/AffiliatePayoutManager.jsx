import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AffiliatePayoutManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const { data: conversions = [] } = useQuery({
    queryKey: ['ticket-conversions'],
    queryFn: async () => {
      const clicks = await base44.entities.TicketAffiliate.filter({ 
        conversion_status: 'converted'
      });
      return clicks;
    },
    enabled: !!currentUser && currentUser.role === 'admin',
    initialData: []
  });

  const pendingPayouts = conversions.filter(c => !c.payout_date);
  const paidPayouts = conversions.filter(c => c.payout_date);
  
  const totalPending = pendingPayouts.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const totalPaid = paidPayouts.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const payoutIds = pendingPayouts.map(p => p.id);
      
      // Mark as paid
      for (const id of payoutIds) {
        await base44.asServiceRole.entities.TicketAffiliate.update(id, {
          conversion_status: 'paid',
          payout_date: new Date().toISOString()
        });
      }

      // Create payout record
      await base44.entities.Payment.create({
        amount_usd: totalPending,
        method: 'stripe',
        status: 'pending',
        reference_type: 'affiliate_payout',
        memo: `Ticketmaster affiliate commissions - ${payoutIds.length} sales`
      });

      return { amount: totalPending };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['ticket-conversions']);
      toast.success(`Payout request submitted for $${data.amount.toFixed(2)}! Funds will be transferred within 3-5 business days.`);
    }
  });

  if (currentUser?.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              ${totalPending.toFixed(2)}
            </div>
            <div className="text-gray-300 text-sm">Pending Payout</div>
            <div className="text-yellow-400 text-xs mt-1">
              {pendingPayouts.length} conversions
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              ${totalPaid.toFixed(2)}
            </div>
            <div className="text-gray-300 text-sm">Total Paid Out</div>
            <div className="text-green-400 text-xs mt-1">
              {paidPayouts.length} conversions
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              ${(totalPending + totalPaid).toFixed(2)}
            </div>
            <div className="text-gray-300 text-sm">Total Earnings</div>
            <div className="text-purple-400 text-xs mt-1">
              All time
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Payout */}
      {totalPending > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Request Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-lg font-semibold mb-1">
                  ${totalPending.toFixed(2)} available
                </p>
                <p className="text-gray-400 text-sm">
                  From {pendingPayouts.length} ticket sales
                </p>
              </div>
              <Button
                onClick={() => requestPayoutMutation.mutate()}
                disabled={requestPayoutMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Request Payout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion History */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Conversion History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {conversions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No conversions yet</p>
            ) : (
              conversions.slice(0, 10).map((conv) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
                >
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-1">{conv.event_name}</h4>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(conv.conversion_date || conv.created_date).toLocaleDateString()}
                      </span>
                      <span>Ticket: ${conv.ticket_price?.toFixed(2) || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-green-400 font-bold">
                        +${(conv.commission_amount || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {conv.commission_rate}% commission
                      </div>
                    </div>
                    <Badge className={
                      conv.payout_date 
                        ? "bg-green-500/20 text-green-300" 
                        : "bg-yellow-500/20 text-yellow-300"
                    }>
                      {conv.payout_date ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}