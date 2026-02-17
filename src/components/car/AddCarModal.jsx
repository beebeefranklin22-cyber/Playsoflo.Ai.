import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileSelect } from "@/components/ui/MobileSelect";
import { triggerHaptic } from "@/components/ui/haptic";
import { base44 } from "@/api/base44Client";
import { Upload, X, Loader2, Car, Image } from "lucide-react";
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
    price_type: "per_day",
    car_year: "",
    car_make: "",
    car_model: "",
    car_color: "",
    license_plate: "",
    transmission: "automatic",
    fuel_type: "gasoline",
    seats: "5",
    mileage_limit: 200,
    security_deposit: 500,
    features: [],
    portfolio_images: [],
    is_rental: true,
    add_ons: [],
    rental_details: {
      asset_type: "car",
      min_rental_period: 24,
      fuel_policy: "full_to_full",
      insurance_included: true,
      delivery_available: true
    }
  });
  const [newAddOn, setNewAddOn] = useState({ name: "", description: "", price: "" });

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
      toast.success("Image uploaded!");
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image: " + (error.message || "Unknown error"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price || !formData.image_url || !formData.license_plate) {
      toast.error("Please fill in all required fields (including license plate)");
      return;
    }

    setLoading(true);
    try {
      const listing = await base44.entities.MarketplaceItem.create({
        ...formData,
        price: parseFloat(formData.price),
        security_deposit: parseFloat(formData.security_deposit) || 500,
        mileage_limit: parseFloat(formData.mileage_limit) || 200,
        verified_provider: true,
        is_rental: true
      });
      
      // Notify users about new listing
      try {
        await base44.functions.invoke('notifyListingUpdate', {
          listing_type: 'car rental',
          listing_id: listing.id,
          action: 'created'
        });
      } catch (error) {
        console.log('Notification error:', error);
      }
      
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
                  onClick={() => {
                    triggerHaptic('light');
                    document.getElementById('car-image-upload').click();
                  }}
                  disabled={uploadingImage}
                  className="w-full bg-white/5 border-white/20 min-h-[44px]"
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
              onChange={(e) => {
                const newModel = e.target.value;
                setFormData({ 
                  ...formData, 
                  car_model: newModel, 
                  title: `${formData.car_year} ${formData.car_make} ${newModel}`.trim() 
                });
              }}
              placeholder="488 Spider"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">License Plate *</label>
            <Input
              value={formData.license_plate}
              onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
              placeholder="ABC123"
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

          <div className="grid md:grid-cols-2 gap-4">
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
              <label className="text-gray-400 text-sm mb-2 block">Security Deposit ($)</label>
              <Input
                type="number"
                value={formData.security_deposit}
                onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                placeholder="500"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
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
              <MobileSelect 
                value={formData.seats} 
                onValueChange={(v) => {
                  triggerHaptic('light');
                  setFormData({ ...formData, seats: v });
                }}
                placeholder="Select seats"
                triggerClassName="bg-white/10 border-white/20 text-white"
              >
                <MobileSelect.Item value="2">2 Seats</MobileSelect.Item>
                <MobileSelect.Item value="4">4 Seats</MobileSelect.Item>
                <MobileSelect.Item value="5">5 Seats</MobileSelect.Item>
                <MobileSelect.Item value="7">7 Seats</MobileSelect.Item>
              </MobileSelect>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Daily Mileage Limit</label>
              <Input
                type="number"
                value={formData.mileage_limit}
                onChange={(e) => setFormData({ ...formData, mileage_limit: e.target.value })}
                placeholder="200"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Transmission</label>
              <MobileSelect 
                value={formData.transmission} 
                onValueChange={(v) => {
                  triggerHaptic('light');
                  setFormData({ ...formData, transmission: v });
                }}
                placeholder="Select transmission"
                triggerClassName="bg-white/10 border-white/20 text-white"
              >
                <MobileSelect.Item value="automatic">Automatic</MobileSelect.Item>
                <MobileSelect.Item value="manual">Manual</MobileSelect.Item>
              </MobileSelect>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Fuel Type</label>
              <MobileSelect 
                value={formData.fuel_type} 
                onValueChange={(v) => {
                  triggerHaptic('light');
                  setFormData({ ...formData, fuel_type: v });
                }}
                placeholder="Select fuel type"
                triggerClassName="bg-white/10 border-white/20 text-white"
              >
                <MobileSelect.Item value="gasoline">Gasoline</MobileSelect.Item>
                <MobileSelect.Item value="diesel">Diesel</MobileSelect.Item>
                <MobileSelect.Item value="electric">Electric</MobileSelect.Item>
                <MobileSelect.Item value="hybrid">Hybrid</MobileSelect.Item>
              </MobileSelect>
            </div>
          </div>

          {/* Additional Photos */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Additional Photos (Optional)</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {formData.portfolio_images.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={img} className="w-full h-20 object-cover rounded-lg" />
                  <button
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      portfolio_images: prev.portfolio_images.filter((_, i) => i !== idx)
                    }))}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <input
              id="portfolio-images"
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                for (const file of files) {
                  try {
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    setFormData(prev => ({
                      ...prev,
                      portfolio_images: [...prev.portfolio_images, file_url]
                    }));
                    toast.success('Photo uploaded');
                  } catch {
                    toast.error('Upload failed');
                  }
                }
              }}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('portfolio-images').click()}
              className="w-full bg-white/5 border-white/20"
            >
              <Image className="w-4 h-4 mr-2" />
              Add More Photos
            </Button>
          </div>

          {/* Add-Ons Management */}
          <div className="border-t border-white/20 pt-4">
            <label className="text-gray-400 text-sm mb-3 block font-semibold">Add-Ons (Optional)</label>
            
            {formData.add_ons.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.add_ons.map((addon, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex-1">
                      <p className="text-white font-semibold">{addon.name}</p>
                      <p className="text-gray-400 text-xs">{addon.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 font-bold">${addon.price}/day</span>
                      <button
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          add_ons: prev.add_ons.filter((_, i) => i !== idx)
                        }))}
                        className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-white text-sm font-semibold mb-3">Add New Add-On</p>
              <div className="grid md:grid-cols-3 gap-2 mb-2">
                <Input
                  placeholder="Name (e.g., Child Seat)"
                  value={newAddOn.name}
                  onChange={(e) => setNewAddOn({ ...newAddOn, name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white text-sm"
                />
                <Input
                  placeholder="Description"
                  value={newAddOn.description}
                  onChange={(e) => setNewAddOn({ ...newAddOn, description: e.target.value })}
                  className="bg-white/10 border-white/20 text-white text-sm"
                />
                <Input
                  type="number"
                  placeholder="Price/day"
                  value={newAddOn.price}
                  onChange={(e) => setNewAddOn({ ...newAddOn, price: e.target.value })}
                  className="bg-white/10 border-white/20 text-white text-sm"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!newAddOn.name || !newAddOn.price) {
                    toast.error("Please fill in add-on name and price");
                    return;
                  }
                  setFormData(prev => ({
                    ...prev,
                    add_ons: [...prev.add_ons, {
                      id: Date.now(),
                      name: newAddOn.name,
                      description: newAddOn.description,
                      price: parseFloat(newAddOn.price)
                    }]
                  }));
                  setNewAddOn({ name: "", description: "", price: "" });
                  toast.success("Add-on added!");
                }}
                className="w-full bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
              >
                + Add to List
              </Button>
              
              <div className="mt-3 text-xs text-gray-400">
                <p className="font-semibold mb-1">Suggested add-ons:</p>
                <div className="flex flex-wrap gap-1">
                  {['Child Seat ($15)', 'GPS Device ($10)', 'Ski Rack ($20)', 'Bike Rack ($15)', 'Extra Driver ($25)', 'Roadside Assist ($30)'].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        const [name, priceStr] = suggestion.split(' ($');
                        const price = priceStr.replace(')', '');
                        setNewAddOn({ name, description: '', price });
                      }}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="flex-1 bg-white/5 border-white/20 min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                triggerHaptic('medium');
                handleSubmit();
              }}
              disabled={loading || uploadingImage}
              className="flex-1 bg-green-600 hover:bg-green-700 min-h-[44px]"
            >
              {loading ? "Adding..." : "Add Vehicle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}