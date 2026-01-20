import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Car, Crown, Gauge, Leaf } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function DriverProfileSetup({ currentUser, onComplete }) {
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState({
    driver_profile_picture: currentUser?.driver_profile_picture || "",
    driver_vehicle_type: currentUser?.driver_vehicle_type || "standard",
    driver_vehicle_info: currentUser?.driver_vehicle_info || {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      license_plate: ""
    }
  });

  const vehicleIcons = {
    standard: Car,
    luxury: Crown,
    suv: Gauge,
    green: Leaf
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileData({ ...profileData, driver_profile_picture: file_url });
      toast.success("Profile picture uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profileData.driver_profile_picture) {
      toast.error("Please upload a driver profile picture");
      return;
    }

    if (!profileData.driver_vehicle_info.make || !profileData.driver_vehicle_info.license_plate) {
      toast.error("Please fill in vehicle details");
      return;
    }

    try {
      await base44.auth.updateMe(profileData);
      toast.success("Driver profile updated!");
      if (onComplete) onComplete();
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Driver Profile Picture</CardTitle>
          <p className="text-gray-400 text-sm">
            This photo will be shown to riders for safety and identification
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="relative">
              {profileData.driver_profile_picture ? (
                <img
                  src={profileData.driver_profile_picture}
                  alt="Driver"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-white/20">
                  {currentUser?.full_name?.[0] || "D"}
                </div>
              )}
              <button
                onClick={() => document.getElementById('driver-photo-upload').click()}
                className="absolute bottom-0 right-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center border-2 border-white hover:bg-purple-700 transition"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
              <input
                id="driver-photo-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files?.[0])}
                className="hidden"
              />
            </div>

            <div className="flex-1">
              <h4 className="text-white font-semibold mb-2">Profile Photo Guidelines</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>✓ Clear, front-facing photo</li>
                <li>✓ Good lighting, no sunglasses</li>
                <li>✓ Recent photo (within 6 months)</li>
                <li>✓ Professional appearance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Vehicle Type</label>
            <Select
              value={profileData.driver_vehicle_type}
              onValueChange={(v) => setProfileData({ ...profileData, driver_vehicle_type: v })}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Standard - Sedan/Compact
                  </div>
                </SelectItem>
                <SelectItem value="luxury">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Luxury - Premium vehicles
                  </div>
                </SelectItem>
                <SelectItem value="suv">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    SUV - Large capacity
                  </div>
                </SelectItem>
                <SelectItem value="green">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    Green - Electric/Hybrid
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Make</label>
              <Input
                value={profileData.driver_vehicle_info.make}
                onChange={(e) => setProfileData({
                  ...profileData,
                  driver_vehicle_info: { ...profileData.driver_vehicle_info, make: e.target.value }
                })}
                placeholder="Toyota"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Model</label>
              <Input
                value={profileData.driver_vehicle_info.model}
                onChange={(e) => setProfileData({
                  ...profileData,
                  driver_vehicle_info: { ...profileData.driver_vehicle_info, model: e.target.value }
                })}
                placeholder="Camry"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Year</label>
              <Input
                type="number"
                value={profileData.driver_vehicle_info.year}
                onChange={(e) => setProfileData({
                  ...profileData,
                  driver_vehicle_info: { ...profileData.driver_vehicle_info, year: parseInt(e.target.value) }
                })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Color</label>
              <Input
                value={profileData.driver_vehicle_info.color}
                onChange={(e) => setProfileData({
                  ...profileData,
                  driver_vehicle_info: { ...profileData.driver_vehicle_info, color: e.target.value }
                })}
                placeholder="Black"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">License Plate</label>
            <Input
              value={profileData.driver_vehicle_info.license_plate}
              onChange={(e) => setProfileData({
                ...profileData,
                driver_vehicle_info: { ...profileData.driver_vehicle_info, license_plate: e.target.value.toUpperCase() }
              })}
              placeholder="ABC1234"
              className="bg-white/10 border-white/20 text-white uppercase"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={uploading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg"
          >
            {uploading ? "Uploading..." : "Save Driver Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}