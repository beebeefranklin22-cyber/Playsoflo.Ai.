import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, DollarSign, Plus, Edit, Trash, Target, TrendingUp, Calendar, Share2, Mail, MessageSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function FanPoolManager({ fanPools, currentUser }) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPool, setEditingPool] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    pool_type: "album_funding",
    goal_amount: 5000,
    deadline: "",
    cover_image: "",
    tier_rewards: [
      { tier_name: "Bronze Supporter", minimum_contribution: 10, access_type: "early_access", max_slots: 100 },
      { tier_name: "Silver Fan", minimum_contribution: 25, access_type: "exclusive_content", max_slots: 50 },
      { tier_name: "Gold Backer", minimum_contribution: 100, access_type: "vip_experience", max_slots: 20 }
    ]
  });

  const createPoolMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.FanPool.create({
        ...data,
        artist_email: currentUser.email,
        artist_name: currentUser.full_name,
        status: "active",
        raised_amount: 0,
        contributors: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['artist-pools']);
      setShowCreateModal(false);
      resetForm();
      toast.success('Fan pool created successfully!');
    }
  });

  const updatePoolMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.FanPool.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['artist-pools']);
      setEditingPool(null);
      toast.success('Fan pool updated!');
    }
  });

  const deletePoolMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.FanPool.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['artist-pools']);
      toast.success('Fan pool deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      pool_type: "album_funding",
      goal_amount: 5000,
      deadline: "",
      cover_image: "",
      tier_rewards: [
        { tier_name: "Bronze Supporter", minimum_contribution: 10, access_type: "early_access", max_slots: 100 },
        { tier_name: "Silver Fan", minimum_contribution: 25, access_type: "exclusive_content", max_slots: 50 },
        { tier_name: "Gold Backer", minimum_contribution: 100, access_type: "vip_experience", max_slots: 20 }
      ]
    });
  };

  const handleAddTier = () => {
    setFormData({
      ...formData,
      tier_rewards: [
        ...formData.tier_rewards,
        { tier_name: "", minimum_contribution: 0, access_type: "early_access", max_slots: 50 }
      ]
    });
  };

  const handleRemoveTier = (index) => {
    setFormData({
      ...formData,
      tier_rewards: formData.tier_rewards.filter((_, i) => i !== index)
    });
  };

  const handleUpdateTier = (index, field, value) => {
    const updatedTiers = [...formData.tier_rewards];
    updatedTiers[index][field] = value;
    setFormData({ ...formData, tier_rewards: updatedTiers });
  };

  const handleUploadCover = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, cover_image: file_url });
  };

  const shareToSocial = async (pool) => {
    const shareText = `🎵 Support my new project: ${pool.title}\n\nHelp me reach my goal of $${pool.goal_amount}!\n\n`;
    if (navigator.share) {
      await navigator.share({ title: pool.title, text: shareText, url: window.location.href });
    } else {
      navigator.clipboard.writeText(shareText + window.location.href);
      toast.success('Share link copied to clipboard!');
    }
  };

  const sendUpdateToBackers = async (pool) => {
    toast.info('Sending updates to all backers...');
    // In real app, this would send emails to all contributors
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Fan Pool Campaigns</h2>
          <p className="text-gray-400">Crowdfund your music projects with your fans</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Active Campaigns */}
      <div className="grid md:grid-cols-2 gap-6">
        {fanPools.map((pool) => {
          const progress = (pool.raised_amount / pool.goal_amount) * 100;
          const daysLeft = Math.ceil((new Date(pool.deadline) - new Date()) / (1000 * 60 * 60 * 24));
          
          return (
            <Card key={pool.id} className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="relative mb-4">
                  <img 
                    src={pool.cover_image || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600"} 
                    alt={pool.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Badge className={`absolute top-3 right-3 ${
                    pool.status === 'active' ? 'bg-green-500/80' :
                    pool.status === 'funded' ? 'bg-blue-500/80' : 'bg-gray-500/80'
                  }`}>
                    {pool.status.toUpperCase()}
                  </Badge>
                </div>

                <h3 className="text-white font-bold text-xl mb-2">{pool.title}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{pool.description}</p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white font-bold">
                      ${pool.raised_amount.toLocaleString()} / ${pool.goal_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{pool.contributors?.length || 0} backers</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => shareToSocial(pool)}
                    className="bg-white/5 border-white/10"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => sendUpdateToBackers(pool)}
                    className="bg-white/5 border-white/10"
                  >
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setEditingPool(pool);
                      setFormData(pool);
                    }}
                    className="bg-white/5 border-white/10"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {fanPools.length === 0 && (
          <div className="col-span-2 text-center py-20 bg-white/5 rounded-xl">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No campaigns yet</h3>
            <p className="text-gray-400 mb-6">Create your first fan pool to crowdfund your projects</p>
            <Button onClick={() => setShowCreateModal(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create First Campaign
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || editingPool) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => {
              setShowCreateModal(false);
              setEditingPool(null);
              resetForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">
                  {editingPool ? 'Edit Campaign' : 'Create Fan Pool Campaign'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPool(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Campaign Title</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Fund My Next Album"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Campaign Type</label>
                    <Select value={formData.pool_type} onValueChange={(v) => setFormData({ ...formData, pool_type: v })}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="album_funding">Album Funding</SelectItem>
                        <SelectItem value="tour_funding">Tour Funding</SelectItem>
                        <SelectItem value="music_video">Music Video</SelectItem>
                        <SelectItem value="studio_time">Studio Time</SelectItem>
                        <SelectItem value="equipment">Equipment Purchase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Goal Amount ($)</label>
                    <Input
                      type="number"
                      value={formData.goal_amount}
                      onChange={(e) => setFormData({ ...formData, goal_amount: Number(e.target.value) })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Deadline</label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Explain your project and what the funds will be used for..."
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Cover Image</label>
                  {formData.cover_image && (
                    <img src={formData.cover_image} alt="Cover" className="w-full h-48 object-cover rounded-lg mb-2" />
                  )}
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadCover(e.target.files?.[0])}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('cover-upload').click()}
                    className="w-full"
                  >
                    {formData.cover_image ? 'Change Cover' : 'Upload Cover'}
                  </Button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-white font-bold">Reward Tiers</label>
                    <Button size="sm" onClick={handleAddTier} className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tier
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {formData.tier_rewards?.map((tier, index) => (
                      <Card key={index} className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid md:grid-cols-2 gap-3">
                              <Input
                                placeholder="Tier name"
                                value={tier.tier_name}
                                onChange={(e) => handleUpdateTier(index, 'tier_name', e.target.value)}
                                className="bg-white/10 border-white/20 text-white"
                              />
                              <Input
                                type="number"
                                placeholder="Min. contribution"
                                value={tier.minimum_contribution}
                                onChange={(e) => handleUpdateTier(index, 'minimum_contribution', Number(e.target.value))}
                                className="bg-white/10 border-white/20 text-white"
                              />
                              <Select 
                                value={tier.access_type} 
                                onValueChange={(v) => handleUpdateTier(index, 'access_type', v)}
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="early_access">Early Access</SelectItem>
                                  <SelectItem value="exclusive_content">Exclusive Content</SelectItem>
                                  <SelectItem value="vip_experience">VIP Experience</SelectItem>
                                  <SelectItem value="meet_and_greet">Meet & Greet</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                placeholder="Max slots"
                                value={tier.max_slots}
                                onChange={(e) => handleUpdateTier(index, 'max_slots', Number(e.target.value))}
                                className="bg-white/10 border-white/20 text-white"
                              />
                            </div>
                            {formData.tier_rewards.length > 1 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveTier(index)}
                                className="bg-red-500/10 border-red-500/30 text-red-400"
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingPool(null);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (editingPool) {
                        updatePoolMutation.mutate({ id: editingPool.id, data: formData });
                      } else {
                        createPoolMutation.mutate(formData);
                      }
                    }}
                    disabled={createPoolMutation.isPending || updatePoolMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {editingPool ? 'Update Campaign' : 'Create Campaign'}
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