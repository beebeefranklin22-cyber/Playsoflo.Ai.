import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { processFanPoolPayment } from "@/functions/processFanPoolPayment";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, DollarSign, Plus, Edit, Trash, Target, Calendar, Share2,
  Mail, X, Upload, Gift, ShoppingBag, CreditCard, CheckCircle, Star,
  Package, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const TIER_COLORS = [
  { label: "Bronze", value: "#CD7F32" },
  { label: "Silver", value: "#C0C0C0" },
  { label: "Gold", value: "#FFD700" },
  { label: "Platinum", value: "#E5E4E2" },
  { label: "Diamond", value: "#B9F2FF" },
  { label: "Purple", value: "#9B59B6" },
];

const ACCESS_TYPES = [
  { value: "early_access", label: "Early Access" },
  { value: "exclusive_content", label: "Exclusive Content" },
  { value: "vip_experience", label: "VIP Experience" },
  { value: "meet_greet", label: "Meet & Greet" },
  { value: "backstage", label: "Backstage Pass" },
  { value: "general_admission", label: "General Admission" },
  { value: "vip", label: "VIP" },
  { value: "exclusive_access", label: "Exclusive Access" },
];

const POOL_TYPES = [
  { value: "concert_show", label: "🎤 Concert / Show" },
  { value: "album_release", label: "💿 Album Release" },
  { value: "music_video", label: "🎬 Music Video" },
  { value: "tour_funding", label: "🚌 Tour Funding" },
  { value: "merchandise", label: "👕 Merchandise" },
  { value: "equipment", label: "🎸 Equipment" },
  { value: "studio_session", label: "🎙️ Studio Session" },
  { value: "documentary", label: "📽️ Documentary" },
  { value: "meet_and_greet", label: "🤝 Meet & Greet" },
  { value: "exclusive_content", label: "🔒 Exclusive Content" },
];

const emptyForm = () => ({
  title: "",
  description: "",
  pool_type: "album_release",
  goal_amount: 5000,
  deadline: "",
  event_date: "",
  location: "",
  cover_image: "",
  video_url: "",
  tier_rewards: [
    {
      tier_name: "Supporter",
      minimum_contribution: 10,
      description: "Show your love and get a shoutout!",
      rewards: ["Digital shoutout", "Exclusive update emails"],
      access_type: "early_access",
      limited_slots: 0,
      color: "#CD7F32"
    },
    {
      tier_name: "VIP Fan",
      minimum_contribution: 50,
      description: "Get early access plus exclusive content.",
      rewards: ["Early access", "Exclusive behind-the-scenes content", "Name in credits"],
      access_type: "exclusive_content",
      limited_slots: 100,
      color: "#C0C0C0"
    },
    {
      tier_name: "Gold Backer",
      minimum_contribution: 150,
      description: "VIP treatment — you matter to us!",
      rewards: ["VIP experience", "Signed merch", "Video call with artist"],
      access_type: "vip_experience",
      limited_slots: 25,
      color: "#FFD700"
    }
  ],
  add_ons: []
});

export default function FanPoolManager({ fanPools, currentUser }) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPool, setEditingPool] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [expandedTier, setExpandedTier] = useState(null);
  const [payingPool, setPayingPool] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries(['my-fan-pools']);
    queryClient.invalidateQueries(['artist-pools']);
    queryClient.invalidateQueries(['fan-pools']);
  };

  const createPoolMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.FanPool.create({
        ...data,
        artist_email: currentUser.email,
        artist_name: currentUser.full_name || currentUser.email,
        status: "active",
        raised_amount: 0,
        contributors: []
      });
    },
    onSuccess: () => { invalidate(); setShowCreateModal(false); setFormData(emptyForm()); toast.success('Campaign created!'); }
  });

  const updatePoolMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.FanPool.update(id, data),
    onSuccess: () => { invalidate(); setEditingPool(null); setFormData(emptyForm()); toast.success('Campaign updated!'); }
  });

  const deletePoolMutation = useMutation({
    mutationFn: async (id) => base44.entities.FanPool.delete(id),
    onSuccess: () => { invalidate(); toast.success('Campaign deleted'); }
  });

  // ── Tier helpers ──
  const addTier = () => setFormData(p => ({
    ...p,
    tier_rewards: [...p.tier_rewards, {
      tier_name: "New Tier",
      minimum_contribution: 25,
      description: "",
      rewards: ["Exclusive reward"],
      access_type: "early_access",
      limited_slots: 50,
      color: "#9B59B6"
    }]
  }));

  const removeTier = (i) => setFormData(p => ({ ...p, tier_rewards: p.tier_rewards.filter((_, idx) => idx !== i) }));

  const updateTier = (i, field, value) => {
    const tiers = [...formData.tier_rewards];
    tiers[i] = { ...tiers[i], [field]: value };
    setFormData(p => ({ ...p, tier_rewards: tiers }));
  };

  const addRewardToTier = (i) => {
    const tiers = [...formData.tier_rewards];
    tiers[i].rewards = [...(tiers[i].rewards || []), "New reward"];
    setFormData(p => ({ ...p, tier_rewards: tiers }));
  };

  const updateTierReward = (tierIdx, rewardIdx, value) => {
    const tiers = [...formData.tier_rewards];
    tiers[tierIdx].rewards[rewardIdx] = value;
    setFormData(p => ({ ...p, tier_rewards: tiers }));
  };

  const removeTierReward = (tierIdx, rewardIdx) => {
    const tiers = [...formData.tier_rewards];
    tiers[tierIdx].rewards = tiers[tierIdx].rewards.filter((_, i) => i !== rewardIdx);
    setFormData(p => ({ ...p, tier_rewards: tiers }));
  };

  // ── Add-on helpers ──
  const addAddOn = () => setFormData(p => ({
    ...p,
    add_ons: [...(p.add_ons || []), {
      id: Date.now().toString(),
      name: "Signed Poster",
      description: "Hand-signed poster shipped to you",
      price: 30,
      quantity_available: 50,
      quantity_sold: 0
    }]
  }));

  const updateAddOn = (i, field, value) => {
    const addOns = [...(formData.add_ons || [])];
    addOns[i] = { ...addOns[i], [field]: value };
    setFormData(p => ({ ...p, add_ons: addOns }));
  };

  const removeAddOn = (i) => setFormData(p => ({
    ...p, add_ons: (p.add_ons || []).filter((_, idx) => idx !== i)
  }));

  // ── Cover upload ──
  const handleUploadCover = async (file) => {
    if (!file) return;
    setUploadingCover(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(p => ({ ...p, cover_image: file_url }));
    setUploadingCover(false);
  };

  // ── Payment ──
  const handleContribute = async () => {
    if (!selectedTier) { toast.error('Please select a tier'); return; }
    setPaymentLoading(true);
    try {
      const result = await processFanPoolPayment({
        pool_id: payingPool.id,
        tier_name: selectedTier.tier_name,
        tier_amount: selectedTier.minimum_contribution,
        selected_add_ons: selectedAddOns
      });
      if (result?.data?.checkout_url) {
        window.location.href = result.data.checkout_url;
      } else {
        toast.error(result?.data?.error || 'Payment failed');
      }
    } catch (e) {
      toast.error(e.message || 'Payment error');
    }
    setPaymentLoading(false);
  };

  const toggleAddOn = (ao) => {
    setSelectedAddOns(prev =>
      prev.find(a => a.id === ao.id)
        ? prev.filter(a => a.id !== ao.id)
        : [...prev, ao]
    );
  };

  const openEdit = (pool) => {
    setEditingPool(pool);
    setFormData({
      title: pool.title || "",
      description: pool.description || "",
      pool_type: pool.pool_type || "album_release",
      goal_amount: pool.goal_amount || 0,
      deadline: pool.deadline ? pool.deadline.split('T')[0] : "",
      event_date: pool.event_date ? pool.event_date.split('T')[0] : "",
      location: pool.location || "",
      cover_image: pool.cover_image || "",
      video_url: pool.video_url || "",
      tier_rewards: pool.tier_rewards || [],
      add_ons: pool.add_ons || []
    });
  };

  const share = async (pool) => {
    const text = `🎵 Support ${pool.artist_name}: ${pool.title}\nGoal: $${pool.goal_amount.toLocaleString()}\n`;
    if (navigator.share) {
      await navigator.share({ title: pool.title, text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text + window.location.href);
      toast.success('Link copied!');
    }
  };

  const isFormOpen = showCreateModal || !!editingPool;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Fan Pool Campaigns</h2>
          <p className="text-gray-400">Crowdfund your music projects with your fans</p>
        </div>
        <Button onClick={() => { setFormData(emptyForm()); setShowCreateModal(true); }} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Campaign Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {fanPools.map((pool) => {
          const progress = pool.goal_amount > 0 ? Math.min((pool.raised_amount / pool.goal_amount) * 100, 100) : 0;
          const daysLeft = Math.ceil((new Date(pool.deadline) - new Date()) / (1000 * 60 * 60 * 24));

          return (
            <Card key={pool.id} className="bg-white/5 border-white/10 overflow-hidden">
              <div className="relative h-48">
                <img
                  src={pool.cover_image || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600"}
                  alt={pool.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <Badge className={`absolute top-3 right-3 ${
                  pool.status === 'active' ? 'bg-green-500/80' :
                  pool.status === 'funded' ? 'bg-blue-500/80' : 'bg-gray-500/80'
                }`}>{pool.status?.toUpperCase()}</Badge>
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-white font-bold text-lg leading-tight">{pool.title}</h3>
                  <p className="text-gray-300 text-xs">{POOL_TYPES.find(t => t.value === pool.pool_type)?.label}</p>
                </div>
              </div>
              <CardContent className="p-5">
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{pool.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Raised</span>
                    <span className="text-white font-bold">${(pool.raised_amount || 0).toLocaleString()} / ${pool.goal_amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{pool.contributors?.length || 0} backers</span>
                    <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Campaign ended'}</span>
                  </div>
                </div>

                {/* Tiers preview */}
                {pool.tier_rewards?.length > 0 && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {pool.tier_rewards.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: t.color || '#9B59B6' }} />
                        {t.tier_name} — ${t.minimum_contribution}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  <Button size="sm" variant="outline" onClick={() => share(pool)} className="bg-white/5 border-white/10">
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(pool)} className="bg-white/5 border-white/10">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { if (confirm('Delete this campaign?')) deletePoolMutation.mutate(pool.id); }}
                    className="bg-red-500/10 border-red-500/20 text-red-400"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setPayingPool(pool); setSelectedTier(null); setSelectedAddOns([]); }}
                    className="bg-green-600 hover:bg-green-700"
                    title="Preview fan contribution"
                  >
                    <CreditCard className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {fanPools.length === 0 && (
          <div className="col-span-2 text-center py-20 bg-white/5 rounded-xl border border-white/10">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No campaigns yet</h3>
            <p className="text-gray-400 mb-6">Create your first fan pool to crowdfund your projects</p>
            <Button onClick={() => { setFormData(emptyForm()); setShowCreateModal(true); }} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => { setShowCreateModal(false); setEditingPool(null); }}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl bg-gray-900 rounded-3xl max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gray-900 z-10 px-8 pt-8 pb-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {editingPool ? '✏️ Edit Campaign' : '🚀 Create Fan Pool Campaign'}
                </h2>
                <button onClick={() => { setShowCreateModal(false); setEditingPool(null); }} className="p-2 hover:bg-white/10 rounded-full transition">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="px-8 py-6 space-y-8">
                {/* ── BASIC INFO ── */}
                <section>
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-purple-400" /> Basic Info</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-gray-400 text-sm mb-1 block">Campaign Title *</label>
                      <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Fund My Debut Album" className="bg-white/10 border-white/20 text-white" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Campaign Type *</label>
                      <Select value={formData.pool_type} onValueChange={(v) => setFormData(p => ({ ...p, pool_type: v }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{POOL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Goal Amount ($) *</label>
                      <Input type="number" value={formData.goal_amount} onChange={(e) => setFormData(p => ({ ...p, goal_amount: Number(e.target.value) }))} className="bg-white/10 border-white/20 text-white" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Campaign Deadline *</label>
                      <Input type="date" value={formData.deadline} onChange={(e) => setFormData(p => ({ ...p, deadline: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Event Date (optional)</label>
                      <Input type="date" value={formData.event_date} onChange={(e) => setFormData(p => ({ ...p, event_date: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-gray-400 text-sm mb-1 block">Location (optional)</label>
                      <Input value={formData.location} onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Miami, FL" className="bg-white/10 border-white/20 text-white" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-gray-400 text-sm mb-1 block">Description *</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                        rows={4}
                        placeholder="Tell fans what you're creating and how their support helps..."
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </section>

                {/* ── COVER IMAGE ── */}
                <section>
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-blue-400" /> Campaign Media</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Cover Image</label>
                      {formData.cover_image ? (
                        <div className="relative">
                          <img src={formData.cover_image} alt="Cover" className="w-full h-40 object-cover rounded-xl" />
                          <Button size="sm" onClick={() => setFormData(p => ({ ...p, cover_image: "" }))} className="absolute top-2 right-2 bg-red-500 w-7 h-7 p-0 rounded-full">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-blue-500/50 transition">
                          {uploadingCover ? <Loader2 className="w-8 h-8 text-blue-400 animate-spin" /> : <><Upload className="w-8 h-8 text-gray-400 mb-2" /><span className="text-gray-400 text-sm">Upload Cover Image</span></>}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadCover(e.target.files?.[0])} />
                        </label>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Promo Video URL (optional)</label>
                      <Input value={formData.video_url} onChange={(e) => setFormData(p => ({ ...p, video_url: e.target.value }))} placeholder="YouTube or Vimeo URL" className="bg-white/10 border-white/20 text-white" />
                    </div>
                  </div>
                </section>

                {/* ── REWARD TIERS ── */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Reward Tiers</h3>
                    <Button size="sm" onClick={addTier} className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-1" /> Add Tier
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {formData.tier_rewards.map((tier, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer"
                          onClick={() => setExpandedTier(expandedTier === i ? null : i)}
                        >
                          <div className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white/20" style={{ background: tier.color || '#9B59B6' }} />
                          <span className="text-white font-semibold flex-1">{tier.tier_name || 'Unnamed Tier'}</span>
                          <span className="text-green-400 font-bold">${tier.minimum_contribution}</span>
                          <span className="text-gray-500 text-xs">{tier.limited_slots > 0 ? `${tier.limited_slots} slots` : 'Unlimited'}</span>
                          {expandedTier === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          {formData.tier_rewards.length > 1 && (
                            <button onClick={(e) => { e.stopPropagation(); removeTier(i); }} className="text-red-400 hover:text-red-300">
                              <Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {expandedTier === i && (
                          <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-4">
                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-gray-400 text-xs mb-1 block">Tier Name</label>
                                <Input value={tier.tier_name} onChange={(e) => updateTier(i, 'tier_name', e.target.value)} className="bg-white/10 border-white/20 text-white" />
                              </div>
                              <div>
                                <label className="text-gray-400 text-xs mb-1 block">Min. Contribution ($)</label>
                                <Input type="number" value={tier.minimum_contribution} onChange={(e) => updateTier(i, 'minimum_contribution', Number(e.target.value))} className="bg-white/10 border-white/20 text-white" />
                              </div>
                              <div>
                                <label className="text-gray-400 text-xs mb-1 block">Access Type</label>
                                <Select value={tier.access_type} onValueChange={(v) => updateTier(i, 'access_type', v)}>
                                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                                  <SelectContent>{ACCESS_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-gray-400 text-xs mb-1 block">Limited Slots (0 = unlimited)</label>
                                <Input type="number" value={tier.limited_slots} onChange={(e) => updateTier(i, 'limited_slots', Number(e.target.value))} className="bg-white/10 border-white/20 text-white" />
                              </div>
                              <div>
                                <label className="text-gray-400 text-xs mb-1 block">Tier Color</label>
                                <div className="flex gap-2 flex-wrap">
                                  {TIER_COLORS.map(c => (
                                    <button
                                      key={c.value}
                                      title={c.label}
                                      onClick={() => updateTier(i, 'color', c.value)}
                                      className={`w-7 h-7 rounded-full border-2 transition ${tier.color === c.value ? 'border-white scale-110' : 'border-transparent'}`}
                                      style={{ background: c.value }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">Tier Description</label>
                              <textarea
                                value={tier.description}
                                onChange={(e) => updateTier(i, 'description', e.target.value)}
                                rows={2}
                                placeholder="What do backers get at this tier?"
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-gray-400 text-xs">Rewards / Perks</label>
                                <button onClick={() => addRewardToTier(i)} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                  <Plus className="w-3 h-3" /> Add Reward
                                </button>
                              </div>
                              <div className="space-y-2">
                                {(tier.rewards || []).map((r, ri) => (
                                  <div key={ri} className="flex items-center gap-2">
                                    <span className="text-green-400 text-xs">✓</span>
                                    <Input
                                      value={r}
                                      onChange={(e) => updateTierReward(i, ri, e.target.value)}
                                      className="bg-white/10 border-white/20 text-white text-sm h-8"
                                    />
                                    <button onClick={() => removeTierReward(i, ri)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* ── ADD-ONS ── */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-pink-400" /> Add-Ons (Optional)</h3>
                    <Button size="sm" onClick={addAddOn} className="bg-pink-600 hover:bg-pink-700">
                      <Plus className="w-4 h-4 mr-1" /> Add Item
                    </Button>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">Add-ons are optional items fans can purchase on top of their tier (e.g., signed merch, poster, backstage pass upgrade).</p>

                  <div className="space-y-3">
                    {(formData.add_ons || []).map((ao, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="grid md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">Item Name</label>
                            <Input value={ao.name} onChange={(e) => updateAddOn(i, 'name', e.target.value)} placeholder="e.g., Signed Poster" className="bg-white/10 border-white/20 text-white" />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">Price ($)</label>
                            <Input type="number" value={ao.price} onChange={(e) => updateAddOn(i, 'price', Number(e.target.value))} className="bg-white/10 border-white/20 text-white" />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">Qty Available (0 = unlimited)</label>
                            <Input type="number" value={ao.quantity_available} onChange={(e) => updateAddOn(i, 'quantity_available', Number(e.target.value))} className="bg-white/10 border-white/20 text-white" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-gray-400 text-xs mb-1 block">Description</label>
                            <Input value={ao.description} onChange={(e) => updateAddOn(i, 'description', e.target.value)} placeholder="Brief description of this add-on" className="bg-white/10 border-white/20 text-white" />
                          </div>
                          <div className="flex items-end">
                            <Button size="sm" variant="outline" onClick={() => removeAddOn(i)} className="w-full bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20">
                              <Trash className="w-4 h-4 mr-1" /> Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(formData.add_ons || []).length === 0 && (
                      <p className="text-center text-gray-600 py-4 text-sm">No add-ons yet. Click "Add Item" to offer fans extra perks.</p>
                    )}
                  </div>
                </section>

                {/* ── ACTIONS ── */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => { setShowCreateModal(false); setEditingPool(null); }} className="flex-1">Cancel</Button>
                  <Button
                    onClick={() => {
                      if (!formData.title || !formData.goal_amount || !formData.deadline) {
                        toast.error('Please fill in all required fields'); return;
                      }
                      if (editingPool) {
                        updatePoolMutation.mutate({ id: editingPool.id, data: formData });
                      } else {
                        createPoolMutation.mutate(formData);
                      }
                    }}
                    disabled={createPoolMutation.isPending || updatePoolMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {(createPoolMutation.isPending || updatePoolMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingPool ? 'Save Changes' : 'Launch Campaign'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAN CONTRIBUTION / PAYMENT MODAL ── */}
      <AnimatePresence>
        {payingPool && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setPayingPool(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-gray-900 z-10 px-8 pt-8 pb-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Back This Campaign</h2>
                  <p className="text-gray-400 text-sm">{payingPool.title}</p>
                </div>
                <button onClick={() => setPayingPool(null)} className="p-2 hover:bg-white/10 rounded-full transition">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="px-8 py-6 space-y-6">
                {/* Select Tier */}
                <div>
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> Choose Your Tier</h3>
                  <div className="space-y-3">
                    {(payingPool.tier_rewards || []).map((tier, i) => {
                      const isSoldOut = tier.limited_slots > 0 && (tier.slots_taken || 0) >= tier.limited_slots;
                      const isSelected = selectedTier?.tier_name === tier.tier_name;
                      return (
                        <button
                          key={i}
                          disabled={isSoldOut}
                          onClick={() => setSelectedTier(tier)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition ${
                            isSelected ? 'border-purple-500 bg-purple-500/10' :
                            isSoldOut ? 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed' :
                            'border-white/10 bg-white/5 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ background: tier.color || '#9B59B6' }} />
                              <span className="text-white font-bold">{tier.tier_name}</span>
                              {isSoldOut && <Badge className="bg-red-500/20 text-red-400 text-xs">Sold Out</Badge>}
                            </div>
                            <span className="text-green-400 font-bold text-lg">${tier.minimum_contribution}</span>
                          </div>
                          {tier.description && <p className="text-gray-400 text-sm mb-2">{tier.description}</p>}
                          <ul className="space-y-1">
                            {(tier.rewards || []).map((r, ri) => (
                              <li key={ri} className="text-gray-300 text-xs flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" /> {r}
                              </li>
                            ))}
                          </ul>
                          {tier.limited_slots > 0 && (
                            <p className="text-gray-500 text-xs mt-2">{tier.limited_slots - (tier.slots_taken || 0)} slots remaining</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Add-Ons */}
                {(payingPool.add_ons || []).length > 0 && (
                  <div>
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-pink-400" /> Add-Ons (Optional)</h3>
                    <div className="space-y-2">
                      {payingPool.add_ons.map((ao, i) => {
                        const isChecked = selectedAddOns.find(a => a.id === ao.id);
                        const soldOut = ao.quantity_available > 0 && ao.quantity_sold >= ao.quantity_available;
                        return (
                          <button
                            key={i}
                            disabled={soldOut}
                            onClick={() => !soldOut && toggleAddOn(ao)}
                            className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
                              isChecked ? 'border-pink-500 bg-pink-500/10' :
                              soldOut ? 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed' :
                              'border-white/10 bg-white/5 hover:border-white/30'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isChecked ? 'border-pink-500 bg-pink-500' : 'border-white/30'}`}>
                              {isChecked && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium text-sm">{ao.name}</span>
                                {soldOut && <Badge className="bg-red-500/20 text-red-400 text-xs">Sold Out</Badge>}
                              </div>
                              {ao.description && <p className="text-gray-400 text-xs">{ao.description}</p>}
                            </div>
                            <span className="text-green-400 font-bold text-sm">+${ao.price}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Order Summary */}
                {selectedTier && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 className="text-white font-bold mb-3">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>{selectedTier.tier_name}</span>
                        <span>${selectedTier.minimum_contribution}</span>
                      </div>
                      {selectedAddOns.map((ao, i) => (
                        <div key={i} className="flex justify-between text-gray-300">
                          <span>+ {ao.name}</span>
                          <span>${ao.price}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-gray-500 text-xs border-t border-white/10 pt-2">
                        <span>Platform fee (5%)</span>
                        <span>${(((selectedTier.minimum_contribution + selectedAddOns.reduce((s, a) => s + a.price, 0)) * 0.05)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold border-t border-white/10 pt-2 text-base">
                        <span>Total</span>
                        <span>
                          ${(
                            (selectedTier.minimum_contribution + selectedAddOns.reduce((s, a) => s + a.price, 0)) * 1.05
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleContribute}
                  disabled={!selectedTier || paymentLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-4 text-lg font-bold"
                >
                  {paymentLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
                  {paymentLoading ? 'Processing...' : `Back This Campaign`}
                </Button>
                <p className="text-center text-gray-500 text-xs">Secured by Stripe • Cancel anytime before deadline</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}