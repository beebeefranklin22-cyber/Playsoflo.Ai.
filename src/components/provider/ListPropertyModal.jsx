import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { X, Upload, Loader2, CheckCircle, Plus, Trash2, Building } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ListPropertyModal({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [property, setProperty] = useState({
    title: "",
    description: "",
    property_type: "apartment",
    listing_type: "short_term",
    location: "",
    bedrooms: 1,
    bathrooms: 1,
    square_feet: 0,
    price_per_night: 0,
    price_per_month: 0,
    sale_price: 0,
    main_image: "",
    images: [],
    amenities: [],
    host_name: currentUser?.full_name || "",
    instant_book: false,
    verified_host: false
  });

  const [newAmenity, setNewAmenity] = useState("");

  const createPropertyMutation = useMutation({
    mutationFn: async (data) => {
      const propertyData = {
        ...data,
        host_email: currentUser.email,
        rating: 5.0,
        reviews_count: 0,
        verified_host: false,
        data_source: 'user_listing'
      };
      return await base44.entities.Property.create(propertyData);
    },
    onMutate: async (newProperty) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['properties']);
      
      // Snapshot the previous value
      const previousProperties = queryClient.getQueryData(['properties']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['properties'], (old = []) => [
        ...old,
        {
          ...newProperty,
          id: 'temp_' + Date.now(),
          host_email: currentUser.email,
          rating: 5.0,
          reviews_count: 0,
          created_date: new Date().toISOString()
        }
      ]);
      
      // Haptic feedback
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('medium');
      }
      
      return { previousProperties };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['properties']);
      toast.success('Property listed successfully!');
      
      // Success haptic
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('success');
      }
      
      onClose();
      setProperty({
        title: "",
        description: "",
        property_type: "apartment",
        listing_type: "short_term",
        location: "",
        bedrooms: 1,
        bathrooms: 1,
        square_feet: 0,
        price_per_night: 0,
        price_per_month: 0,
        sale_price: 0,
        main_image: "",
        images: [],
        amenities: [],
        host_name: currentUser?.full_name || "",
        instant_book: false,
        verified_host: false
      });
    },
    onError: (error, newProperty, context) => {
      // Rollback to previous state
      if (context?.previousProperties) {
        queryClient.setQueryData(['properties'], context.previousProperties);
      }
      
      toast.error(error.message || 'Failed to list property');
      
      // Error haptic
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('error');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(['properties']);
    }
  });

  const handleImageUpload = async (file, type = 'main') => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === 'main') {
        setProperty(prev => ({ ...prev, main_image: file_url }));
      } else {
        setProperty(prev => ({ ...prev, images: [...prev.images, file_url] }));
      }
      toast.success('Image uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!property.title || !property.location || !property.main_image) {
      toast.error('Please fill in required fields and upload main image');
      return;
    }

    // Validate pricing based on listing type
    if (property.listing_type === "short_term" && (!property.price_per_night || property.price_per_night <= 0)) {
      toast.error('Please set a valid price per night for short-term rental');
      return;
    }
    if (property.listing_type === "for_rent" && (!property.price_per_month || property.price_per_month <= 0)) {
      toast.error('Please set a valid monthly rent price');
      return;
    }
    if (property.listing_type === "for_sale" && (!property.sale_price || property.sale_price <= 0)) {
      toast.error('Please set a valid sale price');
      return;
    }

    // Server-side validation
    try {
      const validation = await base44.functions.invoke('validateListing', {
        listing_type: 'property',
        data: property
      });

      if (!validation.data.valid) {
        toast.error(validation.data.errors.join(', '));
        return;
      }

      createPropertyMutation.mutate(validation.data.sanitized_data);
    } catch (error) {
      toast.error('Validation failed: ' + error.message);
    }
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
              <Building className="w-8 h-8 text-emerald-400" />
              List Your Property
            </h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {/* Basic Info */}
            <div>
              <label className="text-white font-semibold mb-2 block">Property Title *</label>
              <Input
                value={property.title}
                onChange={(e) => setProperty({ ...property, title: e.target.value })}
                placeholder="Luxury 2BR Apartment in Downtown Miami"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-white font-semibold mb-2 block">Property Type</label>
                <select
                  value={property.property_type}
                  onChange={(e) => setProperty({ ...property, property_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-white/10 border border-white/20 text-white"
                >
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="villa">Villa</option>
                  <option value="penthouse">Penthouse</option>
                  <option value="hotel">Hotel Room</option>
                </select>
              </div>

              <div>
                <label className="text-white font-semibold mb-2 block">Listing Type</label>
                <select
                  value={property.listing_type}
                  onChange={(e) => setProperty({ ...property, listing_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-white/10 border border-white/20 text-white"
                >
                  <option value="short_term">Short-Term Rental</option>
                  <option value="for_rent">For Rent (Long-Term)</option>
                  <option value="for_sale">For Sale</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Location *</label>
              <Input
                value={property.location}
                onChange={(e) => setProperty({ ...property, location: e.target.value })}
                placeholder="Miami Beach, FL"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Description</label>
              <Textarea
                value={property.description}
                onChange={(e) => setProperty({ ...property, description: e.target.value })}
                placeholder="Describe your property..."
                rows={4}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-white font-semibold mb-2 block">Bedrooms</label>
                <Input
                  type="number"
                  value={property.bedrooms}
                  onChange={(e) => setProperty({ ...property, bedrooms: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-white font-semibold mb-2 block">Bathrooms</label>
                <Input
                  type="number"
                  value={property.bathrooms}
                  onChange={(e) => setProperty({ ...property, bathrooms: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-white font-semibold mb-2 block">Square Feet</label>
                <Input
                  type="number"
                  value={property.square_feet}
                  onChange={(e) => setProperty({ ...property, square_feet: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid md:grid-cols-3 gap-4">
              {property.listing_type === "short_term" && (
                <div>
                  <label className="text-white font-semibold mb-2 block">Price/Night</label>
                  <Input
                    type="number"
                    value={property.price_per_night}
                    onChange={(e) => setProperty({ ...property, price_per_night: Number(e.target.value) })}
                    placeholder="0"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}
              {property.listing_type === "for_rent" && (
                <div>
                  <label className="text-white font-semibold mb-2 block">Price/Month</label>
                  <Input
                    type="number"
                    value={property.price_per_month}
                    onChange={(e) => setProperty({ ...property, price_per_month: Number(e.target.value) })}
                    placeholder="0"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}
              {property.listing_type === "for_sale" && (
                <div>
                  <label className="text-white font-semibold mb-2 block">Sale Price</label>
                  <Input
                    type="number"
                    value={property.sale_price}
                    onChange={(e) => setProperty({ ...property, sale_price: Number(e.target.value) })}
                    placeholder="0"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}
            </div>

            {/* Main Image */}
            <div>
              <label className="text-white font-semibold mb-2 block">Main Image *</label>
              {property.main_image ? (
                <div className="relative">
                  <img src={property.main_image} className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={() => setProperty({ ...property, main_image: "" })}
                    className="absolute top-2 right-2 p-2 bg-red-500 rounded-full"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    id="main-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0], 'main')}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('main-image').click()}
                    disabled={uploading}
                    variant="outline"
                    className="w-full h-32 border-dashed border-white/20"
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mr-2" />
                        Upload Main Image
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* Additional Images */}
            <div>
              <label className="text-white font-semibold mb-2 block">Additional Images</label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {property.images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      onClick={() => setProperty(prev => ({
                        ...prev,
                        images: prev.images.filter((_, i) => i !== idx)
                      }))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <input
                id="additional-images"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files?.[0], 'additional')}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => document.getElementById('additional-images').click()}
                disabled={uploading}
                variant="outline"
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Add More Images
              </Button>
            </div>

            {/* Amenities */}
            <div>
              <label className="text-white font-semibold mb-2 block">Amenities</label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newAmenity.trim()) {
                        setProperty(prev => ({ ...prev, amenities: [...prev.amenities, newAmenity.trim()] }));
                        setNewAmenity("");
                      }
                    }
                  }}
                  placeholder="Add amenity (WiFi, Pool, Gym...)"
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newAmenity.trim()) {
                      setProperty(prev => ({ ...prev, amenities: [...prev.amenities, newAmenity.trim()] }));
                      setNewAmenity("");
                    }
                  }}
                  className="bg-emerald-600"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full">
                    <span className="text-white text-sm">{amenity}</span>
                    <button
                      onClick={() => setProperty(prev => ({
                        ...prev,
                        amenities: prev.amenities.filter((_, i) => i !== idx)
                      }))}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={property.instant_book}
                  onChange={(e) => setProperty({ ...property, instant_book: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span className="text-white">Enable Instant Booking</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createPropertyMutation.isPending || uploading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {createPropertyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Listing...
                </>
              ) : (
                'List Property'
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
  );
}