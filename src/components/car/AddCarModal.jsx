import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Upload, X, Loader2, Car } from "lucide-react";
import { toast } from "sonner";

export default function AddCarModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    image_url: "",
    category: "automotive",
    availability: "available",
    car_year: "",
    car_make: "",
    car_model: "",
    car_color: "",
    transmission: "automatic",
    fuel_type: "gasoline",
    seats: "5",
    features: []
  });

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price || !formData.image_url) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);
    try {
      await base44.entities.MarketplaceItem.create({
        ...formData,
        price: parseFloat(formData.price),
        verified_provider: true
      });
      toast.success("Vehicle added successfully!");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Add vehicle error:", error);
      toast.error("Failed to add vehicle: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Car className="w-6 h-6 text-green-400" />
              Add New Vehicle
            </DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Image Upload */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Vehicle Photo *</label>
            {formData.image_url ? (
              <div className="relative">
                <img src={formData.image_url} alt="Vehicle" className="w-full h-48 object-cover rounded-lg" />
                <button
                  onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                  className="absolute top-2 right-2 bg-red-500 p-2 rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <input
                  id="car-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('car-image-upload').click()}
                  disabled={uploadingImage}
                  className="w-full bg-white/5 border-white/20"
                >
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Image
                </Button>
              </>
            )}
          </div>

          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Year *</label>
              <Input
                value={formData.car_year}
                onChange={(e) => setFormData({ ...formData, car_year: e.target.value })}
                placeholder="2024"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Make *</label>
              <Input
                value={formData.car_make}
                onChange={(e) => setFormData({ ...formData, car_make: e.target.value })}
                placeholder="Ferrari"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Model *</label>
            <Input
              value={formData.car_model}
              onChange={(e) => setFormData({ ...formData, car_model: e.target.value, title: `${formData.car_year} ${formData.car_make} ${e.target.value}` })}
              placeholder="488 Spider"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your vehicle..."
              rows={4}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Daily Rate ($) *</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="500"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Color</label>
              <Input
                value={formData.car_color}
                onChange={(e) => setFormData({ ...formData, car_color: e.target.value })}
                placeholder="Red"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Seats</label>
              <Select value={formData.seats} onValueChange={(v) => setFormData({ ...formData, seats: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Seats</SelectItem>
                  <SelectItem value="4">4 Seats</SelectItem>
                  <SelectItem value="5">5 Seats</SelectItem>
                  <SelectItem value="7">7 Seats</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Transmission</label>
              <Select value={formData.transmission} onValueChange={(v) => setFormData({ ...formData, transmission: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Fuel Type</label>
              <Select value={formData.fuel_type} onValueChange={(v) => setFormData({ ...formData, fuel_type: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasoline">Gasoline</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/5 border-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || uploadingImage}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? "Adding..." : "Add Vehicle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}