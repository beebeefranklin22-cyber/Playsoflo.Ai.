import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Truck, MapPin, Bell, CheckCircle, Clock,
  Search, RefreshCw, ExternalLink, User, ShoppingBag
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  pending:          "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed:        "bg-blue-500/20 text-blue-400 border-blue-500/30",
  processing:       "bg-purple-500/20 text-purple-400 border-purple-500/30",
  ready_for_pickup: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  shipped:          "bg-blue-500/20 text-blue-400 border-blue-500/30",
  out_for_delivery: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  delivered:        "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled:        "bg-red-500/20 text-red-400 border-red-500/30",
  refunded:         "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const FULFILLMENT_ICON = {
  pickup:         <MapPin className="w-4 h-4 text-teal-400" />,
  shipping:       <Truck className="w-4 h-4 text-blue-400" />,
  local_delivery: <Package className="w-4 h-4 text-orange-400" />,
};

export default function StoreOrdersManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterFulfillment, setFilterFulfillment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [trackingUrlInput, setTrackingUrlInput] = useState("");

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["store-orders", currentUser?.email],
    queryFn: () => base44.entities.Order.filter({ provider_email: currentUser.email, order_type: "inventory" }),
    enabled: !!currentUser,
    refetchInterval: 20000,
  });

  const filtered = orders.filter(o => {
    if (filterFulfillment !== "all" && o.fulfillment_method !== filterFulfillment) return false;
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.product_name?.toLowerCase().includes(q) ||
        o.user_email?.toLowerCase().includes(q) ||
        o.tracking_number?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Mark pickup ready — updates status and sends notification email
  const handleMarkPickupReady = async (order) => {
    await base44.entities.Order.update(order.id, {
      status: "ready_for_pickup",
      pickup_ready_at: new Date().toISOString(),
      pickup_notification_sent: true,
    });
    // Send email notification to customer
    await base44.integrations.Core.SendEmail({
      to: order.user_email,
      subject: `Your order is ready for pickup! 🎉`,
      body: `Hi there!\n\nGreat news — your order of "${order.product_name}" is ready for pickup.\n\n📍 Pickup Location: ${order.pickup_location || "Contact the store for the address."}\n\nPlease bring your order confirmation when you arrive.\n\nThank you for your order!`,
    });
    queryClient.invalidateQueries(["store-orders"]);
    toast.success("Customer notified — order marked as ready for pickup!");
  };

  // Add tracking number for shipped orders
  const handleAddTracking = async (order) => {
    if (!trackingInput.trim()) { toast.error("Enter a tracking number"); return; }
    await base44.entities.Order.update(order.id, {
      tracking_number: trackingInput.trim(),
      tracking_url: trackingUrlInput.trim() || undefined,
      status: "shipped",
    });
    // Notify customer
    await base44.integrations.Core.SendEmail({
      to: order.user_email,
      subject: `Your order has shipped! 📦`,
      body: `Hi there!\n\nYour order of "${order.product_name}" has been shipped via ${order.shipping_carrier || "carrier"}.\n\n🚚 Tracking Number: ${trackingInput.trim()}\n${trackingUrlInput.trim() ? `🔗 Track your package: ${trackingUrlInput.trim()}\n` : ""}\nExpect delivery within the carrier's standard timeframe.\n\nThank you!`,
    });
    setTrackingInput("");
    setTrackingUrlInput("");
    setSelectedOrder(null);
    queryClient.invalidateQueries(["store-orders"]);
    toast.success("Tracking added and customer notified!");
  };

  // Update order status
  const handleStatusChange = async (order, newStatus) => {
    await base44.entities.Order.update(order.id, { status: newStatus });
    queryClient.invalidateQueries(["store-orders"]);
    toast.success(`Order marked as ${newStatus.replace(/_/g, " ")}`);
  };

  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    processing: orders.filter(o => ["confirmed","processing"].includes(o.status)).length,
    ready_for_pickup: orders.filter(o => o.status === "ready_for_pickup").length,
    shipped: orders.filter(o => o.status === "shipped").length,
    out_for_delivery: orders.filter(o => o.status === "out_for_delivery").length,
  };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pending", count: counts.pending, color: "from-yellow-600 to-orange-600", icon: Clock },
          { label: "Processing", count: counts.processing, color: "from-purple-600 to-blue-600", icon: Package },
          { label: "Ready Pickup", count: counts.ready_for_pickup, color: "from-teal-600 to-green-600", icon: MapPin },
          { label: "Shipped / Out", count: counts.shipped + counts.out_for_delivery, color: "from-blue-600 to-cyan-600", icon: Truck },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-2xl p-4`}>
            <card.icon className="w-5 h-5 text-white/80 mb-2" />
            <p className="text-3xl font-bold text-white">{card.count}</p>
            <p className="text-white/70 text-xs mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by product, customer, or tracking #..."
            className="pl-9 bg-white/10 border-white/20 text-white placeholder-gray-500" />
        </div>
        <select value={filterFulfillment} onChange={e => setFilterFulfillment(e.target.value)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm">
          <option value="all">All Methods</option>
          <option value="pickup">Pickup</option>
          <option value="shipping">Shipping</option>
          <option value="local_delivery">Local Delivery</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="ready_for_pickup">Ready for Pickup</option>
          <option value="shipped">Shipped</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
        </select>
        <Button variant="outline" size="icon" onClick={() => refetch()} className="border-white/20 text-white hover:bg-white/10">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
          <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No orders yet</p>
          <p className="text-gray-600 text-sm mt-1">Orders from your customers will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(order => (
              <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                {/* Order Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {FULFILLMENT_ICON[order.fulfillment_method] || <Package className="w-4 h-4 text-gray-400" />}
                      <span className="text-gray-400 text-xs capitalize">{(order.fulfillment_method || "shipping").replace(/_/g, " ")}</span>
                    </div>
                    <Badge className={STATUS_COLORS[order.status] || "bg-gray-500/20 text-gray-400"}>
                      {order.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <span className="text-gray-500 text-xs">{new Date(order.created_date).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-white font-semibold">{order.product_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <User className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-400 text-xs">{order.user_email}</span>
                      {order.quantity > 1 && <span className="text-gray-500 text-xs">× {order.quantity}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">${order.total_amount?.toFixed(2)}</p>
                    {(order.shipping_cost > 0 || order.handling_fee > 0) && (
                      <p className="text-gray-500 text-xs">
                        +${((order.shipping_cost || 0) + (order.handling_fee || 0)).toFixed(2)} fees
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipping info */}
                {order.fulfillment_method === "shipping" && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 space-y-1">
                    <p className="text-blue-300 text-xs font-medium">📦 Carrier: {order.shipping_carrier || "Not specified"}</p>
                    {order.tracking_number ? (
                      <div className="flex items-center gap-2">
                        <p className="text-blue-300 text-xs">🔍 Tracking: <span className="text-white font-mono">{order.tracking_number}</span></p>
                        {order.tracking_url && (
                          <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-yellow-400 text-xs">⚠ No tracking number yet</p>
                    )}
                    {order.shipping_address && (() => {
                      try { const a = JSON.parse(order.shipping_address); return <p className="text-gray-400 text-xs">📍 {[a.street, a.city, a.state, a.zip].filter(Boolean).join(", ")}</p>; } catch { return null; }
                    })()}
                  </div>
                )}

                {/* Pickup info */}
                {order.fulfillment_method === "pickup" && (
                  <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">
                    <p className="text-teal-300 text-xs font-medium">🏪 Pickup Order</p>
                    {order.pickup_notification_sent
                      ? <p className="text-green-400 text-xs mt-1">✓ Customer notified — ready at {order.pickup_ready_at ? new Date(order.pickup_ready_at).toLocaleString() : "—"}</p>
                      : <p className="text-yellow-400 text-xs mt-1">Awaiting your confirmation to notify customer</p>
                    }
                  </div>
                )}

                {/* Local Delivery info */}
                {order.fulfillment_method === "local_delivery" && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                    <p className="text-orange-300 text-xs font-medium">🚴 Local Delivery</p>
                    {order.delivery_order_id
                      ? <p className="text-green-400 text-xs mt-1">✓ Driver dispatch created — ID: {order.delivery_order_id.slice(-8)}</p>
                      : <p className="text-yellow-400 text-xs mt-1">Awaiting driver assignment</p>
                    }
                    {order.driver_email && <p className="text-gray-400 text-xs">Driver: {order.driver_email}</p>}
                  </div>
                )}

                {/* Customer notes */}
                {order.customer_notes && (
                  <p className="text-gray-400 text-xs italic">Note: "{order.customer_notes}"</p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Pickup — mark ready */}
                  {order.fulfillment_method === "pickup" && !order.pickup_notification_sent && order.status !== "cancelled" && (
                    <Button size="sm" onClick={() => handleMarkPickupReady(order)}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs">
                      <Bell className="w-3 h-3 mr-1" /> Notify Customer — Ready for Pickup
                    </Button>
                  )}

                  {/* Shipping — add tracking */}
                  {order.fulfillment_method === "shipping" && !order.tracking_number && order.status !== "cancelled" && (
                    selectedOrder?.id === order.id ? (
                      <div className="flex flex-col gap-2 w-full">
                        <Input value={trackingInput} onChange={e => setTrackingInput(e.target.value)}
                          placeholder="Tracking number (e.g. 1Z999AA10123456784)"
                          className="bg-white/10 border-white/20 text-white text-xs h-8" />
                        <Input value={trackingUrlInput} onChange={e => setTrackingUrlInput(e.target.value)}
                          placeholder="Tracking URL (optional)"
                          className="bg-white/10 border-white/20 text-white text-xs h-8" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAddTracking(order)} className="bg-blue-600 hover:bg-blue-700 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" /> Save & Notify Customer
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(null)} className="text-gray-400 text-xs">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => setSelectedOrder(order)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                        <Truck className="w-3 h-3 mr-1" /> Add Tracking Number
                      </Button>
                    )
                  )}

                  {/* Status updates */}
                  {order.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(order, "processing")}
                      className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-xs">
                      Mark Processing
                    </Button>
                  )}
                  {["confirmed","processing","ready_for_pickup","shipped","out_for_delivery"].includes(order.status) && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(order, "delivered")}
                      className="border-green-500/50 text-green-400 hover:bg-green-500/10 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" /> Mark Delivered
                    </Button>
                  )}
                  {!["cancelled","delivered","refunded"].includes(order.status) && (
                    <Button size="sm" variant="ghost" onClick={() => handleStatusChange(order, "cancelled")}
                      className="text-red-400 hover:bg-red-500/10 text-xs">
                      Cancel Order
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}