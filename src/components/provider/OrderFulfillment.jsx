import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Package, CheckCircle, XCircle, Clock, Truck, 
  DollarSign, User, Calendar, MessageCircle 
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PaymentConfirmation from "../payment/PaymentConfirmation";

export default function OrderFulfillment({ currentUser }) {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedAmount, setConfirmedAmount] = useState(0);

  const { data: orders = [] } = useQuery({
    queryKey: ['provider-orders', currentUser?.email],
    queryFn: () => base44.entities.Order.filter({ provider_email: currentUser.email }),
    enabled: !!currentUser
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-bookings', currentUser?.email],
    queryFn: () => base44.entities.Booking.filter({ provider_email: currentUser.email }),
    enabled: !!currentUser
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status, tracking }) => {
      const order = orders.find(o => o.id === orderId);
      
      // Update order
      await base44.entities.Order.update(orderId, {
        status,
        ...(tracking && { tracking_number: tracking })
      });

      // If confirming, process payment
      if (status === "confirmed") {
        const platformFee = order.total_amount * 0.05; // 5% platform fee
        const providerEarnings = order.total_amount - platformFee;

        // Update provider balance
        await base44.auth.updateMe({
          balance_usd: (currentUser.balance_usd || 0) + providerEarnings
        });

        // Create payment record
        await base44.entities.Payment.create({
          amount_usd: order.total_amount,
          amount_rri: 0,
          method: "internal_transfer",
          status: "completed",
          reference_type: "order",
          reference_id: orderId,
          sender_email: order.user_email || order.created_by,
          recipient_email: currentUser.email,
          memo: `Payment for order: ${order.product_name}`
        });

        // Notify customer
        await base44.entities.Notification.create({
          recipient_email: order.user_email || order.created_by,
          type: "booking_updates",
          title: "Order Confirmed",
          message: `Your order for ${order.product_name} has been confirmed and is being processed.`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          reference_type: "order",
          reference_id: orderId,
          read: false
        });

        setConfirmedAmount(providerEarnings);
        setShowConfirmation(true);
      }

      // Notify on status changes
      if (status === "shipped" && tracking) {
        await base44.entities.Notification.create({
          recipient_email: order.user_email || order.created_by,
          type: "booking_updates",
          title: "Order Shipped",
          message: `Your order has been shipped! Tracking: ${tracking}`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          reference_type: "order",
          reference_id: orderId,
          read: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-orders']);
      toast.success("Order updated successfully");
      setSelectedOrder(null);
      setTrackingNumber("");
    }
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status }) => {
      const booking = bookings.find(b => b.id === bookingId);
      
      await base44.entities.Booking.update(bookingId, {
        booking_status: status,
        ...(status === "confirmed" && { payment_status: "paid" })
      });

      // If confirming, process payment
      if (status === "confirmed" && booking.payment_status === "pending") {
        const platformFee = booking.total_price_usd * 0.10; // 10% platform fee
        const providerEarnings = booking.total_price_usd - platformFee;

        // Update provider balance
        await base44.auth.updateMe({
          balance_usd: (currentUser.balance_usd || 0) + providerEarnings
        });

        // Create payment record
        await base44.entities.Payment.create({
          amount_usd: booking.total_price_usd,
          amount_rri: 0,
          method: booking.payment_method,
          status: "completed",
          reference_type: "order",
          reference_id: bookingId,
          sender_email: booking.created_by,
          recipient_email: currentUser.email,
          memo: `Payment for booking: ${booking.experience_title}`
        });

        // Notify customer
        await base44.entities.Notification.create({
          recipient_email: booking.created_by,
          type: "booking_updates",
          title: "Booking Confirmed",
          message: `Your booking for ${booking.experience_title} has been confirmed!`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          reference_type: "order",
          reference_id: bookingId,
          read: false
        });

        setConfirmedAmount(providerEarnings);
        setShowConfirmation(true);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-bookings']);
      toast.success("Booking updated successfully");
    }
  });

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-500/20 text-yellow-300",
      confirmed: "bg-blue-500/20 text-blue-300",
      processing: "bg-purple-500/20 text-purple-300",
      shipped: "bg-green-500/20 text-green-300",
      delivered: "bg-green-600/20 text-green-400",
      cancelled: "bg-red-500/20 text-red-300",
      completed: "bg-green-600/20 text-green-400"
    };
    return colors[status] || "bg-gray-500/20 text-gray-300";
  };

  return (
    <>
      {showConfirmation && (
        <PaymentConfirmation
          amount={confirmedAmount}
          currency="USD"
          type="order"
          onClose={() => {
            setShowConfirmation(false);
            queryClient.invalidateQueries(['provider-orders']);
            queryClient.invalidateQueries(['provider-bookings']);
          }}
        />
      )}

      <div className="space-y-6">
        {/* Orders Section */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Orders ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No orders yet</p>
            ) : (
              <AnimatePresence>
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-bold">{order.product_name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                          <User className="w-4 h-4" />
                          {order.user_email || "Customer"}
                        </div>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-white">${order.total_amount?.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(order.created_date).toLocaleDateString()}
                      </div>
                    </div>

                    {order.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: "confirmed" })}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm Order
                        </Button>
                        <Button
                          onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: "cancelled" })}
                          variant="outline"
                          className="bg-red-500/20 border-red-500/30 hover:bg-red-500/30"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {order.status === "confirmed" && (
                      <Button
                        onClick={() => setSelectedOrder(order)}
                        className="w-full bg-blue-600 hover:bg-blue-700 mt-3"
                        size="sm"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        Mark as Shipped
                      </Button>
                    )}

                    {order.tracking_number && (
                      <div className="mt-3 p-2 bg-white/5 rounded text-sm">
                        <span className="text-gray-400">Tracking:</span>
                        <span className="text-white ml-2">{order.tracking_number}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>

        {/* Bookings Section */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Bookings ({bookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bookings.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No bookings yet</p>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-bold">{booking.experience_title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                        <User className="w-4 h-4" />
                        {booking.created_by}
                      </div>
                    </div>
                    <Badge className={getStatusColor(booking.booking_status)}>
                      {booking.booking_status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-white">${booking.total_price_usd?.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </div>
                  </div>

                  {booking.booking_status === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => updateBookingMutation.mutate({ bookingId: booking.id, status: "confirmed" })}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Booking
                      </Button>
                      <Button
                        onClick={() => updateBookingMutation.mutate({ bookingId: booking.id, status: "cancelled" })}
                        variant="outline"
                        className="bg-red-500/20 border-red-500/30 hover:bg-red-500/30"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Shipping Modal */}
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Ship Order</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Tracking Number</label>
                  <Input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (trackingNumber) {
                        updateOrderMutation.mutate({
                          orderId: selectedOrder.id,
                          status: "shipped",
                          tracking: trackingNumber
                        });
                      } else {
                        toast.error("Please enter tracking number");
                      }
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Confirm Shipment
                  </Button>
                  <Button
                    onClick={() => setSelectedOrder(null)}
                    variant="outline"
                    className="bg-white/5 border-white/20"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </>
  );
}