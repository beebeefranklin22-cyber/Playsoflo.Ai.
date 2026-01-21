import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown, Star, Zap, Plus, Edit, Trash2, Users, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SubscriptionTiersManager({ currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    tier_name: "",
    tier_level: 1,
    monthly_price: "",
    description: "",
    benefits: [""],
    exclusive_content_access: true,
    early_access: false,
    custom_badge: "",
    discord_role: "",
    monthly_live_sessions: 0,
    direct_messaging: false
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ['subscription-tiers', currentUser.email],
    queryFn: async () => {
      return await base44.entities.SubscriptionTier.filter({
        creator_email: currentUser.email
      });
    }
  });

  const { data: subscribers = [] } = useQuery({
    queryKey: ['tier-subscribers', currentUser.email],
    queryFn: async () => {
      return await base44.entities.CreatorSubscription.filter({
        creator_email: currentUser.email,
        status: "active"
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.SubscriptionTier.create({
        ...data,
        creator_email: currentUser.email,
        creator_username: currentUser.username || currentUser.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription-tiers']);
      setShowModal(false);
      resetForm();
      toast.success("Subscription tier created!");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.SubscriptionTier.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription-tiers']);
      setShowModal(false);
      setEditingTier(null);
      resetForm();
      toast.success("Tier updated!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.SubscriptionTier.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription-tiers']);
      toast.success("Tier deleted!");
    }
  });

  const resetForm = () => {
    setFormData({
      tier_name: "",
      tier_level: 1,
      monthly_price: "",
      description: "",
      benefits: [""],
      exclusive_content_access: true,
      early_access: false,
      custom_badge: "",
      discord_role: "",
      monthly_live_sessions: 0,
      direct_messaging: false
    });
  };

  const handleEdit = (tier) => {
    setEditingTier(tier);
    setFormData({
      tier_name: tier.tier_name,
      tier_level: tier.tier_level,
      monthly_price: tier.monthly_price.toString(),
      description: tier.description || "",
      benefits: tier.benefits || [""],
      exclusive_content_access: tier.exclusive_content_access !== false,
      early_access: tier.early_access || false,
      custom_badge: tier.custom_badge || "",
      discord_role: tier.discord_role || "",
      monthly_live_sessions: tier.monthly_live_sessions || 0,
      direct_messaging: tier.direct_messaging || false
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      monthly_price: parseFloat(formData.monthly_price),
      benefits: formData.benefits.filter(b => b.trim())
    };

    if (editingTier) {
      updateMutation.mutate({ id: editingTier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const tierIcons = {
    1: Star,
    2: Zap,
    3: Crown
  };

  const getTierSubscribers = (tierId) => {
    return subscribers.filter(s => s.tier_id === tierId).length;
  };

  const getTierRevenue = (tier) => {
    const subs = getTierSubscribers(tier.id);
    return (subs * tier.monthly_price).toFixed(2);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Subscription Tiers</h2>
        <Button
          onClick={() => {
            resetForm();
            setEditingTier(null);
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-purple-600 to-pink-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Tier
        </Button>
      </div>

      {tiers.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Crown className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Tiers Yet</h3>
            <p className="text-gray-400 mb-6">Create subscription tiers to monetize your content</p>
            <Button onClick={() => setShowModal(true)} className="bg-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Create First Tier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.sort((a, b) => a.tier_level - b.tier_level).map((tier, index) => {
            const Icon = tierIcons[tier.tier_level] || Star;
            const subscriberCount = getTierSubscribers(tier.id);
            const monthlyRevenue = getTierRevenue(tier);

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`bg-gradient-to-br ${
                  tier.tier_level === 3 ? 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30' :
                  tier.tier_level === 2 ? 'from-purple-500/20 to-pink-500/20 border-purple-500/30' :
                  'from-blue-500/20 to-cyan-500/20 border-blue-500/30'
                } border-2 relative overflow-hidden`}>
                  {tier.tier_level === 3 && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-gradient-to-br from-yellow-400 to-orange-400 text-black text-xs font-bold px-3 py-1 rounded-bl-xl">
                        PREMIUM
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl ${
                        tier.tier_level === 3 ? 'bg-yellow-500/20' :
                        tier.tier_level === 2 ? 'bg-purple-500/20' :
                        'bg-blue-500/20'
                      } flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${
                          tier.tier_level === 3 ? 'text-yellow-400' :
                          tier.tier_level === 2 ? 'text-purple-400' :
                          'text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-white text-xl">{tier.tier_name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xl font-bold text-white">${tier.monthly_price}</span>
                          <span className="text-gray-400 text-sm">/month</span>
                        </div>
                      </div>
                    </div>
                    {tier.description && (
                      <p className="text-gray-300 text-sm">{tier.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                          <Users className="w-3 h-3" />
                          Subscribers
                        </div>
                        <div className="text-white text-xl font-bold">{subscriberCount}</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                          <DollarSign className="w-3 h-3" />
                          Monthly
                        </div>
                        <div className="text-green-400 text-xl font-bold">${monthlyRevenue}</div>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div>
                      <h4 className="text-white font-semibold text-sm mb-2">Benefits:</h4>
                      <ul className="space-y-2">
                        {tier.benefits?.map((benefit, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">✓</span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Perks */}
                    <div className="flex flex-wrap gap-2">
                      {tier.exclusive_content_access && (
                        <Badge className="bg-purple-500/20 text-purple-300">Exclusive Content</Badge>
                      )}
                      {tier.early_access && (
                        <Badge className="bg-blue-500/20 text-blue-300">Early Access</Badge>
                      )}
                      {tier.direct_messaging && (
                        <Badge className="bg-pink-500/20 text-pink-300">Direct Messaging</Badge>
                      )}
                      {tier.monthly_live_sessions > 0 && (
                        <Badge className="bg-green-500/20 text-green-300">{tier.monthly_live_sessions}x Live Sessions</Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(tier)}
                        className="flex-1 bg-white/5 border-white/10 text-white"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${tier.tier_name}? Subscribers will be notified.`)) {
                            deleteMutation.mutate(tier.id);
                          }
                        }}
                        className="bg-red-500/10 border-red-500/30 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl">
                {editingTier ? "Edit Tier" : "Create Subscription Tier"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Tier Name</label>
                  <Input
                    value={formData.tier_name}
                    onChange={(e) => setFormData({...formData, tier_name: e.target.value})}
                    placeholder="e.g., Supporter, VIP, Elite"
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Monthly Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthly_price}
                    onChange={(e) => setFormData({...formData, monthly_price: e.target.value})}
                    placeholder="9.99"
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Tier Level (1-3)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({...formData, tier_level: level})}
                      className={`p-3 rounded-lg border-2 transition ${
                        formData.tier_level === level
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="text-white font-bold">Level {level}</div>
                      <div className="text-gray-400 text-xs">
                        {level === 1 ? 'Basic' : level === 2 ? 'Pro' : 'Premium'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="What subscribers get with this tier..."
                  className="bg-white/5 border-white/10 text-white h-20"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Benefits</label>
                {formData.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={benefit}
                      onChange={(e) => {
                        const newBenefits = [...formData.benefits];
                        newBenefits[index] = e.target.value;
                        setFormData({...formData, benefits: newBenefits});
                      }}
                      placeholder="e.g., Access to exclusive posts"
                      className="bg-white/5 border-white/10 text-white"
                    />
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const newBenefits = formData.benefits.filter((_, i) => i !== index);
                          setFormData({...formData, benefits: newBenefits});
                        }}
                        className="bg-red-500/10 border-red-500/30 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({...formData, benefits: [...formData.benefits, ""]})}
                  className="w-full bg-white/5 border-white/10 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Benefit
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer border border-white/10">
                  <input
                    type="checkbox"
                    checked={formData.exclusive_content_access}
                    onChange={(e) => setFormData({...formData, exclusive_content_access: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-white text-sm">Exclusive Content Access</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer border border-white/10">
                  <input
                    type="checkbox"
                    checked={formData.early_access}
                    onChange={(e) => setFormData({...formData, early_access: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-white text-sm">Early Access to Content</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer border border-white/10">
                  <input
                    type="checkbox"
                    checked={formData.direct_messaging}
                    onChange={(e) => setFormData({...formData, direct_messaging: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-white text-sm">Direct Messaging</span>
                </label>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Monthly Live Sessions</label>
                  <Input
                    type="number"
                    value={formData.monthly_live_sessions}
                    onChange={(e) => setFormData({...formData, monthly_live_sessions: parseInt(e.target.value) || 0})}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTier(null);
                    resetForm();
                  }}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {editingTier ? "Update Tier" : "Create Tier"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}