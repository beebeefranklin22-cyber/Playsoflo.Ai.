import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Package, Truck, CheckCircle, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function OrderTrackingModal({ order, onClose }) {
  const [trackingDetails, setTrackingDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order.tracking_number) {
      fetchTrackingDetails();
    }
  }, [order.id]);

  const fetchTrackingDetails = async () => {
    setLoading(true);
    try {
      // Mock tracking details - in production, integrate with shipping API
      setTrackingDetails({
        current_location: order.shipping_address?.city || 'In Transit',
        estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        events: [
          { date: new Date(), status: 'Order placed', location: 'Online' },
          { date: new Date(Date.now() - 1 * 60 * 60 * 1000), status: 'Confirmed', location: 'Processing Center' }
        ]
      });
    } catch (error) {
      console.error('Tracking error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'processing':
      case 'shipped':
        return <Truck className="w-5 h-5 text-blue-400" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <Package className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl border border-white/10 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Track Your Order</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-start gap-4">
              <img 
                src={order.item_image || "https://images.unsplash.com/photo-1558769132-cb1aea3cd7b1?w=200"} 
                alt={order.item_name}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h3 className="text-white font-bold mb-1">{order.item_name}</h3>
                <div className="flex items-center gap-2 text-sm">
                  {getStatusIcon(order.status)}
                  <span className="text-gray-300 capitalize">{order.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  Quantity: {order.quantity} • Total: ${order.total_amount?.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Tracking Number */}
          {order.tracking_number && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-400 font-semibold mb-1">Tracking Number</p>
              <p className="text-white font-mono text-lg">{order.tracking_number}</p>
              {order.carrier && (
                <p className="text-gray-400 text-sm mt-1">Carrier: {order.carrier}</p>
              )}
            </div>
          )}

          {/* Delivery Address */}
          {order.shipping_address && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-bold">Delivery Address</h3>
              </div>
              <div className="text-gray-300 text-sm space-y-1">
                <p>{order.shipping_address.name}</p>
                <p>{order.shipping_address.line1}</p>
                {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                </p>
              </div>
            </div>
          )}

          {/* Tracking Timeline */}
          {trackingDetails && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-white font-bold mb-4">Tracking History</h3>
              <div className="space-y-4">
                {trackingDetails.events.map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-3 h-3 bg-purple-400 rounded-full" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{event.status}</p>
                      <p className="text-gray-400 text-sm">{event.location}</p>
                      <p className="text-gray-500 text-xs">{new Date(event.date).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {order.tracking_url && (
              <Button
                onClick={() => window.open(order.tracking_url, '_blank')}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                View on Carrier Site
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-white/5 border-white/10"
            >
              Close
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}