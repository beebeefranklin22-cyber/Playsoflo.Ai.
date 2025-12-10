import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, CreditCard, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function PPVAccessGate({ ppvContentId, currentUser, children }) {
  const queryClient = useQueryClient();

  // Check if user has purchased access
  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ['ppv-access', ppvContentId, currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return false;
      const purchases = await base44.entities.PPVPurchase.filter({
        user_email: currentUser.email,
        ppv_content_id: ppvContentId
      });

      if (purchases.length === 0) return false;

      const purchase = purchases[0];
      const expiresAt = new Date(purchase.access_expires_at);
      return expiresAt > new Date();
    },
    enabled: !!currentUser && !!ppvContentId
  });

  // Get PPV content details
  const { data: ppvContent } = useQuery({
    queryKey: ['ppv-content-detail', ppvContentId],
    queryFn: async () => {
      const content = await base44.entities.PPVContent.filter({ id: ppvContentId });
      return content[0];
    },
    enabled: !!ppvContentId
  });

  // Check membership for discount
  const { data: membership } = useQuery({
    queryKey: ['user-membership', currentUser?.email, ppvContent?.creator_email],
    queryFn: async () => {
      if (!currentUser || !ppvContent) return null;
      const subs = await base44.entities.MembershipSubscription.filter({
        user_email: currentUser.email,
        creator_email: ppvContent.creator_email,
        status: 'active'
      });
      if (subs.length === 0) return null;

      const membershipId = subs[0].membership_id;
      const memberships = await base44.entities.CreatorMembership.filter({ id: membershipId });
      return memberships[0];
    },
    enabled: !!currentUser && !!ppvContent
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ppvContent.access_duration_hours);

      const purchase = await base44.entities.PPVPurchase.create({
        user_email: currentUser.email,
        ppv_content_id: ppvContentId,
        creator_email: ppvContent.creator_email,
        amount_paid_usd: finalPrice,
        amount_paid_rri: 0,
        access_expires_at: expiresAt.toISOString(),
        payment_method: 'card'
      });

      // Update PPV content stats
      await base44.asServiceRole.entities.PPVContent.update(ppvContentId, {
        total_purchases: (ppvContent.total_purchases || 0) + 1,
        revenue_generated: (ppvContent.revenue_generated || 0) + finalPrice
      });

      // Process collaborative revenue distribution
      await base44.functions.invoke('processCollaborativeRevenue', {
        purchaseId: purchase.id,
        contentId: ppvContentId,
        totalAmount: finalPrice
      });

      return purchase;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['ppv-access'] });
      toast.success('Access granted! Enjoy the content.');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (hasAccess) {
    return children;
  }

  if (!ppvContent) return null;

  const discount = membership?.perks?.ppv_discount_percent || 0;
  const finalPrice = ppvContent.price_usd * (1 - discount / 100);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-purple-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{ppvContent.title}</h2>
          <p className="text-gray-300 mb-6">{ppvContent.description}</p>

          <div className="bg-black/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <span className="text-gray-300 text-sm">
                {ppvContent.access_duration_hours} hours of access
              </span>
            </div>

            {discount > 0 && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 text-sm font-semibold">
                  {discount}% member discount applied!
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-3">
              {discount > 0 && (
                <span className="text-gray-400 line-through text-xl">
                  ${ppvContent.price_usd.toFixed(2)}
                </span>
              )}
              <span className="text-4xl font-bold text-white">
                ${finalPrice.toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            onClick={() => purchaseMutation.mutate()}
            disabled={purchaseMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Purchase Access
          </Button>

          <p className="text-gray-400 text-xs mt-4">
            Secure payment • Instant access • {ppvContent.access_duration_hours}h duration
          </p>
        </CardContent>
      </Card>
    </div>
  );
}