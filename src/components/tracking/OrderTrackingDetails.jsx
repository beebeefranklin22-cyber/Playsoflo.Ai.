import React from "react";
import { User, Phone, MapPin, Clock, Package, DollarSign, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderStatusBadge from "./OrderStatusBadge";

export default function OrderTrackingDetails({ order, driver, estimatedArrival, onMessage, onCall }) {
  const getOrderTitle = () => {
    if (order?.product_name) return order.product_name;
    if (order?.listing_title) return order.listing_title;
    if (order?.package_description) return order.package_description;
    return "Order";
  };

  return (
    <div className="space-y-4">
      {/* Order Summary */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-lg truncate">{getOrderTitle()}</h3>
            <p className="text-gray-400 text-sm">{order?.order_number || order?.id}</p>
          </div>
          {order?.total_amount && (
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-green-400 font-bold text-lg">${order.total_amount.toFixed(2)}</p>
            </div>
          )}
        </div>

        <OrderStatusBadge status={order?.status || "pending"} />
      </div>

      {/* Delivery/Pickup Details */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        {(order?.pickup_address || order?.delivery_address) && (
          <div className="flex gap-3">
            <MapPin className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-gray-400 text-xs mb-1">Delivery Address</p>
              <p className="text-white text-sm">{order?.delivery_address || order?.pickup_address}</p>
            </div>
          </div>
        )}

        {estimatedArrival && (
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-400 text-xs mb-1">Estimated Arrival</p>
              <p className="text-white text-sm font-semibold">{estimatedArrival}</p>
            </div>
          </div>
        )}

        {order?.fulfillment_method && (
          <div className="flex gap-3">
            <Package className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-400 text-xs mb-1">Delivery Method</p>
              <p className="text-white text-sm capitalize">{order.fulfillment_method.replace(/_/g, " ")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Driver Info */}
      {driver && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-gray-400 text-xs mb-3 uppercase font-semibold">Driver Information</p>
          
          <div className="flex items-start gap-3 mb-3">
            {driver.profile_picture ? (
              <img 
                src={driver.profile_picture} 
                alt={driver.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {driver.full_name?.[0] || "D"}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold">{driver.full_name}</p>
              {driver.rating && (
                <p className="text-yellow-400 text-sm">⭐ {driver.rating.toFixed(1)}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {driver.phone && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCall?.(driver.phone)}
                className="flex-1 bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
            )}
            {driver.email && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMessage?.(driver.email)}
                className="flex-1 bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}