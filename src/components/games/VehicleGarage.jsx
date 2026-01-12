import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Check, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function VehicleGarage({ currentUser, onClose }) {
  const queryClient = useQueryClient();

  const { data: myVehicles = [] } = useQuery({
    queryKey: ['my-vehicles', currentUser?.email],
    queryFn: async () => {
      const vehicles = await base44.entities.UserVehicle.filter({
        user_email: currentUser.email
      });
      return vehicles;
    },
    enabled: !!currentUser
  });

  const availableVehicles = [
    { name: "Starter Sedan", type: "car", topSpeed: 120, acceleration: 5, handling: 7, color: "#3b82f6", price: 0 },
    { name: "Sport Coupe", type: "sports_car", topSpeed: 180, acceleration: 9, handling: 8, color: "#ef4444", price: 5000 },
    { name: "Luxury Sedan", type: "luxury", topSpeed: 150, acceleration: 7, handling: 9, color: "#000000", price: 8000 },
    { name: "Street Motorcycle", type: "motorcycle", topSpeed: 200, acceleration: 10, handling: 7, color: "#8b5cf6", price: 3000 },
    { name: "Dirt Bike", type: "dirt_bike", topSpeed: 140, acceleration: 8, handling: 6, color: "#f59e0b", price: 2500 },
    { name: "Snowmobile", type: "snowmobile", topSpeed: 130, acceleration: 7, handling: 5, color: "#06b6d4", price: 4000 },
    { name: "Big Rig", type: "18_wheeler", topSpeed: 100, acceleration: 3, handling: 4, color: "#dc2626", price: 10000 },
    { name: "Exotic Supercar", type: "exotic", topSpeed: 220, acceleration: 10, handling: 9, color: "#fbbf24", price: 20000 },
    { name: "SUV", type: "suv", topSpeed: 140, acceleration: 6, handling: 7, color: "#10b981", price: 6000 },
    { name: "Police Interceptor", type: "car", topSpeed: 170, acceleration: 8, handling: 8, color: "#1e293b", price: 7500 }
  ];

  const purchaseVehicle = useMutation({
    mutationFn: async (vehicle) => {
      await base44.entities.UserVehicle.create({
        user_email: currentUser.email,
        vehicle_name: vehicle.name,
        vehicle_type: vehicle.type,
        top_speed: vehicle.topSpeed,
        acceleration: vehicle.acceleration,
        handling: vehicle.handling,
        color: vehicle.color,
        price: vehicle.price,
        is_unlocked: true,
        is_equipped: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vehicles']);
      toast.success('Vehicle purchased! 🚗');
    }
  });

  const equipVehicle = useMutation({
    mutationFn: async (vehicleId) => {
      // Unequip all
      for (const v of myVehicles) {
        await base44.entities.UserVehicle.update(v.id, { is_equipped: false });
      }
      // Equip selected
      await base44.entities.UserVehicle.update(vehicleId, { is_equipped: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vehicles']);
      toast.success('Vehicle equipped! ✨');
    }
  });

  const isOwned = (vehicleName) => {
    return myVehicles.some(v => v.vehicle_name === vehicleName);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 max-w-6xl w-full max-h-[90vh] overflow-auto border-2 border-cyan-500/30"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">Vehicle Garage</h2>
            <p className="text-gray-400">Unlock and equip vehicles</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-3">My Vehicles</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {myVehicles.map(vehicle => (
              <div key={vehicle.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-semibold">{vehicle.vehicle_name}</h4>
                  {vehicle.is_equipped && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Equipped</span>
                  )}
                </div>
                <div 
                  className="w-full h-20 rounded-lg mb-3" 
                  style={{ backgroundColor: vehicle.color }}
                />
                <div className="space-y-1 text-sm text-gray-400 mb-3">
                  <div>Top Speed: {vehicle.top_speed}mph</div>
                  <div>Acceleration: {vehicle.acceleration}/10</div>
                  <div>Handling: {vehicle.handling}/10</div>
                  <div>Distance: {Math.floor(vehicle.total_distance || 0)}mi</div>
                </div>
                {!vehicle.is_equipped && (
                  <Button
                    size="sm"
                    onClick={() => equipVehicle.mutate(vehicle.id)}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    Equip
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-white mb-3">Available Vehicles</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {availableVehicles.map(vehicle => {
              const owned = isOwned(vehicle.name);
              return (
                <div key={vehicle.name} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-semibold">{vehicle.name}</h4>
                    {vehicle.price === 0 && <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Free</span>}
                  </div>
                  <div 
                    className="w-full h-20 rounded-lg mb-3" 
                    style={{ backgroundColor: vehicle.color }}
                  />
                  <div className="space-y-1 text-sm text-gray-400 mb-3">
                    <div className="capitalize">Type: {vehicle.type.replace('_', ' ')}</div>
                    <div>Top Speed: {vehicle.topSpeed}mph</div>
                    <div>Acceleration: {vehicle.acceleration}/10</div>
                    <div>Handling: {vehicle.handling}/10</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold">${vehicle.price}</span>
                    {owned ? (
                      <Button size="sm" disabled className="bg-gray-600">
                        <Check className="w-4 h-4 mr-1" />
                        Owned
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => purchaseVehicle.mutate(vehicle)}
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        Buy
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}