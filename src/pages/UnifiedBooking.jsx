import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

// This used to also render a cart + UnifiedCheckoutModal, but nothing ever
// populated that cart (none of the real per-service pages wired into it),
// and the checkout modal itself was entirely fake -- it faked a
// confirmation_id via an LLM call and inserted "confirmed" rows directly
// into Experience/RideRequest/CarRental/FoodOrder with no real charge and
// no provider ever credited. Every one of those service types already has
// its own real, working booking + payment flow, so this page is just the
// menu into them.
const SERVICE_TYPES = [
  {
    id: "experience",
    label: "Experience",
    icon: "🎯",
    description: "Book events, tours, activities",
    color: "from-yellow-500 to-orange-500",
    path: "/explore",
  },
  {
    id: "travel",
    label: "Travel",
    icon: "✈️",
    description: "Hail rides and transport",
    color: "from-blue-500 to-cyan-500",
    path: "/Travel",
  },
  {
    id: "car_rental",
    label: "Car Rental",
    icon: "🚗",
    description: "Rent luxury vehicles",
    color: "from-red-500 to-pink-500",
    path: "/CarRentals",
  },
  {
    id: "food_order",
    label: "Food Order",
    icon: "🍔",
    description: "Order from restaurants",
    color: "from-green-500 to-emerald-500",
    path: "/FoodDelivery",
  }
];

export default function UnifiedBooking() {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("User not authenticated:", error);
      }
    };
    fetchUser();
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-16 z-20 glass-effect border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            Book a Service
          </h1>
          <p className="text-gray-400">Pick a category to browse and book</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-4">
          {SERVICE_TYPES.map((service) => (
            <motion.button
              key={service.id}
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate(service.path)}
              className={`relative p-6 rounded-2xl bg-gradient-to-br ${service.color} text-white overflow-hidden group transition`}
            >
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition" />
              <div className="relative z-10">
                <div className="text-4xl mb-2">{service.icon}</div>
                <h3 className="font-bold text-lg">{service.label}</h3>
                <p className="text-sm opacity-90">{service.description}</p>
                <div className="mt-3 flex items-center gap-1 text-sm font-semibold">
                  Browse <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
