import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { CheckCircle, Loader2, Camera } from "lucide-react";

export default function DriverProfileModal({ open, onClose, currentUser }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    driver_profile_picture: currentUser?.driver_profile_picture || "",
    driver_vehicle_type: currentUser?.driver_vehicle_type || "standard",
    driver_vehicle_info: currentUser?.driver_vehicle_info || {
      make: currentUser?.driver_vehicle_make || "",
      model: currentUser?.driver_vehicle_model || "",
      year: currentUser?.driver_vehicle_year || new Date().getFullYear(),
      color: currentUser?.driver_vehicle_color || "",
      license_plate: currentUser?.driver_vehicle_plate || currentUser?.driver_license_plate || "",
    },
    driver_license_number: currentUser?.driver_license_number || "",
    driver_accepts_shared_rides: currentUser?.driver_accepts_shared_rides ?? true,
  });

  const set = (key, val) => setProfile(p => ({ ...p, [key]: val }));
  const setVehicle = (key, val) =>
    setProfile(p => ({ ...p, driver_vehicle_info: { ...p.driver_vehicle_info, [key]: val } }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("driver_profile_picture", file_url);
      toast.success("Photo uploaded!");
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.driver_vehicle_info.make || !profile.driver_vehicle_info.license_plate) {
      toast.error("Please fill in vehicle make and license plate");
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe(profile);
      toast.success("Driver profile saved!");
      onClose();
    } catch (err) {
      console.error("Profile update failed:", err);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Driver Profile</DialogTitle>
          <p className="text-gray-400 text-sm">Keep your info up to date so riders trust you</p>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* Profile Photo */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {profile.driver_profile_picture ? (
                <img
                  src={profile.driver_profile_picture}
                  alt="Driver"
                  className="w-20 h-20 rounded-full object-cover border-2 border-purple-500"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/20">
                  {currentUser?.full_name?.[0] || "D"}
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer border-2 border-gray-900 hover:bg-purple-700 transition">
                {uploading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
              <p className="text-white font-semibold">{currentUser?.full_name}</p>
              <p className="text-gray-400 text-sm">{currentUser?.email}</p>
              <p className="text-purple-400 text-xs mt-1">Tap the camera to update your photo</p>
            </div>
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="text-white font-medium mb-2 block">Vehicle Class</label>
            <Select value={profile.driver_vehicle_type} onValueChange={(val) => set("driver_vehicle_type", val)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard — Sedan / Compact</SelectItem>
                <SelectItem value="luxury">Luxury — Premium Vehicle</SelectItem>
                <SelectItem value="suv">SUV — Large Capacity</SelectItem>
                <SelectItem value="green">Green — Electric / Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Make + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Make *</label>
              <Input
                value={profile.driver_vehicle_info.make}
                onChange={(e) => setVehicle("make", e.target.value)}
                placeholder="Toyota"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Model</label>
              <Input
                value={profile.driver_vehicle_info.model}
                onChange={(e) => setVehicle("model", e.target.value)}
                placeholder="Camry"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Year + Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Year</label>
              <Input
                type="number"
                value={profile.driver_vehicle_info.year}
                onChange={(e) => setVehicle("year", parseInt(e.target.value) || "")}
                placeholder="2022"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Color</label>
              <Input
                value={profile.driver_vehicle_info.color}
                onChange={(e) => setVehicle("color", e.target.value)}
                placeholder="Black"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* License Plate */}
          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">License Plate *</label>
            <Input
              value={profile.driver_vehicle_info.license_plate}
              onChange={(e) => setVehicle("license_plate", e.target.value.toUpperCase())}
              placeholder="ABC1234"
              className="bg-white/10 border-white/20 text-white uppercase"
            />
          </div>

          {/* Driver's License */}
          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Driver's License Number</label>
            <Input
              value={profile.driver_license_number}
              onChange={(e) => set("driver_license_number", e.target.value)}
              placeholder="D1234567"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Shared Rides Toggle */}
          <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Accept Shared Rides</p>
              <p className="text-gray-400 text-sm">Earn more by accepting multiple passengers</p>
            </div>
            <Switch
              checked={profile.driver_accepts_shared_rides}
              onCheckedChange={(checked) => set("driver_accepts_shared_rides", checked)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button onClick={onClose} variant="outline" className="flex-1 bg-white/5 border-white/20 text-white">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-bold"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" /> Save Profile</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}