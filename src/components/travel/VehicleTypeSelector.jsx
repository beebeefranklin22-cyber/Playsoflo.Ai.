import React from "react";
import { motion } from "framer-motion";
import { Car, Crown, Users, Leaf, Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";

const vehicleTypes = [
  {
    id: "standard",
    name: "Standard",
    description: "Affordable rides for everyday travel",
    icon: Car,
    capacity: "1-4 riders",
    basePrice: 3.0,
    pricePerMile: 1.2,
    pricePerMinute: 0.25,
    color: "from-blue-500 to-cyan-500",
    eta: "2-5 min"
  },
  {
    id: "luxury",
    name: "Luxury",
    description: "High-end vehicles for premium comfort",
    icon: Crown,
    capacity: "1-4 riders",
    basePrice: 8.0,
    pricePerMile: 2.5,
    pricePerMinute: 0.50,
    color: "from-purple-500 to-pink-500",
    eta: "5-10 min"
  },
  {
    id: "suv",
    name: "SUV",
    description: "Extra space for groups and luggage",
    icon: Gauge,
    capacity: "1-6 riders",
    basePrice: 6.0,
    pricePerMile: 1.8,
    pricePerMinute: 0.40,
    color: "from-orange-500 to-red-500",
    eta: "5-8 min"
  },
  {
    id: "shared",
    name: "Shared",
    description: "Save money by sharing with others",
    icon: Users,
    capacity: "1-2 riders",
    basePrice: 2.0,
    pricePerMile: 0.8,
    pricePerMinute: 0.15,
    color: "from-green-500 to-emerald-500",
    eta: "5-10 min",
    discount: "Up to 50% off"
  },
  {
    id: "green",
    name: "Green",
    description: "Eco-friendly electric & hybrid vehicles",
    icon: Leaf,
    capacity: "1-4 riders",
    basePrice: 3.5,
    pricePerMile: 1.3,
    pricePerMinute: 0.28,
    color: "from-teal-500 to-green-500",
    eta: "3-7 min"
  }
];

export default function VehicleTypeSelector({ selectedType, onSelect, estimatedDistance = 5, estimatedDuration = 15 }) {
  const calculateEstimate = (vehicle) => {
    const baseFare = vehicle.basePrice;
    const distanceFare = vehicle.pricePerMile * estimatedDistance;
    const timeFare = vehicle.pricePerMinute * estimatedDuration;
    return (baseFare + distanceFare + timeFare).toFixed(2);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-white font-bold text-lg mb-4">Choose your ride</h3>
      {vehicleTypes.map((vehicle) => {
        const isSelected = selectedType === vehicle.id;
        const estimate = calculateEstimate(vehicle);
        
        return (
          <motion.div
            key={vehicle.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              onClick={() => onSelect(vehicle)}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'bg-white/20 border-white/40 shadow-lg'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="p-4 flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${vehicle.color} flex items-center justify-center flex-shrink-0`}>
                  <vehicle.icon className="w-7 h-7 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-bold text-base">{vehicle.name}</h4>
                    <span className="text-xs text-gray-400">{vehicle.eta}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-1">{vehicle.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{vehicle.capacity}</span>
                    {vehicle.discount && (
                      <span className="text-green-400 font-semibold">{vehicle.discount}</span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-white font-bold text-xl">${estimate}</div>
                  <div className="text-gray-400 text-xs">estimated</div>
                </div>
              </div>

              {isSelected && (
                <div className="px-4 pb-3 border-t border-white/10 pt-3 mt-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Base</span>
                      <div className="text-white font-semibold">${vehicle.basePrice}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Per mile</span>
                      <div className="text-white font-semibold">${vehicle.pricePerMile}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Per min</span>
                      <div className="text-white font-semibold">${vehicle.pricePerMinute}</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

export { vehicleTypes };