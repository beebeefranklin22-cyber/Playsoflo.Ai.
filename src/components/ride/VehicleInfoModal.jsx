import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Car, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function VehicleInfoModal({ isOpen, onClose, currentUser, onUpdate }) {
  const [vehicleInfo, setVehicleInfo] = useState({
    make: currentUser?.driver_vehicle_info?.make || "",
    model: currentUser?.driver_vehicle_info?.model || "",
    year: currentUser?.driver_vehicle_info?.year || new Date().getFullYear(),
    color: currentUser?.driver_vehicle_info?.color || "",
    license_plate: currentUser?.driver_vehicle_info?.license_plate || "",
    vehicle_type: currentUser?.driver_vehicle_info?.vehicle_type || "sedan"
  });

  const updateMutation = useMutation({
    mutationFn: () => base44.auth.updateMe({ driver_vehicle_info: vehicleInfo }),
    onSuccess: () => {
      toast.success('Vehicle info updated!');
      onUpdate?.();
      onClose();
    }
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-2xl"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-400" />
            Vehicle Information
          </h3>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <Label className="text-gray-400 mb-2 block">Make</Label>
            <Input
              value={vehicleInfo.make}
              onChange={(e) => setVehicleInfo(prev => ({ ...prev, make: e.target.value }))}
              placeholder="e.g. Toyota, Tesla"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-400 mb-2 block">Model</Label>
            <Input
              value={vehicleInfo.model}
              onChange={(e) => setVehicleInfo(prev => ({ ...prev, model: e.target.value }))}
              placeholder="e.g. Camry, Model 3"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-400 mb-2 block">Year</Label>
            <Input
              type="number"
              value={vehicleInfo.year}
              onChange={(e) => setVehicleInfo(prev => ({ ...prev, year: parseInt(e.target.value) }))}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-400 mb-2 block">Color</Label>
            <Input
              value={vehicleInfo.color}
              onChange={(e) => setVehicleInfo(prev => ({ ...prev, color: e.target.value }))}
              placeholder="e.g. Black, White"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-400 mb-2 block">License Plate</Label>
            <Input
              value={vehicleInfo.license_plate}
              onChange={(e) => setVehicleInfo(prev => ({ ...prev, license_plate: e.target.value.toUpperCase() }))}
              placeholder="e.g. ABC1234"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-400 mb-2 block">Vehicle Type</Label>
            <Select 
              value={vehicleInfo.vehicle_type} 
              onValueChange={(v) => setVehicleInfo(prev => ({ ...prev, vehicle_type: v }))}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedan">Sedan</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
                <SelectItem value="electric">Electric</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !vehicleInfo.make || !vehicleInfo.model}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Save Vehicle Info
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}