import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Star, Zap, Check, X, Loader2, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function SubscribeButton({ creatorEmail, creatorName, currentUser, compact = false }) {
  const queryClient = useQueryClient();
  const [showTierModal, setShowTierModal] = useState(false);

  const { data: tiers = [] } = useQuery({
    queryKey: ['creator-tiers', creatorEmail],
    queryFn: () => base44.entities.SubscriptionTier.filter({ creator_email: creatorEmail }),
    enabled: !!creatorEmail,
    initialData: []
  });

  const { data: mySubscription } = useQuery({
    queryKey: ['my-subscription', creatorEmail, currentUser?.email],
    queryFn: async () => {
      const subs = await base44.entities.CreatorSubscription.filter({
        creator_email: creatorEmail,
        subscriber_email: currentUser.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!currentUser && !!creatorEmail,
    initialData: null
  });

  const subscribeMutation = useMutation({
    mutationFn: async (tier) => {
      const sub = await base44.entities.CreatorSubscription.create({
        creator_email: creatorEmail,
        subscriber_email: currentUser.email,
        subscriber_name: currentUser.full_name,
        tier_id: tier.id,
        tier_name: tier.tier_name,
        monthly_amount_usd: tier.monthly_price,
        status: 'active',
        started_at: new Date().toISOString()
      });
      // Notify creator
      await base44.entities.Notification.create({
        recipient_email: creatorEmail,
        type: 'payment_received',
        title: `${currentUser.full_name || 'Someone'} subscribed to ${tier.tier_name}!`,
        message: `New subscriber at $${tier.monthly_price}/mo`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_photo: currentUser.profile_picture,
        read: false
      }).catch(() => {});
      return sub;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription', creatorEmail] });
      queryClient.invalidateQueries({ queryKey: ['tier-subscribers'] });
      toast.success('Subscribed successfully!');
      setShowTierModal(false);
    },
    onError: (e) => toast.error('Subscription failed: ' + e.message)
  });

  const cancelMutation = useMutation({
    mutationFn: () => base44.entities.CreatorSubscription.update(mySubscription.id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription', creatorEmail] });
      toast.success('Subscription cancelled');
    }
  });

  const tierIcons = { 1: Star, 2: Zap, 3: Crown };
  const tierColors = {
    1: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    2: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    3: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
  };

  // Don't show for self
  if (!currentUser || currentUser.email === creatorEmail) return null;

  if (mySubscription) {
    return (
      <Button
        onClick={() => { if (confirm('Cancel subscription?')) cancelMutation.mutate(); }}
        disabled={cancelMutation.isPending}
        variant="outline"
        size={compact ? "sm" : "default"}
        className="bg-green-500/10 border-green-500/30 text-green-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 transition-all"
      >
        <Check className="w-4 h-4 mr-1" />
        {compact ? 'Subscribed' : `Subscribed · ${mySubscription.tier_name}`}
      </Button>
    );
  }

  if (tiers.length === 0) return null;

  return (
    <>
      <Button
        onClick={() => setShowTierModal(true)}
        size={compact ? "sm" : "default"}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold"
      >
        <Crown className="w-4 h-4 mr-1" />
        {compact ? 'Subscribe' : 'Subscribe'}
      </Button>

      <AnimatePresence>
        {showTierModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowTierModal(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gray-900 rounded-3xl p-6 border border-white/10 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Subscribe to {creatorName}</h2>
                  <p className="text-gray-400 text-sm mt-1">Choose a subscription tier</p>
                </div>
                <button onClick={() => setShowTierModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-3">
                {tiers.sort((a, b) => (a.tier_level || 1) - (b.tier_level || 1)).map(tier => {
                  const Icon = tierIcons[tier.tier_level || 1] || Star;
                  const colorClass = tierColors[tier.tier_level || 1];
                  return (
                    <div
                      key={tier.id}
                      className={`p-4 rounded-2xl border-2 bg-gradient-to-br ${colorClass} hover:scale-[1.01] transition cursor-pointer`}
                      onClick={() => subscribeMutation.mutate(tier)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-bold">{tier.tier_name}</h3>
                            <p className="text-gray-400 text-xs">{tier.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-xl">${tier.monthly_price}</p>
                          <p className="text-gray-400 text-xs">/month</p>
                        </div>
                      </div>
                      {tier.benefits?.length > 0 && (
                        <ul className="space-y-1 mb-3">
                          {tier.benefits.map((b, i) => (
                            <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                              <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        disabled={subscribeMutation.isPending}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold"
                        onClick={(e) => { e.stopPropagation(); subscribeMutation.mutate(tier); }}
                      >
                        {subscribeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <DollarSign className="w-4 h-4 mr-2" />
                        )}
                        Subscribe for ${tier.monthly_price}/mo
                      </Button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}