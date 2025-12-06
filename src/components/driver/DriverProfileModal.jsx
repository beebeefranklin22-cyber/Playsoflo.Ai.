import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";

export default function DriverProfileModal({ open, onClose, currentUser }) {
  const [profile, setProfile] = useState({
    vehicle_type: currentUser?.driver_vehicle_type || "car",
    vehicle_make: currentUser?.driver_vehicle_make || "",
    vehicle_model: currentUser?.driver_vehicle_model || "",
    vehicle_year: currentUser?.driver_vehicle_year || "",
    vehicle_color: currentUser?.driver_vehicle_color || "",
    vehicle_plate: currentUser?.driver_vehicle_plate || "",
    license_number: currentUser?.driver_license_number || "",
    available_ride_types: currentUser?.driver_available_ride_types || ["car"],
    accepts_shared_rides: currentUser?.driver_accepts_shared_rides || true
  });

  const handleSave = async () => {
    try {
      await base44.auth.updateMe(profile);
      alert("Profile updated successfully!");
      onClose();
    } catch (err) {
      console.error("Profile update failed:", err);
      alert("Failed to update profile");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Driver Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <label className="text-white font-medium mb-3 block">Vehicle Type</label>
            <Select value={profile.vehicle_type} onValueChange={(val) => setProfile({...profile, vehicle_type: val})}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="scooter">Scooter</SelectItem>
                <SelectItem value="ebike">E-Bike</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Make</label>
              <Input
                value={profile.vehicle_make}
                onChange={(e) => setProfile({...profile, vehicle_make: e.target.value})}
                placeholder="Toyota"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Model</label>
              <Input
                value={profile.vehicle_model}
                onChange={(e) => setProfile({...profile, vehicle_model: e.target.value})}
                placeholder="Camry"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Year</label>
              <Input
                value={profile.vehicle_year}
                onChange={(e) => setProfile({...profile, vehicle_year: e.target.value})}
                placeholder="2022"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Color</label>
              <Input
                value={profile.vehicle_color}
                onChange={(e) => setProfile({...profile, vehicle_color: e.target.value})}
                placeholder="Black"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">License Plate</label>
            <Input
              value={profile.vehicle_plate}
              onChange={(e) => setProfile({...profile, vehicle_plate: e.target.value})}
              placeholder="ABC-1234"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Driver's License Number</label>
            <Input
              value={profile.license_number}
              onChange={(e) => setProfile({...profile, license_number: e.target.value})}
              placeholder="D1234567"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Accept Shared Rides</div>
                <div className="text-gray-400 text-sm">Increase earnings potential</div>
              </div>
              <Switch
                checked={profile.accepts_shared_rides}
                onCheckedChange={(checked) => setProfile({...profile, accepts_shared_rides: checked})}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="flex-1 bg-white/5">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700">
              Save Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}