import React from "react";
import { X, MapPin, Package, Truck, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function DeliveryTrackingModal({ delivery, currentUser, onClose }) {
  const trackingSteps = [
    { status: 'pending', label: 'Order Placed', icon: Package },
    { status: 'driver_assigned', label: 'Driver Assigned', icon: Truck },
    { status: 'picked_up', label: 'Package Picked Up', icon: Package },
    { status: 'in_transit', label: 'In Transit', icon: Truck },
    { status: 'delivered', label: 'Delivered', icon: CheckCircle }
  ];

  const currentStepIndex = trackingSteps.findIndex(s => s.status === delivery.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-gray-900 rounded-3xl border border-white/10 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 border-b border-white/10 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Track Delivery</h2>
              <p className="text-blue-100">Order #{delivery.order_number?.substring(0, 8).toUpperCase()}</p>
              {delivery.recipient_email === currentUser.email && (
                <p className="text-blue-200 text-sm mt-1">📦 Package coming to you</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress Tracker */}
          <div className="relative">
            <div className="flex justify-between mb-8">
              {trackingSteps.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step.status} className="flex flex-col items-center flex-1 relative">
                    {index < trackingSteps.length - 1 && (
                      <div className={`absolute top-5 left-1/2 w-full h-1 ${
                        isCompleted ? 'bg-blue-500' : 'bg-gray-600'
                      }`} style={{ zIndex: 0 }} />
                    )}
                    
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 relative z-10 ${
                      isCurrent ? 'bg-blue-600 ring-4 ring-blue-500/30' :
                      isCompleted ? 'bg-green-600' : 'bg-gray-600'
                    }`}>
                      <StepIcon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-xs text-center ${
                      isCurrent ? 'text-blue-400 font-bold' :
                      isCompleted ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" />
                Pickup
              </h3>
              <p className="text-gray-300 text-sm mb-2">{delivery.pickup_address}</p>
              <p className="text-gray-400 text-xs">{delivery.sender_name}</p>
              <p className="text-gray-400 text-xs">{delivery.sender_phone}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-400" />
                Delivery
              </h3>
              <p className="text-gray-300 text-sm mb-2">{delivery.delivery_address}</p>
              <p className="text-gray-400 text-xs">{delivery.recipient_name}</p>
              <p className="text-gray-400 text-xs">{delivery.recipient_phone}</p>
            </div>
          </div>

          {/* Package Info */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-white font-bold mb-3">Package Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Type</p>
                <p className="text-white capitalize">{delivery.package_type.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-gray-400">Description</p>
                <p className="text-white">{delivery.package_description || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400">Weight</p>
                <p className="text-white">{delivery.package_weight} lbs</p>
              </div>
              <div>
                <p className="text-gray-400">Distance</p>
                <p className="text-white">{delivery.distance_miles} miles</p>
              </div>
            </div>
          </div>

          {/* Tracking History */}
          {delivery.tracking_updates && delivery.tracking_updates.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Tracking History
              </h3>
              <div className="space-y-3">
                {delivery.tracking_updates.map((update, index) => (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b border-white/10 last:border-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{update.message}</p>
                      <p className="text-gray-400 text-xs">
                        {new Date(update.timestamp).toLocaleString()}
                      </p>
                      {update.location && (
                        <p className="text-gray-500 text-xs mt-1">{update.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Summary */}
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Paid</p>
                <p className="text-white text-2xl font-bold">${delivery.total_price?.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 text-sm font-semibold">35% Cheaper</p>
                <p className="text-gray-400 text-xs">than Uber</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}