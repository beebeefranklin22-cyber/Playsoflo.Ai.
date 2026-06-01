import React from "react";
import { Car, Package } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Lets drivers pick between ride-hailing and delivery mode.
 * The selected mode controls which requests the app surfaces.
 */
export default function DriverModeSelector({ mode, onChange, disabled }) {
  const modes = [
    {
      id: "rides",
      label: "Ride Hailing",
      icon: Car,
      description: "Pick up & drop off passengers",
      color: "from-blue-600/30 to-blue-800/20 border-blue-500/40",
      activeColor: "from-blue-600 to-blue-700 border-blue-400",
      iconColor: "text-blue-300",
      activeIconColor: "text-white",
    },
    {
      id: "delivery",
      label: "Delivery",
      icon: Package,
      description: "Deliver packages & food orders",
      color: "from-orange-600/30 to-orange-800/20 border-orange-500/40",
      activeColor: "from-orange-500 to-orange-600 border-orange-400",
      iconColor: "text-orange-300",
      activeIconColor: "text-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {modes.map((m) => {
        const isActive = mode === m.id;
        const Icon = m.icon;
        return (
          <motion.button
            key={m.id}
            whileTap={{ scale: 0.97 }}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={`relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 text-left
              ${isActive
                ? `bg-gradient-to-br ${m.activeColor} shadow-lg`
                : `bg-gradient-to-br ${m.color} hover:brightness-110`
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {isActive && (
              <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-white rounded-full shadow-md" />
            )}
            <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${isActive ? m.activeIconColor : m.iconColor}`} />
            <div className="text-center">
              <div className={`font-bold text-sm sm:text-base ${isActive ? "text-white" : "text-gray-200"}`}>
                {m.label}
              </div>
              <div className={`text-xs mt-0.5 leading-tight hidden sm:block ${isActive ? "text-white/80" : "text-gray-400"}`}>
                {m.description}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}