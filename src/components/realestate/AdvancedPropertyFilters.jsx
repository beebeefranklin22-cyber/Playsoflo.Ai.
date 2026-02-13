import React, { useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdvancedPropertyFilters({ filters, onFiltersChange, onClose }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const amenitiesList = [
    "Pool", "Gym", "Parking", "WiFi", "Air Conditioning", 
    "Heating", "Washer/Dryer", "Dishwasher", "Pet Friendly",
    "Balcony", "Elevator", "Doorman", "Storage"
  ];

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      priceMin: "",
      priceMax: "",
      bedroomsMin: "",
      bedroomsMax: "",
      bathroomsMin: "",
      bathroomsMax: "",
      sqftMin: "",
      sqftMax: "",
      amenities: [],
      yearBuiltMin: "",
      yearBuiltMax: "",
      zoning: "",
      county: ""
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const toggleAmenity = (amenity) => {
    const current = localFilters.amenities || [];
    const updated = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity];
    setLocalFilters({ ...localFilters, amenities: updated });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, x: "100%" }}
        animate={{ scale: 1, x: 0 }}
        exit={{ scale: 0.9, x: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-3xl h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-emerald-400" />
            Advanced Filters
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Price Range */}
          <div>
            <label className="text-white font-semibold mb-3 block">Price Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  type="number"
                  placeholder="Min"
                  value={localFilters.priceMin}
                  onChange={(e) => setLocalFilters({ ...localFilters, priceMin: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Max"
                  value={localFilters.priceMax}
                  onChange={(e) => setLocalFilters({ ...localFilters, priceMax: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          </div>

          {/* Bedrooms */}
          <div>
            <label className="text-white font-semibold mb-3 block">Bedrooms</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  type="number"
                  placeholder="Min"
                  value={localFilters.bedroomsMin}
                  onChange={(e) => setLocalFilters({ ...localFilters, bedroomsMin: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Max"
                  value={localFilters.bedroomsMax}
                  onChange={(e) => setLocalFilters({ ...localFilters, bedroomsMax: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          </div>

          {/* Bathrooms */}
          <div>
            <label className="text-white font-semibold mb-3 block">Bathrooms</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  type="number"
                  placeholder="Min"
                  value={localFilters.bathroomsMin}
                  onChange={(e) => setLocalFilters({ ...localFilters, bathroomsMin: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Max"
                  value={localFilters.bathroomsMax}
                  onChange={(e) => setLocalFilters({ ...localFilters, bathroomsMax: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          </div>

          {/* Square Footage */}
          <div>
            <label className="text-white font-semibold mb-3 block">Square Footage</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  type="number"
                  placeholder="Min"
                  value={localFilters.sqftMin}
                  onChange={(e) => setLocalFilters({ ...localFilters, sqftMin: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Max"
                  value={localFilters.sqftMax}
                  onChange={(e) => setLocalFilters({ ...localFilters, sqftMax: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          </div>

          {/* Property Age */}
          <div>
            <label className="text-white font-semibold mb-3 block">Property Age (Year Built)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  type="number"
                  placeholder="Min Year"
                  value={localFilters.yearBuiltMin}
                  onChange={(e) => setLocalFilters({ ...localFilters, yearBuiltMin: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Max Year"
                  value={localFilters.yearBuiltMax}
                  onChange={(e) => setLocalFilters({ ...localFilters, yearBuiltMax: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          </div>

          {/* Zoning */}
          <div>
            <label className="text-white font-semibold mb-3 block">Zoning</label>
            <Input
              type="text"
              placeholder="e.g., Residential, Commercial"
              value={localFilters.zoning}
              onChange={(e) => setLocalFilters({ ...localFilters, zoning: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* County */}
          <div>
            <label className="text-white font-semibold mb-3 block">County</label>
            <Input
              type="text"
              placeholder="e.g., Miami-Dade"
              value={localFilters.county}
              onChange={(e) => setLocalFilters({ ...localFilters, county: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="text-white font-semibold mb-3 block">
              Amenities ({(localFilters.amenities || []).length} selected)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {amenitiesList.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition"
                >
                  <Checkbox
                    checked={(localFilters.amenities || []).includes(amenity)}
                    onCheckedChange={() => toggleAmenity(amenity)}
                  />
                  <span className="text-white text-sm">{amenity}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex gap-3">
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1"
          >
            Reset
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            Apply Filters
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}