import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { List, Calendar, MessageSquare, DollarSign, Shield, ChevronRight, ExternalLink, Plus, CreditCard, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// This used to be a near-full copy of ProviderHub.jsx's 11-tab dashboard,
// re-implemented here (744 lines) with its own drifted copy of every
// mutation and form. That duplication had rotted: its "my services" query
// used MarketplaceItem.list() with no provider_email filter at all, so it
// showed (and let you click "Manage" on) every provider's listings on the
// platform, not just your own -- and its Stripe onboarding return/refresh
// URLs pointed at the ProviderHub page, not back here, so completing
// Stripe setup from this tab bounced you out of Profile entirely.
//
// Rather than maintain two copies of the same hub that inevitably drift,
// this is now a lean, correctly-scoped snapshot + quick links into the
// one real Provider Hub -- the same pattern BusinessHubDriverSection uses
// for the Driver section of this same page.
export default function BusinessHubProviderSection({ currentUser }) {
  const navigate = useNavigate();

  const { data: myServices = [] } = useQuery({
    queryKey: ["my-services", currentUser?.email],
    queryFn: () => base44.entities.MarketplaceItem.filter({ provider_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  const { data: unreadBookingRequests = 0 } = useQuery({
    queryKey: ['provider-unread-bookings', currentUser?.email],
    queryFn: async () => {
      const notifs = await base44.entities.Notification.filter({ recipient_email: currentUser.email, type: 'booking_request', read: false });
      return notifs.length;
    },
    enabled: !!currentUser,
  });

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['provider-unread-messages', currentUser?.email],
    queryFn: async () => {
      const msgs = await base44.entities.DirectMessage.filter({ recipient_email: currentUser.email, read: false });
      return msgs.length;
    },
    enabled: !!currentUser,
  });

  if (myServices.length === 0) {
    return (
      <div className="text-center py-10 bg-white/5 border border-white/10 rounded-2xl">
        <List className="w-14 h-14 text-green-400 mx-auto mb-3" />
        <p className="text-white font-semibold text-lg mb-1">List a Service</p>
        <p className="text-gray-400 text-sm mb-6">Offer services, rentals, or products in the marketplace</p>
        <Button onClick={() => navigate(createPageUrl("ProviderListings"))} className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700">
          <Plus className="w-4 h-4 mr-2" />Create Your First Listing
        </Button>
      </div>
    );
  }

  const trustLevel = currentUser?.provider_verification_level && currentUser.provider_verification_level !== 'none'
    ? currentUser.provider_verification_level : null;

  const quickLinks = [
    { label: "Manage Listings", icon: List, action: () => navigate(createPageUrl("ProviderListings")) },
    { label: "Booking Requests", icon: Calendar, action: () => navigate(createPageUrl("ProviderHub") + "?tab=requests"), badge: unreadBookingRequests },
    { label: "Messages", icon: MessageSquare, action: () => navigate(createPageUrl("ProviderHub") + "?tab=messages"), badge: unreadMessages },
    { label: "Earnings & Payouts", icon: DollarSign, action: () => navigate(createPageUrl("ProviderHub") + "?tab=earnings") },
    { label: "Verification", icon: Shield, action: () => navigate(createPageUrl("ProviderHub") + "?tab=verification") },
  ];

  return (
    <div className="space-y-4">
      {!currentUser?.stripe_account_id && (
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">Connect Stripe to receive payments</p>
              <p className="text-gray-400 text-xs">Set up your payout account in Provider Hub</p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate(createPageUrl("ProviderHub") + "?tab=earnings")} className="bg-green-600 hover:bg-green-700 flex-shrink-0">
            Connect
          </Button>
        </div>
      )}

      {!currentUser?.provider_onboarding_completed && (
        <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">Complete your provider setup</p>
              <p className="text-gray-400 text-xs">Finish your profile and availability</p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate(createPageUrl("ProviderOnboarding"))} className="bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0">
            Get Started
          </Button>
        </div>
      )}

      {/* Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white/5 border-white/10"><CardContent className="p-4">
          <p className="text-2xl font-bold text-white">{myServices.length}</p>
          <p className="text-gray-400 text-xs">Listings</p>
        </CardContent></Card>
        <Card className="bg-white/5 border-white/10"><CardContent className="p-4">
          <p className="text-2xl font-bold text-white">{unreadBookingRequests}</p>
          <p className="text-gray-400 text-xs">New Requests</p>
        </CardContent></Card>
        <Card className="bg-white/5 border-white/10"><CardContent className="p-4">
          <p className="text-2xl font-bold text-white">{unreadMessages}</p>
          <p className="text-gray-400 text-xs">Unread Messages</p>
        </CardContent></Card>
        <Card className="bg-white/5 border-white/10"><CardContent className="p-4">
          <p className="text-2xl font-bold text-white">{currentUser?.provider_trust_score || 0}</p>
          <p className="text-gray-400 text-xs">Trust Score</p>
        </CardContent></Card>
      </div>

      {trustLevel && (
        <Badge className="bg-emerald-500/20 text-emerald-300 capitalize">{trustLevel} Verified Provider</Badge>
      )}

      {/* Quick links into the full hub */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-2 divide-y divide-white/10">
          {quickLinks.map(item => (
            <button key={item.label} onClick={item.action} className="w-full flex items-center justify-between py-3 px-2 hover:bg-white/5 rounded-lg transition text-left">
              <span className="flex items-center gap-3 text-white text-sm"><item.icon className="w-4 h-4 text-gray-400" />{item.label}</span>
              <span className="flex items-center gap-2">
                {item.badge > 0 && (
                  <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={() => navigate(createPageUrl("ProviderHub"))}
        variant="outline"
        className="w-full justify-between bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-300"
      >
        <span className="flex items-center gap-2"><ExternalLink className="w-4 h-4" />Open Full Provider Hub</span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
