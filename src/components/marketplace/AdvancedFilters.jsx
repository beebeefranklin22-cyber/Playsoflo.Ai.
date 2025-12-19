import React from "react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Star, Shield, MapPin, Clock, Zap, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdvancedFilters({ filters, onFiltersChange, onClear }) {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFiltersCount = Object.values(filters).filter(v => 
    v !== null && v !== undefined && v !== 'all' && 
    !(Array.isArray(v) && v.length === 2 && v[0] === 0 && v[1] === 10000)
  ).length;

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          Advanced Filters
          {activeFiltersCount > 0 && (
            <Badge className="bg-orange-500/20 text-orange-400">
              {activeFiltersCount} active
            </Badge>
          )}
        </h3>
        {activeFiltersCount > 0 && (
          <button
            onClick={onClear}
            className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium hover:bg-red-500/20 transition flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Price Range */}
        <div>
          <label className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            Price Range
          </label>
          <div className="px-2">
            <Slider
              min={0}
              max={10000}
              step={50}
              value={filters.priceRange}
              onValueChange={(value) => updateFilter('priceRange', value)}
              className="mb-3"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-white font-medium">${filters.priceRange[0]}</span>
              <span className="text-gray-400">to</span>
              <span className="text-white font-medium">${filters.priceRange[1]}</span>
            </div>
          </div>
        </div>

        {/* Minimum Rating */}
        <div>
          <label className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            Minimum Rating
          </label>
          <Select
            value={filters.minRating?.toString() || 'all'}
            onValueChange={(value) => updateFilter('minRating', value === 'all' ? null : parseFloat(value))}
          >
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Any rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Rating</SelectItem>
              <SelectItem value="4.5">4.5+ Stars</SelectItem>
              <SelectItem value="4.0">4.0+ Stars</SelectItem>
              <SelectItem value="3.5">3.5+ Stars</SelectItem>
              <SelectItem value="3.0">3.0+ Stars</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Availability */}
        <div>
          <label className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Availability
          </label>
          <Select
            value={filters.availability || 'all'}
            onValueChange={(value) => updateFilter('availability', value === 'all' ? null : value)}
          >
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Any availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Availability</SelectItem>
              <SelectItem value="available_today">Available Today</SelectItem>
              <SelectItem value="instant_booking">Instant Booking</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="limited">Limited Availability</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Verification Level */}
        <div>
          <label className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            Provider Verification
          </label>
          <Select
            value={filters.verification || 'all'}
            onValueChange={(value) => updateFilter('verification', value === 'all' ? null : value)}
          >
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Any verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Provider</SelectItem>
              <SelectItem value="verified_only">Verified Only</SelectItem>
              <SelectItem value="multi_credential">Multi-Credential (3+)</SelectItem>
              <SelectItem value="highly_verified">Highly Verified (5+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Service Area */}
        <div>
          <label className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-400" />
            Service Area
          </label>
          <Select
            value={filters.serviceArea || 'all'}
            onValueChange={(value) => updateFilter('serviceArea', value === 'all' ? null : value)}
          >
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Any location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="miami">Miami</SelectItem>
              <SelectItem value="fort_lauderdale">Fort Lauderdale</SelectItem>
              <SelectItem value="west_palm_beach">West Palm Beach</SelectItem>
              <SelectItem value="boca_raton">Boca Raton</SelectItem>
              <SelectItem value="hollywood">Hollywood</SelectItem>
              <SelectItem value="pompano_beach">Pompano Beach</SelectItem>
              <SelectItem value="nationwide">Nationwide</SelectItem>
              <SelectItem value="online">Online/Remote</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Special Features */}
        <div>
          <label className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Special Features
          </label>
          <div className="space-y-2">
            <button
              onClick={() => updateFilter('instantBooking', !filters.instantBooking)}
              className={`w-full px-4 py-2 rounded-lg border transition text-left text-sm ${
                filters.instantBooking
                  ? 'bg-purple-500/20 border-purple-500/50 text-white'
                  : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
              }`}
            >
              <Zap className="w-3 h-3 inline mr-2" />
              Instant Booking Only
            </button>
            <button
              onClick={() => updateFilter('escrowProtected', !filters.escrowProtected)}
              className={`w-full px-4 py-2 rounded-lg border transition text-left text-sm ${
                filters.escrowProtected
                  ? 'bg-green-500/20 border-green-500/50 text-white'
                  : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
              }`}
            >
              <Shield className="w-3 h-3 inline mr-2" />
              Escrow Protected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}