import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, Loader2, Plus, Car, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ListCarModal({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [car, setCar] = useState({
    title: "",
    description: "",
    category: "automotive",
    price_type: "per_day",
    price: 0,
    image_url: "",
    portfolio_images: [],
    availability: "available",
    provider_name: currentUser?.full_name || "",
    is_rental: true,
    rental_details: {
      asset_type: "car",
      security_deposit: 500,
      min_rental_period: 24,
      max_rental_period: 720,
      mileage_limit_per_day: 200,
      excess_mileage_fee: 0.50,
      fuel_policy: "full_to_full",
      insurance_included: true,
      delivery_available: false,
      delivery_fee: 0,
      pickup_location: "",
      specs: {
        make: "",
        model: "",
        year: new Date().getFullYear(),
        capacity: 4,
        engine: "",
        features: []
      },
      requirements: ["Valid driver's license", "Age 25+", "Clean driving record"],
      cancellation_policy: "moderate",
      instant_confirmation: true
    },
    add_ons: [],
    variations: []
  });

  const [newAddOn, setNewAddOn] = useState({ name: "", price: 0, description: "" });

  const createCarMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketplaceItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['available-cars']);
      queryClient.invalidateQueries(['my-cars']);
      toast.success('Car listed successfully!');
      onClose();
      setCar({
        title: "",
        description: "",
        category: "automotive",
        price_type: "per_day",
        price: 0,
        image_url: "",
        portfolio_images: [],
        availability: "available",
        provider_name: currentUser?.full_name || "",
        is_rental: true,
        rental_details: {
          asset_type: "car",
          security_deposit: 500,
          min_rental_period: 24,
          max_rental_period: 720,
          mileage_limit_per_day: 200,
          excess_mileage_fee: 0.50,
          fuel_policy: "full_to_full",
          insurance_included: true,
          delivery_available: false,
          delivery_fee: 0,
          pickup_location: "",
          specs: {
            make: "",
            model: "",
            year: new Date().getFullYear(),
            capacity: 4,
            engine: "",
            features: []
          },
          requirements: ["Valid driver's license", "Age 25+", "Clean driving record"],
          cancellation_policy: "moderate",
          instant_confirmation: true
        },
        add_ons: [],
        variations: []
      });
    },
    onError: (error) => {
      console.error('Car listing error:', error);
      toast.error(error.message || 'Failed to list car');
    }
  });

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!car.image_url) {
        setCar(prev => ({ ...prev, image_url: file_url }));
      } else {
        setCar(prev => ({ ...prev, portfolio_images: [...prev.portfolio_images, file_url] }));
      }
      toast.success('Image uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    const make = car.rental_details.specs.make;
    const model = car.rental_details.specs.model;
    
    if (!make || !model || !car.price || !car.image_url) {
      toast.error('Please fill in car make, model, price and upload at least one image');
      return;
    }

    const finalTitle = `${make} ${model}`.trim();

    createCarMutation.mutate({
      ...car,
      title: finalTitle,
      provider_email: currentUser.email
    });
  };

  if (!isOpen) return null;

  return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl bg-gray-900 rounded-3xl p-8 my-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Car className="w-8 h-8 text-blue-400" />
              List Your Car
            </h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {/* Basic Info */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-white font-semibold mb-2 block">Make *</label>
                <Input
                  value={car.rental_details.specs.make}
                  onChange={(e) => setCar({ 
                    ...car, 
                    rental_details: {
                      ...car.rental_details,
                      specs: { ...car.rental_details.specs, make: e.target.value }
                    }
                  })}
                  placeholder="Ferrari"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-white font-semibold mb-2 block">Model *</label>
                <Input
                  value={car.rental_details.specs.model}
                  onChange={(e) => setCar({ 
                    ...car, 
                    rental_details: {
                      ...car.rental_details,
                      specs: { ...car.rental_details.specs, model: e.target.value }
                    }
                  })}
                  placeholder="488 GTB"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-white font-semibold mb-2 block">Year</label>
                <Input
                  type="number"
                  value={car.rental_details.specs.year}
                  onChange={(e) => setCar({ 
                    ...car, 
                    rental_details: {
                      ...car.rental_details,
                      specs: { ...car.rental_details.specs, year: Number(e.target.value) }
                    }
                  })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Description</label>
              <Textarea
                value={car.description}
                onChange={(e) => setCar({ ...car, description: e.target.value })}
                placeholder="Describe your car..."
                rows={3}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            {/* Rental Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-white font-semibold mb-2 block">Price/Day *</label>
                <Input
                  type="number"
                  value={car.price}
                  onChange={(e) => setCar({ ...car, price: Number(e.target.value) })}
                  placeholder="0"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-white font-semibold mb-2 block">Security Deposit</label>
                <Input
                  type="number"
                  value={car.rental_details.security_deposit}
                  onChange={(e) => setCar({ 
                    ...car, 
                    rental_details: { ...car.rental_details, security_deposit: Number(e.target.value) }
                  })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-white font-semibold mb-2 block">Pickup Location</label>
                <Input
                  value={car.rental_details.pickup_location}
                  onChange={(e) => setCar({ 
                    ...car, 
                    rental_details: { ...car.rental_details, pickup_location: e.target.value }
                  })}
                  placeholder="Miami, FL"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-white font-semibold mb-2 block">Daily Mileage Limit</label>
                <Input
                  type="number"
                  value={car.rental_details.mileage_limit_per_day}
                  onChange={(e) => setCar({ 
                    ...car, 
                    rental_details: { ...car.rental_details, mileage_limit_per_day: Number(e.target.value) }
                  })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="text-white font-semibold mb-2 block">Car Photos *</label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {car.image_url && (
                  <div className="relative">
                    <img src={car.image_url} className="w-full h-24 object-cover rounded-lg border-2 border-blue-500" />
                    <div className="absolute top-1 left-1 px-2 py-0.5 bg-blue-500 rounded text-xs text-white">Main</div>
                  </div>
                )}
                {car.portfolio_images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      onClick={() => setCar(prev => ({
                        ...prev,
                        portfolio_images: prev.portfolio_images.filter((_, i) => i !== idx)
                      }))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <input
                id="car-images"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files?.[0])}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => document.getElementById('car-images').click()}
                disabled={uploading}
                variant="outline"
                className="w-full"
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Photos
              </Button>
            </div>

            {/* Add-Ons */}
            <div>
              <label className="text-white font-semibold mb-2 block">Add-Ons (Optional)</label>
              <div className="space-y-3 mb-3">
                {car.add_ons.map((addon, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-medium">{addon.name}</p>
                      <p className="text-gray-400 text-xs">${addon.price}/day</p>
                    </div>
                    <button
                      onClick={() => setCar(prev => ({
                        ...prev,
                        add_ons: prev.add_ons.filter((_, i) => i !== idx)
                      }))}
                      className="p-1 hover:bg-red-500/20 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={newAddOn.name}
                  onChange={(e) => setNewAddOn({ ...newAddOn, name: e.target.value })}
                  placeholder="GPS, Child Seat..."
                  className="bg-white/10 border-white/20 text-white text-sm col-span-2"
                />
                <Input
                  type="number"
                  value={newAddOn.price}
                  onChange={(e) => setNewAddOn({ ...newAddOn, price: Number(e.target.value) })}
                  placeholder="Price/day"
                  className="bg-white/10 border-white/20 text-white text-sm"
                />
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (newAddOn.name && newAddOn.price > 0) {
                    setCar(prev => ({ ...prev, add_ons: [...prev.add_ons, { ...newAddOn, id: Date.now() }] }));
                    setNewAddOn({ name: "", price: 0, description: "" });
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={car.rental_details.delivery_available}
                  onChange={(e) => setCar({ 
                    ...car, 
                    rental_details: { ...car.rental_details, delivery_available: e.target.checked }
                  })}
                  className="w-5 h-5 rounded accent-blue-500"
                />
                <span className="text-white">Offer Delivery</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createCarMutation.isPending || uploading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {createCarMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Listing...
                </>
              ) : (
                'List Car'
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
  );
}