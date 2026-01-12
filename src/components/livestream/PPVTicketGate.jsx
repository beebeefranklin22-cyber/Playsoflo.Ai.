import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Star, Zap, Check, DollarSign, Coins } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function PPVTicketGate({ stream, currentUser, children }) {
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState(null);

  // Check if user already has access
  const { data: myTicket } = useQuery({
    queryKey: ['my-ticket', stream.id, currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      const tickets = await base44.entities.LivestreamTicket.filter({
        stream_id: stream.id,
        user_email: currentUser.email
      });
      return tickets[0];
    },
    enabled: !!currentUser && !!stream
  });

  // Get pricing tiers for this stream
  const { data: tiers = [] } = useQuery({
    queryKey: ['stream-tiers', stream.id],
    queryFn: async () => {
      return await base44.entities.LivestreamPricingTier.filter({
        stream_id: stream.id
      });
    },
    enabled: !!stream
  });

  const purchaseMutation = useMutation({
    mutationFn: async (tier) => {
      // Create ticket
      const ticket = await base44.entities.LivestreamTicket.create({
        stream_id: stream.id,
        tier_id: tier.id,
        user_email: currentUser.email,
        creator_email: stream.created_by,
        tier_name: tier.tier_name,
        amount_paid_usd: tier.price_usd,
        amount_paid_soflo: tier.price_soflo || 0,
        perks: tier.perks,
        chat_priority: tier.chat_priority,
        exclusive_badge: tier.exclusive_badge,
        badge_color: tier.badge_color,
        payment_method: "wallet",
        payment_status: "completed"
      });

      // Update tier purchase count
      await base44.asServiceRole.entities.LivestreamPricingTier.update(tier.id, {
        current_purchases: (tier.current_purchases || 0) + 1
      });

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-ticket'] });
      toast.success('🎉 Access granted! Enjoy the stream!');
    },
    onError: (error) => {
      toast.error('Purchase failed: ' + error.message);
    }
  });

  // If user has ticket, show content
  if (myTicket) {
    return children;
  }

  // If no tiers, stream is free
  if (tiers.length === 0) {
    return children;
  }

  // Show ticket purchase gate
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-8">
          <Lock className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">{stream.title}</h1>
          <p className="text-gray-400 text-lg">Select your access tier to watch this exclusive livestream</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.sort((a, b) => a.price_usd - b.price_usd).map((tier, index) => {
            const isPopular = index === Math.floor(tiers.length / 2);
            const isSoldOut = tier.max_purchases && tier.current_purchases >= tier.max_purchases;
            
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`relative overflow-hidden ${
                    isPopular 
                      ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500 ring-2 ring-purple-500' 
                      : 'bg-white/5 border-white/10'
                  } ${selectedTier?.id === tier.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      POPULAR
                    </div>
                  )}
                  
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        {index === 0 ? <Star className="w-8 h-8 text-white" /> :
                         index === 1 ? <Crown className="w-8 h-8 text-white" /> :
                         <Zap className="w-8 h-8 text-white" />}
                      </div>
                      <h3 className="text-white font-bold text-2xl mb-2">{tier.tier_name}</h3>
                      <div className="text-4xl font-bold text-white mb-1">
                        ${tier.price_usd}
                      </div>
                      {tier.price_soflo > 0 && (
                        <div className="flex items-center justify-center gap-1 text-purple-400 text-sm">
                          <Coins className="w-4 h-4" />
                          {tier.price_soflo} SoFloCoin
                        </div>
                      )}
                    </div>

                    {/* Perks */}
                    <div className="space-y-2 mb-6">
                      {tier.perks?.map((perk, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                          {perk}
                        </div>
                      ))}
                      {tier.chat_priority && (
                        <div className="flex items-center gap-2 text-yellow-300 text-sm font-medium">
                          <Star className="w-4 h-4 flex-shrink-0" />
                          Priority Chat Access
                        </div>
                      )}
                      {tier.exclusive_badge && (
                        <div className="flex items-center gap-2 text-purple-300 text-sm font-medium">
                          <Badge 
                            className="text-xs"
                            style={{ backgroundColor: tier.badge_color + '40', color: tier.badge_color }}
                          >
                            {tier.exclusive_badge}
                          </Badge>
                          Exclusive Badge
                        </div>
                      )}
                      {tier.early_access_minutes > 0 && (
                        <div className="flex items-center gap-2 text-blue-300 text-sm font-medium">
                          <Zap className="w-4 h-4 flex-shrink-0" />
                          {tier.early_access_minutes} min early access
                        </div>
                      )}
                    </div>

                    {/* Availability */}
                    {tier.max_purchases && (
                      <div className="mb-4 text-center">
                        <div className="text-gray-400 text-xs mb-1">
                          {tier.current_purchases}/{tier.max_purchases} sold
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full transition-all"
                            style={{ width: `${(tier.current_purchases / tier.max_purchases) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        if (isSoldOut) return;
                        setSelectedTier(tier);
                        purchaseMutation.mutate(tier);
                      }}
                      disabled={isSoldOut || purchaseMutation.isPending}
                      className={`w-full ${
                        isPopular 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      {isSoldOut ? 'Sold Out' :
                       purchaseMutation.isPending && selectedTier?.id === tier.id ? 'Processing...' :
                       'Purchase Access'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Secure payment • Instant access • Full refund if stream cancelled
          </p>
        </div>
      </div>
    </div>
  );
}