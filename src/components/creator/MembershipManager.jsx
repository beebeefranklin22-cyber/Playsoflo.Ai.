import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Crown, Users, DollarSign, Plus, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

export default function MembershipManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [benefitInput, setBenefitInput] = useState("");
  const [form, setForm] = useState({
    tier_name: "",
    description: "",
    monthly_price_usd: 9.99,
    monthly_price_rri: 0,
    benefits: [],
    perks: {
      exclusive_livestreams: false,
      ppv_discount_percent: 0,
      early_access: false,
      custom_badge: "",
      ad_free: false,
      priority_chat: false
    }
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['creator-memberships', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.CreatorMembership.filter({ creator_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: subscribers = [] } = useQuery({
    queryKey: ['membership-subscribers', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.MembershipSubscription.filter({
        creator_email: currentUser.email,
        status: 'active'
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const createMembershipMutation = useMutation({
    mutationFn: (data) => base44.entities.CreatorMembership.create({
      ...data,
      creator_email: currentUser.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-memberships'] });
      setForm({
        tier_name: "",
        description: "",
        monthly_price_usd: 9.99,
        monthly_price_rri: 0,
        benefits: [],
        perks: {
          exclusive_livestreams: false,
          ppv_discount_percent: 0,
          early_access: false,
          custom_badge: "",
          ad_free: false,
          priority_chat: false
        }
      });
      setBenefitInput("");
      toast.success('Membership tier created!');
    }
  });

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setForm({
        ...form,
        benefits: [...form.benefits, benefitInput.trim()]
      });
      setBenefitInput("");
    }
  };

  const removeBenefit = (index) => {
    setForm({
      ...form,
      benefits: form.benefits.filter((_, i) => i !== index)
    });
  };

  const totalRevenue = memberships.reduce((sum, m) => sum + (m.monthly_revenue || 0), 0);
  const totalMembers = memberships.reduce((sum, m) => sum + (m.member_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <Crown className="w-5 h-5" />
              <span className="text-sm">Monthly Revenue</span>
            </div>
            <div className="text-3xl font-bold text-white">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">Total Members</span>
            </div>
            <div className="text-3xl font-bold text-white">{totalMembers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm">Active Tiers</span>
            </div>
            <div className="text-3xl font-bold text-white">{memberships.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Create Membership */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Membership Tier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              placeholder="Tier Name (e.g., Gold, Platinum)"
              value={form.tier_name}
              onChange={(e) => setForm({...form, tier_name: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Monthly Price (USD)"
              value={form.monthly_price_usd}
              onChange={(e) => setForm({...form, monthly_price_usd: Number(e.target.value)})}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <Textarea
            placeholder="Membership description..."
            value={form.description}
            onChange={(e) => setForm({...form, description: e.target.value})}
            className="bg-white/10 border-white/20 text-white"
          />

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Benefits</label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add benefit..."
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
                className="bg-white/10 border-white/20 text-white"
              />
              <Button onClick={addBenefit} variant="outline" className="bg-white/5">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.benefits.map((benefit, idx) => (
                <Badge key={idx} className="bg-purple-500/20 text-purple-300 flex items-center gap-1">
                  {benefit}
                  <button onClick={() => removeBenefit(idx)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={form.perks.exclusive_livestreams}
                onChange={(e) => setForm({
                  ...form,
                  perks: {...form.perks, exclusive_livestreams: e.target.checked}
                })}
                className="w-5 h-5 rounded accent-purple-500"
              />
              Exclusive Livestreams
            </label>
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={form.perks.early_access}
                onChange={(e) => setForm({
                  ...form,
                  perks: {...form.perks, early_access: e.target.checked}
                })}
                className="w-5 h-5 rounded accent-purple-500"
              />
              Early Access
            </label>
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={form.perks.ad_free}
                onChange={(e) => setForm({
                  ...form,
                  perks: {...form.perks, ad_free: e.target.checked}
                })}
                className="w-5 h-5 rounded accent-purple-500"
              />
              Ad-Free Experience
            </label>
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={form.perks.priority_chat}
                onChange={(e) => setForm({
                  ...form,
                  perks: {...form.perks, priority_chat: e.target.checked}
                })}
                className="w-5 h-5 rounded accent-purple-500"
              />
              Priority Chat
            </label>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">PPV Discount %</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.perks.ppv_discount_percent}
                onChange={(e) => setForm({
                  ...form,
                  perks: {...form.perks, ppv_discount_percent: Number(e.target.value)}
                })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Custom Badge</label>
              <Input
                placeholder="⭐"
                value={form.perks.custom_badge}
                onChange={(e) => setForm({
                  ...form,
                  perks: {...form.perks, custom_badge: e.target.value}
                })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <Button
            onClick={() => createMembershipMutation.mutate(form)}
            disabled={!form.tier_name || createMembershipMutation.isPending}
            className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
          >
            Create Membership Tier
          </Button>
        </CardContent>
      </Card>

      {/* Membership Tiers */}
      <div className="grid md:grid-cols-3 gap-4">
        {memberships.map((tier) => (
          <Card key={tier.id} className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Crown className="w-6 h-6 text-yellow-400" />
                  {tier.tier_name}
                </h3>
                <Badge className={tier.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}>
                  {tier.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="text-4xl font-bold text-white mb-2">
                ${tier.monthly_price_usd}
                <span className="text-lg text-gray-400">/mo</span>
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

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Members</span>
                  <span className="text-white font-bold">{tier.member_count || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Monthly Revenue</span>
                  <span className="text-green-400 font-bold">${(tier.monthly_revenue || 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}