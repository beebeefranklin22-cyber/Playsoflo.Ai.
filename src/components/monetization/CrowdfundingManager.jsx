import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Heart, TrendingUp, Users, Gift, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CrowdfundingManager({ currentUser, viewMode = "manage" }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [backAmount, setBackAmount] = useState(0);
  const [backMessage, setBackMessage] = useState("");
  const [form, setForm] = useState({
    campaign_name: "",
    description: "",
    campaign_type: "one_time",
    goal_amount: 0,
    image_url: "",
    reward_tiers: []
  });
  const [newTier, setNewTier] = useState({ name: "", amount: 0, description: "", rewards: [] });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', viewMode === "manage" ? currentUser?.email : null],
    queryFn: () => base44.entities.CrowdfundingCampaign.filter(
      viewMode === "manage" ? { creator_email: currentUser.email } : { status: "active" }
    ),
    enabled: !!currentUser
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CrowdfundingCampaign.create({ ...data, creator_email: currentUser.email }),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      toast.success('Campaign created!');
      setShowModal(false);
    }
  });

  const backMutation = useMutation({
    mutationFn: async ({ campaignId, amount, tierid, message }) => {
      await base44.entities.CampaignBacker.create({
        campaign_id: campaignId,
        backer_email: currentUser.email,
        amount,
        reward_tier_id: tierid,
        message,
        payment_status: "completed"
      });

      const campaign = campaigns.find(c => c.id === campaignId);
      await base44.entities.CrowdfundingCampaign.update(campaignId, {
        current_amount: (campaign.current_amount || 0) + amount,
        backers_count: (campaign.backers_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      toast.success('Thank you for backing!');
      setSelectedCampaign(null);
    }
  });

  const addTier = () => {
    if (newTier.name && newTier.amount > 0) {
      setForm({
        ...form,
        reward_tiers: [...form.reward_tiers, { ...newTier, tier_id: Date.now().toString(), claimed: 0 }]
      });
      setNewTier({ name: "", amount: 0, description: "", rewards: [] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">
          {viewMode === "manage" ? "My Campaigns" : "Support Creators"}
        </h2>
        {viewMode === "manage" && (
          <Button onClick={() => setShowModal(true)} className="bg-pink-600 hover:bg-pink-700">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {campaigns.map(campaign => {
          const progress = (campaign.current_amount / campaign.goal_amount) * 100;
          return (
            <Card key={campaign.id} className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold text-xl mb-2">{campaign.campaign_name}</h3>
                    <p className="text-gray-400 text-sm">{campaign.description}</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-white font-bold">
                        ${campaign.current_amount || 0} / ${campaign.goal_amount}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{progress.toFixed(0)}% funded</span>
                      <span>{campaign.backers_count || 0} backers</span>
                    </div>
                  </div>

                  {campaign.reward_tiers?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-white font-semibold text-sm">Reward Tiers</div>
                      {campaign.reward_tiers.slice(0, 3).map(tier => (
                        <div key={tier.tier_id} className="p-3 bg-white/5 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-white font-semibold">{tier.name}</div>
                              <div className="text-gray-400 text-xs">{tier.description}</div>
                            </div>
                            <div className="text-pink-400 font-bold">${tier.amount}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {viewMode !== "manage" && (
                    <Button
                      onClick={() => setSelectedCampaign(campaign)}
                      className="w-full bg-pink-600 hover:bg-pink-700"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Back This Project
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Create Campaign</h3>

              <div className="space-y-4">
                <Input
                  placeholder="Campaign Name"
                  value={form.campaign_name}
                  onChange={(e) => setForm({...form, campaign_name: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Input
                  type="number"
                  placeholder="Goal Amount ($)"
                  value={form.goal_amount}
                  onChange={(e) => setForm({...form, goal_amount: Number(e.target.value)})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div>
                  <label className="text-white font-semibold mb-3 block">Reward Tiers</label>
                  <div className="space-y-3 mb-3">
                    {form.reward_tiers.map((tier, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <div className="text-white font-semibold">{tier.name} - ${tier.amount}</div>
                          <div className="text-gray-400 text-sm">{tier.description}</div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setForm({...form, reward_tiers: form.reward_tiers.filter((_, i) => i !== idx)});
                        }}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Tier Name"
                      value={newTier.name}
                      onChange={(e) => setNewTier({...newTier, name: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newTier.amount}
                      onChange={(e) => setNewTier({...newTier, amount: Number(e.target.value)})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <Input
                    placeholder="Description"
                    value={newTier.description}
                    onChange={(e) => setNewTier({...newTier, description: e.target.value})}
                    className="bg-white/10 border-white/20 text-white mt-2"
                  />
                  <Button onClick={addTier} className="w-full mt-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tier
                  </Button>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createMutation.mutate({...form, status: "active"})} 
                    disabled={!form.campaign_name || !form.goal_amount}
                    className="flex-1 bg-pink-600 hover:bg-pink-700"
                  >
                    Create Campaign
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Back Campaign Modal */}
        {selectedCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setSelectedCampaign(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Back {selectedCampaign.campaign_name}</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Select Reward Tier</label>
                  <div className="space-y-2">
                    {selectedCampaign.reward_tiers?.map(tier => (
                      <button
                        key={tier.tier_id}
                        onClick={() => setBackAmount(tier.amount)}
                        className={`w-full p-3 rounded-lg border transition ${
                          backAmount === tier.amount
                            ? 'bg-pink-500/20 border-pink-500'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="text-left">
                            <div className="text-white font-semibold">{tier.name}</div>
                            <div className="text-gray-400 text-xs">{tier.description}</div>
                          </div>
                          <div className="text-pink-400 font-bold">${tier.amount}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  type="number"
                  placeholder="Custom Amount ($)"
                  value={backAmount}
                  onChange={(e) => setBackAmount(Number(e.target.value))}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Textarea
                  placeholder="Leave a message (optional)"
                  value={backMessage}
                  onChange={(e) => setBackMessage(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Button
                  onClick={() => backMutation.mutate({
                    campaignId: selectedCampaign.id,
                    amount: backAmount,
                    message: backMessage
                  })}
                  disabled={backAmount <= 0}
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Back for ${backAmount}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}