import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X, Package, Upload, DollarSign, Tag, MapPin, Loader2, CheckCircle } from "lucide-react";

const CATEGORIES = [
  { value: "clothing_retail", label: "Clothing & Apparel" },
  { value: "luxury_goods", label: "Products & Goods" },
  { value: "restaurant", label: "Restaurant / Food" },
  { value: "groceries", label: "Groceries" },
  { value: "electronics", label: "Electronics" },
  { value: "barber_beauty", label: "Beauty & Personal Care" },
  { value: "home_services", label: "Home Services" },
  { value: "personal_chef", label: "Personal Chef / Catering" },
  { value: "photography", label: "Photography / Video" },
  { value: "fitness_training", label: "Fitness Training" },
  { value: "tutoring", label: "Education / Tutoring" },
  { value: "tech_support", label: "Tech Support" },
  { value: "cleaning", label: "Cleaning Services" },
  { value: "automotive", label: "Automotive" },
  { value: "event_planning", label: "Event Planning" },
];

const PRICE_TYPES = [
  { value: "fixed", label: "Per Item / Fixed" },
  { value: "hourly", label: "Per Hour" },
  { value: "per_day", label: "Per Day" },
  { value: "per_month", label: "Per Month" },
  { value: "per_project", label: "Per Project" },
  { value: "negotiable", label: "Negotiable" },
];

export default function ListItemModal({ currentUser, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    price_type: "fixed",
    image_url: "",
    location: "",
    service_area: "",
    availability: "available",
    instant_booking: false,
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("image_url", file_url);
      toast.success("Image uploaded!");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error("Please enter a title");
    if (!form.category) return toast.error("Please select a category");
    if (!form.price || isNaN(parseFloat(form.price))) return toast.error("Please enter a valid price");

    setSubmitting(true);
    try {
      await base44.entities.MarketplaceItem.create({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        price: parseFloat(form.price),
        price_type: form.price_type,
        image_url: form.image_url || `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600`,
        location: form.location.trim(),
        service_area: form.service_area.trim() || form.location.trim(),
        provider_name: currentUser.full_name || currentUser.username || currentUser.email,
        provider_email: currentUser.email,
        created_by: currentUser.email,
        rating: 5,
        reviews_count: 0,
        availability: form.availability,
        instant_booking: form.instant_booking,
        verified_provider: false,
        status: "active",
      });
      setDone(true);
      toast.success("Your listing is live on the marketplace!");
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      toast.error("Failed to list item: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-xl"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full md:max-w-lg bg-gray-900 rounded-t-3xl md:rounded-3xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-white font-bold text-lg">List on Marketplace</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
            <CheckCircle className="w-16 h-16 text-green-400" />
            <h3 className="text-white text-xl font-bold">Listing Live!</h3>
            <p className="text-gray-400">Your item is now visible on the marketplace.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Title *</label>
              <Input
                placeholder="e.g. Professional Hair Stylist, Handmade Jewelry..."
                value={form.title}
                onChange={e => set("title", e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Category *</label>
              <select
                value={form.category}
                onChange={e => set("category", e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="" className="bg-gray-900">Select a category...</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value} className="bg-gray-900">{c.label}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Price *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.price}
                    onChange={e => set("price", e.target.value)}
                    className="bg-white/10 border-white/20 text-white pl-8"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Price Type</label>
                <select
                  value={form.price_type}
                  onChange={e => set("price_type", e.target.value)}
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                >
                  {PRICE_TYPES.map(t => (
                    <option key={t.value} value={t.value} className="bg-gray-900">{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Description</label>
              <textarea
                placeholder="Describe your product or service..."
                value={form.description}
                onChange={e => set("description", e.target.value)}
                rows={3}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600 resize-none"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Location / City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Miami, FL"
                  value={form.location}
                  onChange={e => set("location", e.target.value)}
                  className="bg-white/10 border-white/20 text-white pl-9"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Photo</label>
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="preview" className="w-full h-36 object-cover rounded-xl" />
                  <button
                    onClick={() => set("image_url", "")}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20 rounded-xl p-6 cursor-pointer hover:border-orange-500/50 transition">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-gray-400" />
                  )}
                  <span className="text-gray-400 text-sm">{uploading ? "Uploading..." : "Click to upload photo"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>

            {/* Instant booking */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.instant_booking}
                onChange={e => set("instant_booking", e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-gray-300 text-sm">Enable Instant Booking (customers can book without waiting for approval)</span>
            </label>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 text-base mt-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</>
              ) : (
                <><Tag className="w-4 h-4 mr-2" /> Publish Listing</>
              )}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}