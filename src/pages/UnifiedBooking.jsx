import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import UnifiedCartManager from "../components/booking/UnifiedCartManager";
import UnifiedCheckoutModal from "../components/booking/UnifiedCheckoutModal";

const SERVICE_TYPES = [
  {
    id: "experience",
    label: "Experience",
    icon: "🎯",
    description: "Book events, tours, activities",
    color: "from-yellow-500 to-orange-500"
  },
  {
    id: "travel",
    label: "Travel",
    icon: "✈️",
    description: "Hail rides and transport",
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "car_rental",
    label: "Car Rental",
    icon: "🚗",
    description: "Rent luxury vehicles",
    color: "from-red-500 to-pink-500"
  },
  {
    id: "food_order",
    label: "Food Order",
    icon: "🍔",
    description: "Order from restaurants",
    color: "from-green-500 to-emerald-500"
  }
];

export default function UnifiedBooking() {
  const [currentUser, setCurrentUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
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

  const handleAddService = (serviceType) => {
    setSelectedService(serviceType);
    // Redirect to specific service booking page
    if (serviceType === "experience") navigate("/explore");
    else if (serviceType === "travel") navigate("/Travel");
    else if (serviceType === "car_rental") navigate("/CarRentals");
    else if (serviceType === "food_order") navigate("/FoodDelivery");
  };

  const handleCheckout = async (items, total) => {
    setShowCheckout(true);
  };

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
            Unified Booking
          </h1>
          <p className="text-gray-400">Combine multiple services into one seamless checkout</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Service Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-white font-bold text-xl mb-4">Add Services to Your Booking</h2>
              <div className="grid grid-cols-2 gap-4">
                {SERVICE_TYPES.map((service) => (
                  <motion.button
                    key={service.id}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleAddService(service.id)}
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

            {/* How It Works */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-bold">How Unified Booking Works</h3>
              <div className="space-y-3">
                {[
                  { num: 1, title: "Browse & Add", desc: "Click on any service type to browse and add items" },
                  { num: 2, title: "Smart Bundles", desc: "AI suggests combinations that save you money" },
                  { num: 3, title: "One Checkout", desc: "Pay once for all your services" },
                  { num: 4, title: "Seamless Experience", desc: "All confirmations and tracking in one place" }
                ].map((step) => (
                  <div key={step.num} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                      {step.num}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{step.title}</p>
                      <p className="text-gray-400 text-sm">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Cart */}
          <div className="lg:col-span-1">
            <div className="sticky top-32">
              {currentUser && (
                <UnifiedCartManager
                  currentUser={currentUser}
                  onCheckout={handleCheckout}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && currentUser && (
        <UnifiedCheckoutModal
          items={cart}
          total={cart.reduce((sum, item) => sum + item.price, 0) * 1.05}
          currentUser={currentUser}
          onClose={() => setShowCheckout(false)}
          onSuccess={(confirmationId) => {
            setCart([]);
            navigate(`/MyBookings?confirmation=${confirmationId}`);
          }}
        />
      )}
    </div>
  );
}