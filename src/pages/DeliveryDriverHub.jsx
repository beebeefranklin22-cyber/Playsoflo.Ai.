import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Truck, Package, DollarSign, MapPin, CheckCircle, 
  ArrowLeft, Navigation, Camera, TrendingUp, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function DeliveryDriverHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: availableOrders = [] } = useQuery({
    queryKey: ['available-deliveries'],
    queryFn: async () => {
      return await base44.entities.DeliveryOrder.filter({ 
        status: 'pending' 
      });
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  const { data: myActiveDeliveries = [] } = useQuery({
    queryKey: ['my-active-deliveries', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.DeliveryOrder.filter({
        driver_email: currentUser.email,
        status: { $in: ['driver_assigned', 'picked_up', 'in_transit', 'out_for_delivery'] }
      });
    },
    enabled: !!currentUser,
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  const { data: todayEarnings = 0 } = useQuery({
    queryKey: ['driver-delivery-earnings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const completed = await base44.entities.DeliveryOrder.filter({
        driver_email: currentUser.email,
        status: 'delivered'
      });
      
      const todayDeliveries = completed.filter(d => 
        new Date(d.delivery_time) >= today
      );
      
      return todayDeliveries.reduce((sum, d) => sum + (d.driver_earnings || 0), 0);
    },
    enabled: !!currentUser,
    refetchInterval: 15000,
    refetchOnWindowFocus: true
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      await base44.entities.DeliveryOrder.update(orderId, {
        driver_email: currentUser.email,
        status: 'driver_assigned',
        tracking_updates: [
          ...(selectedOrder.tracking_updates || []),
          {
            timestamp: new Date().toISOString(),
            status: 'driver_assigned',
            message: 'Driver accepted delivery',
            location: selectedOrder.pickup_address
          }
        ]
      });

      // Notify sender
      await base44.entities.Notification.create({
        recipient_email: selectedOrder.sender_email,
        type: 'system_alert',
        title: '🚚 Driver Assigned',
        message: `A driver has been assigned to your delivery #${selectedOrder.order_number?.substring(0, 8)}`,
        reference_type: 'delivery',
        reference_id: orderId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['my-active-deliveries'] });
      setSelectedOrder(null);
      toast.success('✅ Delivery accepted!');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus, message }) => {
      const order = myActiveDeliveries.find(o => o.id === orderId);
      
      const updates = {
        status: newStatus,
        tracking_updates: [
          ...(order.tracking_updates || []),
          {
            timestamp: new Date().toISOString(),
            status: newStatus,
            message: message,
            location: order.delivery_address
          }
        ]
      };

      if (newStatus === 'picked_up') {
        updates.pickup_time = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updates.delivery_time = new Date().toISOString();
        updates.payment_status = 'paid';
        
        // Pay driver
        const driverPayout = order.driver_earnings || 0;
        const currentBalance = currentUser.usd_balance || 0;
        
        await base44.asServiceRole.entities.User.update(currentUser.id, {
          usd_balance: currentBalance + driverPayout
        });

        // Record payment
        await base44.entities.Payment.create({
          amount_usd: driverPayout,
          method: 'internal_transfer',
          status: 'completed',
          reference_type: 'other',
          reference_id: order.id,
          recipient_email: currentUser.email,
          sender_email: 'platform@playsofl.com',
          memo: 'Delivery driver earnings'
        });

        // Notify recipient
        await base44.entities.Notification.create({
          recipient_email: order.recipient_email || order.sender_email,
          type: 'system_alert',
          title: '📦 Package Delivered',
          message: `Your package #${order.order_number?.substring(0, 8)} has been delivered!`,
          reference_type: 'delivery',
          reference_id: order.id
        });
      }

      await base44.entities.DeliveryOrder.update(orderId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-active-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['driver-delivery-earnings'] });
      toast.success('Status updated!');
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-cyan-900 to-gray-900 pb-24">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(createPageUrl("Home"))}
            className="flex items-center gap-2 text-white mb-4 hover:opacity-80 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Truck className="w-8 h-8" />
                Delivery Driver Hub
              </h1>
              <p className="text-cyan-100">Accept deliveries and earn 85% of delivery fees</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <DollarSign className="w-8 h-8 text-green-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Today's Earnings</p>
            <p className="text-white text-3xl font-bold">${todayEarnings.toFixed(2)}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <Package className="w-8 h-8 text-blue-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Active Deliveries</p>
            <p className="text-white text-3xl font-bold">{myActiveDeliveries.length}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <TrendingUp className="w-8 h-8 text-purple-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Available Orders</p>
            <p className="text-white text-3xl font-bold">{availableOrders.length}</p>
          </div>
        </div>

        {/* Active Deliveries */}
        {myActiveDeliveries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Your Active Deliveries</h2>
            <div className="space-y-4">
              {myActiveDeliveries.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/30 rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-bold text-lg mb-1">
                        Order #{order.order_number?.substring(0, 8).toUpperCase()}
                      </h3>
                      <Badge className="bg-blue-500/30 text-blue-300">
                        {order.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">You Earn</p>
                      <p className="text-green-400 font-bold text-2xl">${order.driver_earnings?.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-xs">Pickup</p>
                        <p className="text-white text-sm">{order.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-xs">Delivery</p>
                        <p className="text-white text-sm">{order.delivery_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {order.status === 'driver_assigned' && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({
                          orderId: order.id,
                          newStatus: 'picked_up',
                          message: 'Package picked up by driver'
                        })}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Confirm Pickup
                      </Button>
                    )}
                    
                    {order.status === 'picked_up' && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({
                          orderId: order.id,
                          newStatus: 'in_transit',
                          message: 'Package in transit'
                        })}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        Start Delivery
                      </Button>
                    )}

                    {order.status === 'in_transit' && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({
                          orderId: order.id,
                          newStatus: 'delivered',
                          message: 'Package successfully delivered'
                        })}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Delivery
                      </Button>
                    )}

                    <Button
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(order.pickup_address)}&destination=${encodeURIComponent(order.delivery_address)}`, '_blank')}
                      variant="outline"
                      className="border-white/20 text-white"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Navigate
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Available Orders */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Available Deliveries</h2>
          {availableOrders.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
              <Package className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Orders Available</h3>
              <p className="text-gray-400">Check back soon for new delivery requests</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {availableOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-blue-500/50 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-bold mb-1">
                        #{order.order_number?.substring(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-gray-400 text-sm">{order.package_description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-xs">You Earn</p>
                      <p className="text-green-400 font-bold text-xl">${order.driver_earnings?.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-400 text-xs">Pickup</p>
                        <p className="text-white">{order.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-400 text-xs">Delivery</p>
                        <p className="text-white">{order.delivery_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-gray-400">Distance</span>
                      <span className="text-white font-semibold">{order.distance_miles} mi</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Est. Time</span>
                      <span className="text-white font-semibold">{order.estimated_duration_minutes} min</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedOrder(order);
                      acceptOrderMutation.mutate(order.id);
                    }}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    Accept Delivery
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}