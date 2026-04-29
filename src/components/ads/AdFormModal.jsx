import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const PLACEMENTS = [
  { id: "feed",    label: "📰 Feed",    desc: "Between posts in the home feed" },
  { id: "stories", label: "🔮 Stories", desc: "In the stories bar" },
  { id: "banner",  label: "🎯 Banner",  desc: "Top banner on home screen" },
];

const CTAS = ["learn_more", "shop_now", "sign_up", "download", "book_now", "contact_us", "get_quote", "apply_now"];

const defaultForm = {
  campaign_name: "",
  headline: "",
  description: "",
  destination_url: "",
  call_to_action: "learn_more",
  placements: ["feed"],
  media_urls: [],
  status: "active",
  schedule: { start_date: "", end_date: "", run_continuously: false },
};

export default function AdFormModal({ isOpen, onClose, editingAd, currentUser, onSaved }) {
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (editingAd) {
      setForm({
        campaign_name: editingAd.campaign_name || "",
        headline: editingAd.headline || "",
        description: editingAd.description || "",
        destination_url: editingAd.destination_url || "",
        call_to_action: editingAd.call_to_action || "learn_more",
        placements: editingAd.placements || ["feed"],
        media_urls: editingAd.media_urls || [],
        status: editingAd.status || "active",
        schedule: {
          start_date: editingAd.schedule?.start_date ? editingAd.schedule.start_date.substring(0, 10) : "",
          end_date: editingAd.schedule?.end_date ? editingAd.schedule.end_date.substring(0, 10) : "",
          run_continuously: editingAd.schedule?.run_continuously || false,
        },
      });
    } else {
      setForm(defaultForm);
    }
  }, [editingAd, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        advertiser_email: currentUser.email,
        objective: "brand_awareness",
        ad_format: "image",
        budget_type: "lifetime",
        budget_amount: 0,
        schedule: {
          start_date: form.schedule.start_date ? new Date(form.schedule.start_date).toISOString() : null,
          end_date: form.schedule.end_date ? new Date(form.schedule.end_date).toISOString() : null,
          run_continuously: !form.schedule.end_date,
        },
      };
      if (editingAd) {
        return base44.entities.AdCampaign.update(editingAd.id, payload);
      } else {
        return base44.entities.AdCampaign.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(editingAd ? "Ad updated!" : "Ad created and set live!");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error("Failed to save: " + e.message),
  });

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, media_urls: [file_url] }));
      toast.success("Image uploaded!");
    } catch (e) {
      toast.error("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const togglePlacement = (id) => {
    setForm(prev => ({
      ...prev,
      placements: prev.placements.includes(id)
        ? prev.placements.filter(p => p !== id)
        : [...prev.placements, id],
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "90vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
            <h2 className="text-white font-bold text-xl">{editingAd ? "Edit Ad" : "Create New Ad"}</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Image Upload */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Ad Image</label>
              {form.media_urls[0] ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden">
                  <img src={form.media_urls[0]} alt="Ad" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setForm(prev => ({ ...prev, media_urls: [] }))}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center hover:bg-black"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e.target.files?.[0])} />
                  <div className="w-full h-36 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-purple-500/50 transition">
                    {uploading ? <Loader2 className="w-8 h-8 text-purple-400 animate-spin" /> : <><ImageIcon className="w-8 h-8 text-gray-500" /><span className="text-gray-400 text-sm">Click to upload image</span></>}
                  </div>
                </label>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-1.5">Campaign Name <span className="text-red-400">*</span></label>
              <Input value={form.campaign_name} onChange={e => setForm(p => ({ ...p, campaign_name: e.target.value }))}
                placeholder="e.g. Summer Promo 2026"
                className="bg-white/5 border-white/10 text-white placeholder-gray-500" />
            </div>

            {/* Headline */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-1.5">Headline</label>
              <Input value={form.headline} onChange={e => setForm(p => ({ ...p, headline: e.target.value }))}
                placeholder="Short attention-grabbing title"
                className="bg-white/5 border-white/10 text-white placeholder-gray-500" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of the offer or promotion..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* Link */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-1.5">Destination URL</label>
              <Input value={form.destination_url} onChange={e => setForm(p => ({ ...p, destination_url: e.target.value }))}
                placeholder="https://example.com"
                className="bg-white/5 border-white/10 text-white placeholder-gray-500" />
            </div>

            {/* CTA */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-1.5">Call to Action</label>
              <select
                value={form.call_to_action}
                onChange={e => setForm(p => ({ ...p, call_to_action: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              >
                {CTAS.map(cta => <option key={cta} value={cta} className="bg-gray-900">{cta.replace(/_/g, " ").toUpperCase()}</option>)}
              </select>
            </div>

            {/* Placements */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Placement Locations</label>
              <div className="space-y-2">
                {PLACEMENTS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlacement(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      form.placements.includes(p.id)
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition ${
                      form.placements.includes(p.id) ? "bg-purple-500 border-purple-500" : "border-gray-500"
                    }`}>
                      {form.placements.includes(p.id) && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{p.label}</p>
                      <p className="text-gray-400 text-xs">{p.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-1.5">Start Date</label>
                <Input type="date" value={form.schedule.start_date}
                  onChange={e => setForm(p => ({ ...p, schedule: { ...p.schedule, start_date: e.target.value } }))}
                  className="bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-1.5">End Date</label>
                <Input type="date" value={form.schedule.end_date}
                  onChange={e => setForm(p => ({ ...p, schedule: { ...p.schedule, end_date: e.target.value } }))}
                  className="bg-white/5 border-white/10 text-white" />
                <p className="text-gray-500 text-xs mt-1">Leave blank to run indefinitely</p>
              </div>
            </div>

            {/* Status toggle */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Status</label>
              <div className="flex gap-2">
                {["active", "paused", "draft"].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, status: s }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                      form.status === s
                        ? s === "active" ? "bg-green-600 text-white" : s === "paused" ? "bg-yellow-600 text-white" : "bg-gray-600 text-white"
                        : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-5 border-t border-white/10 flex-shrink-0">
            <Button variant="outline" onClick={onClose} className="flex-1 border-white/20 text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.campaign_name || form.placements.length === 0}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editingAd ? "Save Changes" : "Launch Ad"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}