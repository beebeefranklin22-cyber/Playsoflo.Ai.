import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function PropertyEditModal({ property, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    ...property,
    amenities: property.amenities || []
  });
  const [newAmenity, setNewAmenity] = useState("");

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Property.update(property.id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries(["my-properties"]);
      toast.success("Property updated successfully!");
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update property");
    }
  });

  const handleImageUpload = async (file, type) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (type === "main") {
      setForm({ ...form, main_image: file_url });
    } else {
      setForm({ ...form, images: [...(form.images || []), file_url] });
    }
    toast.success("Image uploaded!");
  };

  const removeImage = (index) => {
    const newImages = form.images.filter((_, i) => i !== index);
    setForm({ ...form, images: newImages });
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !form.amenities.includes(newAmenity.trim())) {
      setForm({ ...form, amenities: [...form.amenities, newAmenity.trim()] });
      setNewAmenity("");
    }
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
        className="w-full max-w-4xl bg-gray-900 rounded-3xl p-8 my-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">Edit Property</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <Input
            placeholder="Property Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="bg-white/10 border-white/20 text-white"
          />

          <div className="grid md:grid-cols-2 gap-4">
            <Select
              value={form.property_type}
              onValueChange={(v) => setForm({ ...form, property_type: v })}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="penthouse">Penthouse</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="short_term_rental">Short-Term Rental</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={form.listing_type}
              onValueChange={(v) => setForm({ ...form, listing_type: v })}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="for_rent">For Rent</SelectItem>
                <SelectItem value="for_sale">For Sale</SelectItem>
                <SelectItem value="short_term">Short-Term</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea
            placeholder="Property Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-white/10 border-white/20 text-white h-24"
          />

          <div className="grid md:grid-cols-3 gap-4">
            {form.listing_type === "short_term" && (
              <Input
                type="number"
                placeholder="Price per Night"
                value={form.price_per_night || ""}
                onChange={(e) => setForm({ ...form, price_per_night: Number(e.target.value) })}
                className="bg-white/10 border-white/20 text-white"
              />
            )}
            {form.listing_type === "for_rent" && (
              <Input
                type="number"
                placeholder="Price per Month"
                value={form.price_per_month || ""}
                onChange={(e) => setForm({ ...form, price_per_month: Number(e.target.value) })}
                className="bg-white/10 border-white/20 text-white"
              />
            )}
            {form.listing_type === "for_sale" && (
              <Input
                type="number"
                placeholder="Sale Price"
                value={form.sale_price || ""}
                onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })}
                className="bg-white/10 border-white/20 text-white"
              />
            )}
            <Input
              type="number"
              placeholder="Minimum Stay (nights)"
              value={form.minimum_stay || ""}
              onChange={(e) => setForm({ ...form, minimum_stay: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Input
              type="number"
              placeholder="Bedrooms"
              value={form.bedrooms || ""}
              onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              placeholder="Bathrooms"
              value={form.bathrooms || ""}
              onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              placeholder="Square Feet"
              value={form.square_feet || ""}
              onChange={(e) => setForm({ ...form, square_feet: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <Select
            value={form.cancellation_policy || "moderate"}
            onValueChange={(v) => setForm({ ...form, cancellation_policy: v })}
          >
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Cancellation Policy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flexible">Flexible - Full refund 24h before</SelectItem>
              <SelectItem value="moderate">Moderate - 50% refund within 5 days</SelectItem>
              <SelectItem value="strict">Strict - 50% refund within 7 days</SelectItem>
              <SelectItem value="non_refundable">Non-Refundable</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Location (City, State)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="bg-white/10 border-white/20 text-white"
          />

          {/* Main Image */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Main Image</label>
            {form.main_image && (
              <img src={form.main_image} alt="main" className="w-full h-48 object-cover rounded-lg mb-2" />
            )}
            <Button
              variant="outline"
              onClick={() => document.getElementById("main-image-edit").click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Change Main Image
            </Button>
            <input
              id="main-image-edit"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files[0], "main")}
              className="hidden"
            />
          </div>

          {/* Additional Images */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Additional Images</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {form.images?.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img src={img} alt={`img-${idx}`} className="w-full h-24 object-cover rounded-lg" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => document.getElementById("add-image-edit").click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Image
            </Button>
            <input
              id="add-image-edit"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files[0], "additional")}
              className="hidden"
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Amenities</label>
            <div className="flex gap-2 mb-2">
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
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}