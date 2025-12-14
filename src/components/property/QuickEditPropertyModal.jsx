import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function QuickEditPropertyModal({ property, onClose, onSave }) {
  const [form, setForm] = useState({
    ...property,
    amenities: property.amenities || [],
    images: property.images || []
  });
  const [newAmenity, setNewAmenity] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file, type) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === "main") {
        setForm({ ...form, main_image: file_url });
      } else {
        setForm({ ...form, images: [...(form.images || []), file_url] });
      }
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const addAmenity = () => {
    if (newAmenity.trim()) {
      setForm({ ...form, amenities: [...(form.amenities || []), newAmenity.trim()] });
      setNewAmenity("");
    }
  };

  const removeImage = (index) => {
    const newImages = [...form.images];
    newImages.splice(index, 1);
    setForm({ ...form, images: newImages });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-gray-900 rounded-3xl my-8"
      >
        <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-6 rounded-t-3xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Edit Property</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Basic Information</h3>
            <Input
              placeholder="Property Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />

            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-white/10 border-white/20 text-white h-24"
            />

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                placeholder="Full Address (Optional)"
                value={form.address || ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Pricing</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {form.listing_type === "short_term" && (
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Price per Night</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.price_per_night || ""}
                    onChange={(e) => setForm({ ...form, price_per_night: Number(e.target.value) })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}
              {form.listing_type === "for_rent" && (
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Price per Month</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.price_per_month || ""}
                    onChange={(e) => setForm({ ...form, price_per_month: Number(e.target.value) })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}
              {form.listing_type === "for_sale" && (
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Sale Price</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.sale_price || ""}
                    onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Property Details</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Bedrooms</label>
                <Input
                  type="number"
                  value={form.bedrooms || ""}
                  onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Bathrooms</label>
                <Input
                  type="number"
                  value={form.bathrooms || ""}
                  onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Square Feet</label>
                <Input
                  type="number"
                  value={form.square_feet || ""}
                  onChange={(e) => setForm({ ...form, square_feet: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Policies</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Cancellation Policy</label>
                <Select
                  value={form.cancellation_policy || "moderate"}
                  onValueChange={(v) => setForm({ ...form, cancellation_policy: v })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible - Full refund 24h before</SelectItem>
                    <SelectItem value="moderate">Moderate - 50% refund 5 days before</SelectItem>
                    <SelectItem value="strict">Strict - 50% refund 7 days before</SelectItem>
                    <SelectItem value="non_refundable">Non-refundable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.listing_type === "short_term" && (
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Minimum Stay (nights)</label>
                  <Input
                    type="number"
                    value={form.minimum_stay || 1}
                    onChange={(e) => setForm({ ...form, minimum_stay: Number(e.target.value) })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Amenities</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Add amenity (e.g., Pool, WiFi)"
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity())}
                className="bg-white/10 border-white/20 text-white flex-1"
              />
              <Button onClick={addAmenity} variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.amenities?.map((amenity, idx) => (
                <Badge key={idx} className="bg-emerald-500/20 text-emerald-400">
                  {amenity}
                  <button
                    onClick={() => setForm({ ...form, amenities: form.amenities.filter((_, i) => i !== idx) })}
                    className="ml-2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Photos</h3>
            
            {/* Main Image */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Main Image</label>
              {form.main_image && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden mb-2">
                  <img src={form.main_image} alt="main" className="w-full h-full object-cover" />
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => document.getElementById("edit-main-image").click()}
                disabled={uploading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Change Main Image"}
              </Button>
              <input
                id="edit-main-image"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files[0], "main")}
                className="hidden"
              />
            </div>

            {/* Additional Images */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Additional Images</label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {form.images?.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt={`img-${idx}`} className="w-full h-32 object-cover rounded-lg" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => document.getElementById("edit-additional-images").click()}
                disabled={uploading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Add More Images
              </Button>
              <input
                id="edit-additional-images"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files[0], "additional")}
                className="hidden"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => onSave(form)}
              disabled={!form.title || !form.location}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}