import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { X, Upload, Link, Tag, DollarSign, Loader2, Image, Video, ShoppingBag, Briefcase, Star, Megaphone, Bookmark, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SHOWCASE_TYPES = [
  { id: "product", label: "Product", icon: ShoppingBag, color: "from-purple-500 to-pink-500" },
  { id: "business", label: "Business", icon: Briefcase, color: "from-blue-500 to-cyan-500" },
  { id: "content", label: "Content", icon: Star, color: "from-yellow-500 to-orange-500" },
  { id: "promo", label: "Promo / Ad", icon: Megaphone, color: "from-red-500 to-pink-500" },
  { id: "saved", label: "Saved", icon: Bookmark, color: "from-green-500 to-teal-500" },
  { id: "shared", label: "Shared", icon: Share2, color: "from-indigo-500 to-purple-500" },
];

const CTA_LABELS = ["Shop Now", "Learn More", "Watch Now", "Book Now", "Visit Site", "Get Deal", "Download", "Join Now"];

export default function ShowcasePostModal({ currentUser, onClose, onSaved }) {
  const [form, setForm] = useState({
    showcase_type: "product",
    title: "",
    description: "",
    media_url: "",
    media_type: "image",
    link_url: "",
    link_label: "Shop Now",
    price: "",
    tags: "",
    is_promoted: false,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const isVideo = file.type.startsWith("video/");
      setForm(f => ({ ...f, media_url: file_url, media_type: isVideo ? "video" : "image" }));
      toast.success("Media uploaded!");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      await base44.entities.ShowcasePost.create({
        ...form,
        creator_email: currentUser.email,
        creator_name: currentUser.full_name,
        creator_photo: currentUser.profile_picture || "",
        price: form.price ? parseFloat(form.price) : undefined,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      });
      toast.success("Showcase posted!");
      onSaved?.();
      onClose();
    } catch (e) { toast.error("Failed: " + e.message); }
    finally { setSaving(false); }
  };

  const selectedType = SHOWCASE_TYPES.find(t => t.id === form.showcase_type);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="w-full max-w-lg bg-[#0f0f1a] rounded-t-3xl border border-white/10 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0f0f1a] px-5 py-4 flex items-center justify-between border-b border-white/10 z-10">
          <div className="flex items-center gap-3">
            {selectedType && (
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${selectedType.color} flex items-center justify-center`}>
                <selectedType.icon className="w-4 h-4 text-white" />
              </div>
            )}
            <h2 className="text-white font-bold text-lg">Create Showcase</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Type Picker */}
          <div>
            <p className="text-gray-400 text-sm mb-2">Showcase Type</p>
            <div className="grid grid-cols-3 gap-2">
              {SHOWCASE_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setForm(f => ({ ...f, showcase_type: type.id }))}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                    form.showcase_type === type.id
                      ? "border-white/30 bg-white/10 scale-[1.02]"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                    <type.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-white font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Media Upload */}
          <div>
            <p className="text-gray-400 text-sm mb-2">Photo or Video</p>
            {form.media_url ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
                {form.media_type === "video" ? (
                  <video src={form.media_url} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={form.media_url} className="w-full h-full object-cover" alt="" />
                )}
                <button
                  onClick={() => setForm(f => ({ ...f, media_url: "", media_type: "image" }))}
                  className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" />
                <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-3 hover:border-purple-500/50 hover:bg-white/5 transition">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <Image className="w-6 h-6 text-gray-500" />
                        <Video className="w-6 h-6 text-gray-500" />
                      </div>
                      <p className="text-gray-400 text-sm">Upload photo or video</p>
                    </>
                  )}
                </div>
              </label>
            )}
          </div>

          {/* Title */}
          <div>
            <p className="text-gray-400 text-sm mb-1">Title *</p>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. New Product Drop 🔥"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-gray-400 text-sm mb-1">Description</p>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Tell people about this..."
              rows={3}
              className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Link */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-400 text-sm mb-1">Link URL</p>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://..."
                  className="bg-white/10 border-white/20 text-white pl-9 text-sm"
                />
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Button Label</p>
              <select
                value={form.link_label}
                onChange={e => setForm(f => ({ ...f, link_label: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none"
              >
                {CTA_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Price & Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-400 text-sm mb-1">Price (optional)</p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                  className="bg-white/10 border-white/20 text-white pl-9 text-sm"
                />
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Tags</p>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="sale, new, hot"
                  className="bg-white/10 border-white/20 text-white pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Promote toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, is_promoted: !f.is_promoted }))}
              className={`w-10 h-6 rounded-full transition-colors ${form.is_promoted ? "bg-purple-600" : "bg-white/20"} relative`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.is_promoted ? "translate-x-5" : "translate-x-1"}`} />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Mark as Promoted</p>
              <p className="text-gray-500 text-xs">Shows a "Promoted" badge on your post</p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-white/5 border-white/20 text-white">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold"
            >
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting...</> : "Post Showcase"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}