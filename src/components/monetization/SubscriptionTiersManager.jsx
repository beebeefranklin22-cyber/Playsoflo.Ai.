import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Star, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function SubscriptionTiersManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [form, setForm] = useState({
    tier_name: "",
    description: "",
    price_monthly: 0,
    price_yearly: 0,
    benefits: [],
    access_level: "basic",
    exclusive_content_access: true,
    live_stream_access: true,
    discord_access: false,
    custom_badge: "",
    max_subscribers: null
  });
  const [newBenefit, setNewBenefit] = useState("");

  const { data: tiers = [] } = useQuery({
    queryKey: ['subscription-tiers', currentUser?.email],
    queryFn: () => base44.entities.SubscriptionTier.filter({ creator_email: currentUser.email }),
    enabled: !!currentUser
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SubscriptionTier.create({ ...data, creator_email: currentUser.email }),
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription-tiers']);
      toast.success('Tier created!');
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SubscriptionTier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription-tiers']);
      toast.success('Tier updated!');
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SubscriptionTier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription-tiers']);
      toast.success('Tier deleted');
    }
  });

  const resetForm = () => {
    setShowModal(false);
    setEditingTier(null);
    setForm({
      tier_name: "",
      description: "",
      price_monthly: 0,
      price_yearly: 0,
      benefits: [],
      access_level: "basic",
      exclusive_content_access: true,
      live_stream_access: true,
      discord_access: false,
      custom_badge: "",
      max_subscribers: null
    });
    setNewBenefit("");
  };

  const handleSubmit = () => {
    if (editingTier) {
      updateMutation.mutate({ id: editingTier.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const tierIcons = {
    basic: Star,
    premium: Crown,
    vip: Sparkles
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Subscription Tiers</h2>
        <Button onClick={() => setShowModal(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Tier
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map(tier => {
          const Icon = tierIcons[tier.access_level];
          return (
            <Card key={tier.id} className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-purple-400" />
                    <CardTitle className="text-white">{tier.tier_name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditingTier(tier);
                      setForm(tier);
                      setShowModal(true);
                    }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(tier.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-2">{tier.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-white">${tier.price_monthly}</div>
                    <div className="text-gray-400 text-sm">per month</div>
                    {tier.price_yearly > 0 && (
                      <div className="text-green-400 text-sm mt-1">
                        ${tier.price_yearly}/year (Save ${(tier.price_monthly * 12 - tier.price_yearly).toFixed(2)})
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {tier.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                        {benefit}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <Badge className="bg-purple-500/20 text-purple-300">
                      {tier.active_subscribers || 0} subscribers
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold text-white mb-6">
                {editingTier ? 'Edit Tier' : 'Create New Tier'}
              </h3>

              <div className="space-y-4">
                <Input
                  placeholder="Tier Name"
                  value={form.tier_name}
                  onChange={(e) => setForm({...form, tier_name: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Monthly Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price_monthly}
                      onChange={(e) => setForm({...form, price_monthly: Number(e.target.value)})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Yearly Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price_yearly}
                      onChange={(e) => setForm({...form, price_yearly: Number(e.target.value)})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Access Level</label>
                  <select
                    value={form.access_level}
                    onChange={(e) => setForm({...form, access_level: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Benefits</label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Add benefit"
                      value={newBenefit}
                      onChange={(e) => setNewBenefit(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newBenefit.trim()) {
                          setForm({...form, benefits: [...form.benefits, newBenefit.trim()]});
                          setNewBenefit("");
                        }
                      }}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Button onClick={() => {
                      if (newBenefit.trim()) {
                        setForm({...form, benefits: [...form.benefits, newBenefit.trim()]});
                        setNewBenefit("");
                      }
                    }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {form.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                        <span className="text-white text-sm">{benefit}</span>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setForm({...form, benefits: form.benefits.filter((_, i) => i !== idx)});
                        }}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={resetForm} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!form.tier_name || !form.price_monthly} className="flex-1 bg-purple-600 hover:bg-purple-700">
                    {editingTier ? 'Update' : 'Create'} Tier
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}