import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { purchaseWithWallet } from "@/functions/purchaseWithWallet";

// The fan-facing counterpart to MembershipManager.jsx (which only lets a
// creator CONFIGURE tiers). There was previously no code path anywhere that
// let a fan actually subscribe and pay for one -- tiers existed, stat
// displays existed, but nothing sold them. This is a single-period charge
// (30 days), not a real recurring subscription -- there's no auto-renewal
// billing here, so a member needs to return and renew when their period
// ends.
export default function MembershipJoinPanel({ creator, currentUser }) {
  const queryClient = useQueryClient();

  const { data: tiers = [] } = useQuery({
    queryKey: ['creator-memberships-public', creator?.email],
    queryFn: () => base44.entities.CreatorMembership.filter({ creator_email: creator.email, is_active: true }),
    enabled: !!creator?.email
  });

  const { data: activeSubscription } = useQuery({
    queryKey: ['my-membership', currentUser?.email, creator?.email],
    queryFn: async () => {
      const subs = await base44.entities.MembershipSubscription.filter({
        user_email: currentUser.email,
        creator_email: creator.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!currentUser?.email && !!creator?.email
  });

  const joinMutation = useMutation({
    mutationFn: async (tier) => {
      if (!confirm(`Join ${tier.tier_name} for $${tier.monthly_price_usd}/month? This charges your PlaySoFlo wallet balance now for a 30-day period.`)) {
        throw new Error('cancelled');
      }

      // Charge the wallet FIRST and check the result.
      const { data } = await purchaseWithWallet({
        amount: tier.monthly_price_usd,
        reference_type: 'creator_membership',
        reference_id: tier.id,
        memo: `${creator.email}: ${tier.tier_name} membership`,
      });
      if (!data.success) throw new Error(data.error || 'Purchase failed');

      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await base44.entities.MembershipSubscription.create({
        user_email: currentUser.email,
        creator_email: creator.email,
        membership_id: tier.id,
        tier_name: tier.tier_name,
        status: 'active',
        start_date: new Date().toISOString(),
        current_period_end: endDate,
        price_paid: tier.monthly_price_usd,
      });

      await base44.entities.CreatorMembership.update(tier.id, {
        member_count: (tier.member_count || 0) + 1,
        monthly_revenue: (tier.monthly_revenue || 0) + tier.monthly_price_usd,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-membership'] });
      toast.success('Membership activated! 👑');
    },
    onError: (error) => {
      if (error.message === 'cancelled') return;
      toast.error(error.message || 'Failed to join membership');
    }
  });

  if (tiers.length === 0) {
    return (
      <div className="text-center py-16">
        <Crown className="w-12 h-12 text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500">This creator hasn't set up any membership tiers yet</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4 p-4">
      {tiers.map(tier => {
        const isActive = activeSubscription?.membership_id === tier.id;
        return (
          <div key={tier.id} className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                {tier.tier_name}
              </h3>
              <div className="text-2xl font-bold text-white">
                ${tier.monthly_price_usd}<span className="text-sm text-gray-400">/mo</span>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-4">{tier.description}</p>
            <div className="space-y-2 mb-4">
              {tier.benefits?.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>
            <Button
              onClick={() => joinMutation.mutate(tier)}
              disabled={isActive || !!activeSubscription || joinMutation.isPending || !currentUser}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
            >
              {isActive ? 'Active Member' : activeSubscription ? 'Already a Member' : !currentUser ? 'Sign in to Join' : 'Join'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
