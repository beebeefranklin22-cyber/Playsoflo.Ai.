import React from "react";
import { AlertCircle, CheckCircle2, Clock, Truck, MapPin } from "lucide-react";

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "bg-yellow-500/20 text-yellow-400", label: "Pending" },
  confirmed: { icon: Clock, color: "bg-blue-500/20 text-blue-400", label: "Confirmed" },
  processing: { icon: Truck, color: "bg-blue-500/20 text-blue-400", label: "Processing" },
  ready_for_pickup: { icon: MapPin, color: "bg-purple-500/20 text-purple-400", label: "Ready for Pickup" },
  en_route_pickup: { icon: Truck, color: "bg-orange-500/20 text-orange-400", label: "En Route to Pickup" },
  picked_up: { icon: Truck, color: "bg-blue-500/20 text-blue-400", label: "Picked Up" },
  in_transit: { icon: Truck, color: "bg-blue-500/20 text-blue-400", label: "In Transit" },
  out_for_delivery: { icon: Truck, color: "bg-green-500/20 text-green-400", label: "Out for Delivery" },
  delivered: { icon: CheckCircle2, color: "bg-green-500/20 text-green-400", label: "Delivered" },
  cancelled: { icon: AlertCircle, color: "bg-red-500/20 text-red-400", label: "Cancelled" },
  failed: { icon: AlertCircle, color: "bg-red-500/20 text-red-400", label: "Failed" },
  refunded: { icon: AlertCircle, color: "bg-gray-500/20 text-gray-400", label: "Refunded" },
};

export default function OrderStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-semibold">{config.label}</span>
    </div>
  );
}