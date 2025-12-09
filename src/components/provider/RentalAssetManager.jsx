import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Home, Ship, Waves, MapPin, DollarSign, Shield, Fuel, Clock } from "lucide-react";

const assetIcons = {
  car: Car,
  property: Home,
  yacht: Ship,
  boat: Ship,
  jetski: Waves,
  atv: Car,
  motorcycle: Car,
  rv: Car,
  equipment: MapPin,
  other: MapPin
};

export default function RentalAssetManager({ rentalDetails = {}, onChange }) {
  const [details, setDetails] = useState({
    asset_type: "car",
    security_deposit: 500,
    min_rental_period: 24,
    max_rental_period: 720,
    mileage_limit_per_day: 150,
    excess_mileage_fee: 0.5,
    fuel_policy: "full_to_full",
    insurance_included: true,
    insurance_cost: 0,
    delivery_available: false,
    delivery_fee: 0,
    pickup_location: "",
    specs: {},
    requirements: [],
    cancellation_policy: "moderate",
    instant_confirmation: false,
    ...rentalDetails
  });

  const [newRequirement, setNewRequirement] = useState("");
  const [newFeature, setNewFeature] = useState("");

  const updateDetails = (updates) => {
    const newDetails = { ...details, ...updates };
    setDetails(newDetails);
    onChange(newDetails);
  };

  const updateSpecs = (updates) => {
    const newSpecs = { ...details.specs, ...updates };
    updateDetails({ specs: newSpecs });
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      updateDetails({ 
        requirements: [...(details.requirements || []), newRequirement.trim()] 
      });
      setNewRequirement("");
    }
  };

  const removeRequirement = (index) => {
    updateDetails({ 
      requirements: details.requirements.filter((_, i) => i !== index) 
    });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      const features = [...(details.specs?.features || []), newFeature.trim()];
      updateSpecs({ features });
      setNewFeature("");
    }
  };

  const removeFeature = (index) => {
    const features = details.specs?.features?.filter((_, i) => i !== index) || [];
    updateSpecs({ features });
  };

  const AssetIcon = assetIcons[details.asset_type] || MapPin;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-white">
        <AssetIcon className="w-5 h-5 text-purple-400" />
        <h3 className="font-bold">Rental Asset Details</h3>
      </div>

      {/* Asset Type */}
      <div>
        <label className="text-gray-400 text-sm mb-2 block">Asset Type</label>
        <Select value={details.asset_type} onValueChange={(v) => updateDetails({ asset_type: v })}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="car">Car</SelectItem>
            <SelectItem value="property">Property</SelectItem>
            <SelectItem value="yacht">Yacht</SelectItem>
            <SelectItem value="boat">Boat</SelectItem>
            <SelectItem value="jetski">Jet Ski</SelectItem>
            <SelectItem value="atv">ATV</SelectItem>
            <SelectItem value="motorcycle">Motorcycle</SelectItem>
            <SelectItem value="rv">RV</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Specs based on asset type */}
      <Card className="bg-white/5 border-white/10 p-4 space-y-3">
        <h4 className="text-white font-semibold">Specifications</h4>
        
        {(details.asset_type === "car" || details.asset_type === "motorcycle" || details.asset_type === "rv") && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Make (e.g., Tesla)"
              value={details.specs?.make || ""}
              onChange={(e) => updateSpecs({ make: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              placeholder="Model"
              value={details.specs?.model || ""}
              onChange={(e) => updateSpecs({ model: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              placeholder="Year"
              value={details.specs?.year || ""}
              onChange={(e) => updateSpecs({ year: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              placeholder="Capacity (seats)"
              value={details.specs?.capacity || ""}
              onChange={(e) => updateSpecs({ capacity: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        )}

        {details.asset_type === "property" && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              placeholder="Bedrooms"
              value={details.specs?.bedrooms || ""}
              onChange={(e) => updateSpecs({ bedrooms: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              placeholder="Bathrooms"
              value={details.specs?.bathrooms || ""}
              onChange={(e) => updateSpecs({ bathrooms: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              placeholder="Square Feet"
              value={details.specs?.square_feet || ""}
              onChange={(e) => updateSpecs({ square_feet: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              placeholder="Max Capacity"
              value={details.specs?.capacity || ""}
              onChange={(e) => updateSpecs({ capacity: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        )}

        {(details.asset_type === "yacht" || details.asset_type === "boat") && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Make/Brand"
              value={details.specs?.make || ""}
              onChange={(e) => updateSpecs({ make: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              placeholder="Year"
              value={details.specs?.year || ""}
              onChange={(e) => updateSpecs({ year: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              placeholder="Length (ft)"
              value={details.specs?.length || ""}
              onChange={(e) => updateSpecs({ length: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              placeholder="Capacity"
              value={details.specs?.capacity || ""}
              onChange={(e) => updateSpecs({ capacity: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        )}

        {/* Features */}
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Features</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {details.specs?.features?.map((feature, i) => (
              <Badge key={i} className="bg-blue-500/20 text-blue-300">
                {feature}
                <button onClick={() => removeFeature(i)} className="ml-2">×</button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add feature (e.g., GPS, WiFi)"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              className="bg-white/10 border-white/20 text-white flex-1"
            />
            <Button onClick={addFeature} variant="outline" className="bg-white/5">
              Add
            </Button>
          </div>
        </div>
      </Card>

      {/* Pricing & Policies */}
      <Card className="bg-white/5 border-white/10 p-4 space-y-3">
        <h4 className="text-white font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Pricing & Policies
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Security Deposit</label>
            <Input
              type="number"
              value={details.security_deposit}
              onChange={(e) => updateDetails({ security_deposit: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Min Rental (hours)</label>
            <Input
              type="number"
              value={details.min_rental_period}
              onChange={(e) => updateDetails({ min_rental_period: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>

        {(details.asset_type === "car" || details.asset_type === "motorcycle" || details.asset_type === "rv") && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Daily Mileage Limit</label>
              <Input
                type="number"
                value={details.mileage_limit_per_day}
                onChange={(e) => updateDetails({ mileage_limit_per_day: Number(e.target.value) })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Excess Mile Fee</label>
              <Input
                type="number"
                step="0.1"
                value={details.excess_mileage_fee}
                onChange={(e) => updateDetails({ excess_mileage_fee: Number(e.target.value) })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Fuel Policy</label>
              <Select value={details.fuel_policy} onValueChange={(v) => updateDetails({ fuel_policy: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_to_full">Full to Full</SelectItem>
                  <SelectItem value="same_to_same">Same to Same</SelectItem>
                  <SelectItem value="prepaid">Prepaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div>
          <label className="text-gray-400 text-xs mb-1 block">Cancellation Policy</label>
          <Select value={details.cancellation_policy} onValueChange={(v) => updateDetails({ cancellation_policy: v })}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flexible">Flexible (24h notice)</SelectItem>
              <SelectItem value="moderate">Moderate (48h notice)</SelectItem>
              <SelectItem value="strict">Strict (7 days notice)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Insurance & Delivery */}
      <Card className="bg-white/5 border-white/10 p-4 space-y-3">
        <h4 className="text-white font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Insurance & Delivery
        </h4>

        <div className="flex items-center justify-between">
          <span className="text-white">Insurance Included</span>
          <Switch
            checked={details.insurance_included}
            onCheckedChange={(v) => updateDetails({ insurance_included: v })}
          />
        </div>

        {details.insurance_included && (
          <Input
            type="number"
            placeholder="Insurance Cost (if extra)"
            value={details.insurance_cost}
            onChange={(e) => updateDetails({ insurance_cost: Number(e.target.value) })}
            className="bg-white/10 border-white/20 text-white"
          />
        )}

        <div className="flex items-center justify-between">
          <span className="text-white">Delivery Available</span>
          <Switch
            checked={details.delivery_available}
            onCheckedChange={(v) => updateDetails({ delivery_available: v })}
          />
        </div>

        {details.delivery_available && (
          <Input
            type="number"
            placeholder="Delivery Fee"
            value={details.delivery_fee}
            onChange={(e) => updateDetails({ delivery_fee: Number(e.target.value) })}
            className="bg-white/10 border-white/20 text-white"
          />
        )}

        <Input
          placeholder="Pickup Location"
          value={details.pickup_location}
          onChange={(e) => updateDetails({ pickup_location: e.target.value })}
          className="bg-white/10 border-white/20 text-white"
        />
      </Card>

      {/* Requirements */}
      <Card className="bg-white/5 border-white/10 p-4 space-y-3">
        <h4 className="text-white font-semibold">Renter Requirements</h4>
        
        <div className="flex flex-wrap gap-2 mb-2">
          {details.requirements?.map((req, i) => (
            <Badge key={i} className="bg-orange-500/20 text-orange-300">
              {req}
              <button onClick={() => removeRequirement(i)} className="ml-2">×</button>
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add requirement (e.g., Valid driver's license, Age 25+)"
            value={newRequirement}
            onChange={(e) => setNewRequirement(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
            className="bg-white/10 border-white/20 text-white flex-1"
          />
          <Button onClick={addRequirement} variant="outline" className="bg-white/5">
            Add
          </Button>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-white text-sm">Instant Confirmation</span>
          <Switch
            checked={details.instant_confirmation}
            onCheckedChange={(v) => updateDetails({ instant_confirmation: v })}
          />
        </div>
      </Card>
    </div>
  );
}