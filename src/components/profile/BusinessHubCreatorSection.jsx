import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video, DollarSign, Users, Heart, Eye, Crown, ShoppingBag, BarChart3,
  ChevronRight, ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StripePayoutCard from "./StripePayoutCard";

// Lazy-load the heavy creator sub-components
import VODManager from "../creator/VODManager";
import SubscriptionTiersManager from "../creator/SubscriptionTiersManager";
import MembershipManager from "../creator/MembershipManager";
import PPVContentManager from "../creator/PPVContentManager";
import DigitalProductsStore from "../creator/DigitalProductsStore";
import LivestreamManager from "../livestream/LivestreamManager";

export default function BusinessHubCreatorSection({ currentUser }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: tips = [] } = useQuery({
    queryKey: ["creator-tips", currentUser?.email],
    queryFn: () => base44.entities.TipTransaction.filter({ creator_email: currentUser.email }),
    enabled: !!currentUser?.email,
    initialData: [],
  });

  const { data: subscribers = [] } = useQuery({
    queryKey: ["creator-subscribers", currentUser?.email],
    queryFn: () => base44.entities.UserSubscription.filter({ creator_email: currentUser.email, status: "active" }),
    enabled: !!currentUser?.email,
    initialData: [],
  });

  const totalRevenue = tips.reduce((s, t) => s + (t.amount_usd || 0), 0);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 bg-white/10 border border-white/20 p-1 h-auto">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="vod" className="text-xs">Videos</TabsTrigger>
          <TabsTrigger value="livestream" className="text-xs">Livestream</TabsTrigger>
          <TabsTrigger value="ppv" className="text-xs">PPV</TabsTrigger>
          <TabsTrigger value="tiers" className="text-xs">Subscriptions</TabsTrigger>
          <TabsTrigger value="memberships" className="text-xs">Memberships</TabsTrigger>
          <TabsTrigger value="store" className="text-xs">Store</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-4">
                <DollarSign className="w-5 h-5 text-green-400 mb-1" />
                <div className="text-xl font-bold text-white">${totalRevenue.toFixed(0)}</div>
                <div className="text-gray-400 text-xs">Total Revenue</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-500/10 border-purple-500/20">
              <CardContent className="p-4">
                <Users className="w-5 h-5 text-purple-400 mb-1" />
                <div className="text-xl font-bold text-white">{subscribers.length}</div>
                <div className="text-gray-400 text-xs">Subscribers</div>
              </CardContent>
            </Card>
            <Card className="bg-pink-500/10 border-pink-500/20">
              <CardContent className="p-4">
                <Heart className="w-5 h-5 text-pink-400 mb-1" />
                <div className="text-xl font-bold text-white">{tips.length}</div>
                <div className="text-gray-400 text-xs">Tips Received</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-500/10 border-yellow-500/20">
              <CardContent className="p-4">
                <Eye className="w-5 h-5 text-yellow-400 mb-1" />
                <div className="text-xl font-bold text-white">—</div>
                <div className="text-gray-400 text-xs">Views (30d)</div>
              </CardContent>
            </Card>
          </div>

          {/* Payments & Payouts */}
          <StripePayoutCard currentUser={currentUser} />

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => setActiveTab("vod")} className="bg-gradient-to-r from-purple-600 to-indigo-600 h-12 flex flex-col gap-0.5">
              <Video className="w-4 h-4" />
              <span className="text-xs">Manage Videos</span>
            </Button>
            <Button onClick={() => setActiveTab("tiers")} className="bg-gradient-to-r from-yellow-600 to-orange-600 h-12 flex flex-col gap-0.5">
              <Crown className="w-4 h-4" />
              <span className="text-xs">Subscriptions</span>
            </Button>
            <Button onClick={() => setActiveTab("store")} className="bg-gradient-to-r from-pink-600 to-rose-600 h-12 flex flex-col gap-0.5">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs">My Store</span>
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("CreatorHub"))}
              variant="outline"
              className="h-12 flex flex-col gap-0.5 bg-white/5 border-white/20 text-white"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-xs">Full Creator Hub</span>
            </Button>
          </div>
        </TabsContent>

        {/* VOD / Video Management — no go-live prompt */}
        <TabsContent value="vod" className="mt-4">
          <VODManager currentUser={currentUser} />
        </TabsContent>

        {/* Livestream management (NOT go-live flow) */}
        <TabsContent value="livestream" className="mt-4">
          <LivestreamManager currentUser={currentUser} />
        </TabsContent>

        {/* PPV */}
        <TabsContent value="ppv" className="mt-4">
          <PPVContentManager currentUser={currentUser} />
        </TabsContent>

        {/* Subscription Tiers */}
        <TabsContent value="tiers" className="mt-4">
          <SubscriptionTiersManager currentUser={currentUser} />
        </TabsContent>

        {/* Memberships */}
        <TabsContent value="memberships" className="mt-4">
          <MembershipManager currentUser={currentUser} />
        </TabsContent>

        {/* Store */}
        <TabsContent value="store" className="mt-4">
          <DigitalProductsStore currentUser={currentUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}