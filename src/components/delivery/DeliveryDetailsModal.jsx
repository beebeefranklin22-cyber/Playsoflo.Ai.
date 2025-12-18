import React from "react";
import { X, Package, MapPin, DollarSign, Clock, User, Phone, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function DeliveryDetailsModal({ delivery, onClose }) {
  if (!delivery) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl border border-white/10 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 border-b border-white/10 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Package className="w-6 h-6" />
                Delivery Details
              </h2>
              <p className="text-blue-100 text-sm">Order #{delivery.order_number}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Sender Info */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-green-400" />
              Sender
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name</span>
                <span className="text-white">{delivery.sender_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phone</span>
                <span className="text-white">{delivery.sender_phone}</span>
              </div>
              {delivery.sender_email && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Email</span>
                  <span className="text-white">{delivery.sender_email}</span>
                </div>
              )}
              <div className="flex items-start justify-between mt-3 pt-3 border-t border-white/10">
                <span className="text-gray-400">Pickup</span>
                <span className="text-white text-right max-w-[60%]">{delivery.pickup_address}</span>
              </div>
            </div>
          </div>

          {/* Recipient Info */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-red-400" />
              Recipient
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name</span>
                <span className="text-white">{delivery.recipient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phone</span>
                <span className="text-white">{delivery.recipient_phone}</span>
              </div>
              {delivery.recipient_email && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Email</span>
                  <span className="text-white">{delivery.recipient_email}</span>
                </div>
              )}
              <div className="flex items-start justify-between mt-3 pt-3 border-t border-white/10">
                <span className="text-gray-400">Delivery</span>
                <span className="text-white text-right max-w-[60%]">{delivery.delivery_address}</span>
              </div>
            </div>
          </div>

          {/* Package Info */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              Package
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className="text-white capitalize">{delivery.package_type?.replace('_', ' ')}</span>
              </div>
              {delivery.package_weight && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Weight</span>
                  <span className="text-white">{delivery.package_weight} lbs</span>
                </div>
              )}
              {delivery.package_description && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Contents</span>
                  <span className="text-white">{delivery.package_description}</span>
                </div>
              )}
              {delivery.package_value && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Declared Value</span>
                  <span className="text-white">${delivery.package_value}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Details */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Delivery Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className="text-white capitalize">{delivery.delivery_type?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Urgency</span>
                <span className="text-white capitalize">{delivery.urgency_level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Distance</span>
                <span className="text-white">{delivery.distance_miles} miles</span>
              </div>
              {delivery.estimated_duration_minutes && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Est. Duration</span>
                  <span className="text-white">{delivery.estimated_duration_minutes} min</span>
                </div>
              )}
              {delivery.special_instructions && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-gray-400 mb-1">Special Instructions</p>
                  <p className="text-white">{delivery.special_instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Pricing
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Base Price</span>
                <span>${delivery.base_price?.toFixed(2)}</span>
              </div>
              {delivery.urgency_surcharge > 0 && (
                <div className="flex justify-between text-gray-300">
                  <span>Urgency Fee</span>
                  <span>${delivery.urgency_surcharge?.toFixed(2)}</span>
                </div>
              )}
              {delivery.weight_surcharge > 0 && (
                <div className="flex justify-between text-gray-300">
                  <span>Weight Surcharge</span>
                  <span>${delivery.weight_surcharge?.toFixed(2)}</span>
                </div>
              )}
              {delivery.insurance_fee > 0 && (
                <div className="flex justify-between text-gray-300">
                  <span>Insurance</span>
                  <span>${delivery.insurance_fee?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-300">
                <span>Platform Fee</span>
                <span>${delivery.platform_fee?.toFixed(2)}</span>
              </div>
              {delivery.tip_amount > 0 && (
                <div className="flex justify-between text-green-400 font-semibold">
                  <span>Tip</span>
                  <span>${delivery.tip_amount?.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-white/20 pt-2 mt-2">
                <div className="flex justify-between text-white font-bold text-lg">
                  <span>Total</span>
                  <span>${(delivery.total_price + (delivery.tip_amount || 0))?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={onClose} className="w-full">Close</Button>
        </div>
      </motion.div>
    </div>
  );
}