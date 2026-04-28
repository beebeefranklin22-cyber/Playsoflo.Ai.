import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import OrderTrackingMap from "./OrderTrackingMap";
import OrderTrackingDetails from "./OrderTrackingDetails";

export default function LiveOrderTracker({ orderId, orderType, onClose }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);

  // Fetch order details
  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ["order-details", orderId, orderType],
    queryFn: async () => {
      if (!orderId || !orderType) return null;
      
      const entityMap = {
        delivery: "DeliveryOrder",
        rental: "CarRental",
        service: "ServiceBooking",
        travel: "TravelBooking"
      };
      
      const entity = entityMap[orderType];
      if (!entity) return null;

      try {
        const items = await base44.entities[entity].list();
        return items.find(item => item.id === orderId);
      } catch (error) {
        console.error("Error fetching order:", error);
        return null;
      }
    },
    enabled: !!orderId && !!orderType,
    refetchInterval: 10000
  });

  // Fetch driver location (simulated or real-time)
  useEffect(() => {
    if (!order?.driver_email && !order?.driver_id) return;

    const interval = setInterval(() => {
      // Simulate driver location updates with slight randomness
      if (order?.driver_location) {
        setDriverLocation({
          lat: order.driver_location[0] + (Math.random() - 0.5) * 0.001,
          lng: order.driver_location[1] + (Math.random() - 0.5) * 0.001
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [order?.driver_location]);

  // Calculate estimated arrival
  useEffect(() => {
    if (!order?.estimated_duration_minutes && !order?.duration_hours) {
      setEstimatedArrival(null);
      return;
    }

    const duration = order.estimated_duration_minutes || (order.duration_hours * 60);
    const arrival = new Date(Date.now() + duration * 60000);
    
    const hours = arrival.getHours();
    const minutes = arrival.getMinutes().toString().padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    
    setEstimatedArrival(`${displayHours}:${minutes} ${period}`);
  }, [order?.estimated_duration_minutes, order?.duration_hours]);

  // Fetch driver info
  const { data: driver } = useQuery({
    queryKey: ["driver-info", order?.driver_email],
    queryFn: async () => {
      if (!order?.driver_email) return null;
      try {
        const users = await base44.entities.User.list();
        return users.find(u => u.email === order.driver_email);
      } catch {
        return null;
      }
    },
    enabled: !!order?.driver_email,
    refetchInterval: 30000
  });

  const handleCall = (phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast.error("Phone number not available");
    }
  };

  const handleMessage = (email) => {
    if (email) {
      // Navigate to messages or open chat
      toast.info("Opening chat with driver...");
    } else {
      toast.error("Email not available");
    }
  };

  if (loadingOrder) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
          <p className="text-sm">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Order Not Found</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Unable to load this order. Please check the order ID and try again.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-4xl h-[90vh] max-h-[90vh] mx-auto bg-gray-900 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
          <div>
            <h2 className="text-white font-bold text-lg">Live Order Tracking</h2>
            <p className="text-gray-400 text-xs">{orderType}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex gap-4 p-4">
          {/* Map */}
          <div className="flex-1 rounded-xl overflow-hidden">
            <OrderTrackingMap 
              order={order} 
              driverLocation={driverLocation || order?.driver_location ? { lat: order.driver_location[0], lng: order.driver_location[1] } : null}
              estimatedArrival={estimatedArrival}
            />
          </div>

          {/* Details Panel */}
          <div className="w-96 overflow-y-auto hide-scrollbar">
            <OrderTrackingDetails 
              order={order}
              driver={driver}
              estimatedArrival={estimatedArrival}
              onCall={handleCall}
              onMessage={handleMessage}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}