import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Crown, Star, Zap, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CreatePPVStreamModal({ isOpen, onClose, currentUser, onSuccess }) {
  const queryClient = useQueryClient();
  const [streamForm, setStreamForm] = useState({
    title: "",
    description: "",
    category: "entertainment",
    thumbnail_url: ""
  });

  const [tiers, setTiers] = useState([
    {
      tier_name: "Basic",
      price_usd: 5,
      perks: ["Watch livestream", "Basic chat access"],
      chat_priority: false,
      exclusive_badge: null
    },
    {
      tier_name: "Premium",
      price_usd: 15,
      perks: ["Watch livestream", "Priority chat", "Exclusive badge"],
      chat_priority: true,
      exclusive_badge: "Premium",
      badge_color: "#9333EA"
    },
    {
      tier_name: "VIP",
      price_usd: 50,
      perks: ["Watch livestream", "Top priority chat", "VIP badge", "Private Q&A"],
      chat_priority: true,
      exclusive_badge: "VIP",
      badge_color: "#FFD700",
      early_access_minutes: 15
    }
  ]);

  const [editingTier, setEditingTier] = useState(null);

  const createPPVStreamMutation = useMutation({
    mutationFn: async () => {
      // Generate channel name
      const channelName = `ppv_livestream_${Date.now()}_${currentUser.id.substring(0, 8)}`;
      
      // Create streaming content
      const stream = await base44.entities.StreamingContent.create({
        title: streamForm.title,
        type: 'live_event',
        category: streamForm.category,
        description: streamForm.description,
        thumbnail_url: streamForm.thumbnail_url,
        is_live: true,
        rating: 0,
        requires_subscription: false,
        betting_available: false,
        agora_channel_name: channelName,
        creator_email: currentUser.email
      });

      // Create pricing tiers
      const tierPromises = tiers.map(tier => 
        base44.entities.LivestreamPricingTier.create({
          ...tier,
          stream_id: stream.id,
          creator_email: currentUser.email
        })
      );
      
      await Promise.all(tierPromises);

      return stream;
    },
    onSuccess: (stream) => {
      queryClient.invalidateQueries({ queryKey: ['active-streams'] });
      toast.success('PPV Livestream created!');
      onSuccess?.(stream);
      onClose();
    }
  });

  const addPerk = (tierIndex, perk) => {
    if (!perk.trim()) return;
    const newTiers = [...tiers];
    newTiers[tierIndex].perks.push(perk);
    setTiers(newTiers);
  };

  const removePerk = (tierIndex, perkIndex) => {
    const newTiers = [...tiers];
    newTiers[tierIndex].perks.splice(perkIndex, 1);
    setTiers(newTiers);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-6xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 border border-white/20 my-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">Create PPV Livestream</h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Stream Details */}
          <div className="mb-8 space-y-4">
            <h3 className="text-white font-semibold text-xl mb-4">Stream Details</h3>
            <Input
              placeholder="Stream Title"
              value={streamForm.title}
              onChange={(e) => setStreamForm({...streamForm, title: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              placeholder="Description"
              value={streamForm.description}
              onChange={(e) => setStreamForm({...streamForm, description: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              placeholder="Thumbnail URL (optional)"
              value={streamForm.thumbnail_url}
              onChange={(e) => setStreamForm({...streamForm, thumbnail_url: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Pricing Tiers */}
          <div>
            <h3 className="text-white font-semibold text-xl mb-4">Pricing Tiers</h3>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {tiers.map((tier, index) => (
                <Card key={index} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Input
                        value={tier.tier_name}
                        onChange={(e) => {
                          const newTiers = [...tiers];
                          newTiers[index].tier_name = e.target.value;
                          setTiers(newTiers);
                        }}
                        className="bg-white/10 border-white/20 text-white font-bold"
                        placeholder="Tier Name"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="text-gray-400 text-xs mb-1 block">Price (USD)</label>
                      <Input
                        type="number"
                        value={tier.price_usd}
                        onChange={(e) => {
                          const newTiers = [...tiers];
                          newTiers[index].price_usd = Number(e.target.value);
                          setTiers(newTiers);
                        }}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div className="space-y-2 mb-3">
                      <label className="text-gray-400 text-xs">Perks</label>
                      {tier.perks.map((perk, perkIdx) => (
                        <div key={perkIdx} className="flex items-center gap-2">
                          <span className="text-white text-xs flex-1">{perk}</span>
                          <button
                            onClick={() => removePerk(index, perkIdx)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <Input
                        placeholder="Add perk..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            addPerk(index, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="bg-white/10 border-white/20 text-white text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-white text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tier.chat_priority}
                          onChange={(e) => {
                            const newTiers = [...tiers];
                            newTiers[index].chat_priority = e.target.checked;
                            setTiers(newTiers);
                          }}
                          className="rounded accent-purple-500"
                        />
                        Priority Chat
                      </label>
                      
                      {tier.chat_priority && (
                        <Input
                          placeholder="Badge Name"
                          value={tier.exclusive_badge || ""}
                          onChange={(e) => {
                            const newTiers = [...tiers];
                            newTiers[index].exclusive_badge = e.target.value;
                            setTiers(newTiers);
                          }}
                          className="bg-white/10 border-white/20 text-white text-xs"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => createPPVStreamMutation.mutate()}
              disabled={!streamForm.title || createPPVStreamMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg font-bold"
            >
              {createPPVStreamMutation.isPending ? 'Creating...' : 'Create PPV Stream & Go Live'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="px-8"
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}