import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bike, DollarSign, Clock, MapPin, CheckCircle, Package } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { filterNearbyRequests, DEFAULT_DRIVER_RADIUS_MILES } from "@/lib/geoUtils";

export default function FoodDriverHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setDriverLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.log("Location error:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: availableOrders = [] } = useQuery({
    queryKey: ['available-food-orders', driverLocation],
    queryFn: async () => {
      const orders = await base44.entities.FoodOrder.filter({ status: 'confirmed' });
      const unassigned = orders.filter(o => !o.driver_email);
      // Only show orders whose delivery destination is within the driver's radius.
      if (!driverLocation) return [];
      return filterNearbyRequests(unassigned, driverLocation, (o) => o.delivery_coords);
    },
    refetchInterval: 5000
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['my-food-deliveries'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.FoodOrder.filter({ 
        driver_email: user.email,
        status: { $in: ['ready', 'picked_up', 'on_the_way'] }
      });
    },
    refetchInterval: 5000
  });

  const { data: completedOrders = [] } = useQuery({
    queryKey: ['completed-food-deliveries'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.FoodOrder.filter({ 
        driver_email: user.email,
        status: 'delivered'
      });
    }
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (order) => {
      const user = await base44.auth.me();
      
      await base44.entities.FoodOrder.update(order.id, {
        driver_email: user.email,
        status: 'ready'
      });

      // Notify customer
      await base44.entities.Notification.create({
        user_email: order.created_by,
        type: 'order_update',
        title: '🚴 Driver Assigned!',
        message: `Your order from ${order.restaurant_name} has been assigned to a driver and will be picked up soon.`,
        reference_id: order.id,
        reference_type: 'food_order'
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['available-food-orders']);
      queryClient.invalidateQueries(['my-food-deliveries']);
      toast.success('Order accepted!');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus, customerEmail, restaurantName }) => {
      await base44.entities.FoodOrder.update(orderId, { status: newStatus });

      const statusMessages = {
        'picked_up': '📦 Order Picked Up - Your delivery is on the way!',
        'on_the_way': '🚴 On The Way - Your food will arrive soon!',
        'delivered': '✅ Delivered - Enjoy your meal!'
      };

      if (statusMessages[newStatus]) {
        await base44.entities.Notification.create({
          user_email: customerEmail,
          type: 'order_update',
          title: statusMessages[newStatus].split(' - ')[0],
          message: `${restaurantName}: ${statusMessages[newStatus].split(' - ')[1]}`,
          reference_id: orderId,
          reference_type: 'food_order'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-food-deliveries']);
      queryClient.invalidateQueries(['completed-food-deliveries']);
      toast.success('Status updated');
    }
  });

  const totalEarnings = completedOrders.reduce((sum, order) => sum + (order.delivery_fee * 0.8), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Bike className="w-8 h-8" />
              Food Driver Hub
            </h1>
            <p className="text-gray-300">Deliver food, earn money</p>
          </div>
          <Button
            onClick={() => setIsOnline(!isOnline)}
            className={isOnline ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}
          >
            {isOnline ? '🟢 Online' : '⚪ Offline'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
              <span className="text-gray-300">Total Earnings</span>
            </div>
            <p className="text-3xl font-bold text-white">${totalEarnings.toFixed(2)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-8 h-8 text-blue-400" />
              <span className="text-gray-300">Active Deliveries</span>
            </div>
            <p className="text-3xl font-bold text-white">{activeOrders.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <span className="text-gray-300">Completed</span>
            </div>
            <p className="text-3xl font-bold text-white">{completedOrders.length}</p>
          </motion.div>
        </div>

        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="available">Available ({availableOrders.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4">
            {!isOnline && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 text-center">
                <p className="text-yellow-300">Go online to see available orders</p>
              </div>
            )}

            {isOnline && availableOrders.length === 0 && (
              <div className="text-center py-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
                <p className="text-gray-400">
                  {driverLocation
                    ? `No orders within ${DEFAULT_DRIVER_RADIUS_MILES} miles right now`
                    : "Enable location to see nearby orders"}
                </p>
              </div>
            )}

            {isOnline && availableOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{order.restaurant_name}</h3>
                    <div className="flex items-center gap-2 text-gray-300 text-sm mb-1">
                      <MapPin className="w-4 h-4" />
                      {order.delivery_address}
                    </div>
                    <div className="flex items-center gap-2 text-gray-300 text-sm">
                      <Clock className="w-4 h-4" />
                      {order.estimated_delivery_time}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">${(order.delivery_fee * 0.8).toFixed(2)}</p>
                    <p className="text-gray-400 text-sm">You earn (80%)</p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-3 mb-4">
                  <p className="text-gray-400 text-sm mb-2">Order Items:</p>
                  {order.items.map((item, idx) => (
                    <p key={idx} className="text-white text-sm">
                      {item.quantity}x {item.name}
                    </p>
                  ))}
                </div>

                <Button
                  onClick={() => acceptOrderMutation.mutate(order)}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={acceptOrderMutation.isPending}
                >
                  Accept Delivery
                </Button>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activeOrders.length === 0 ? (
              <div className="text-center py-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
                <p className="text-gray-400">No active deliveries</p>
              </div>
            ) : (
              activeOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{order.restaurant_name}</h3>
                      <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        {order.delivery_address}
                      </div>
                      <Badge className={
                        order.status === 'ready' ? 'bg-blue-500/20 text-blue-300' :
                        order.status === 'picked_up' ? 'bg-purple-500/20 text-purple-300' :
                        'bg-green-500/20 text-green-300'
                      }>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xl font-bold text-green-400">${(order.delivery_fee * 0.8).toFixed(2)}</p>
                  </div>

                  <div className="space-y-2">
                    {order.status === 'ready' && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({ 
                          orderId: order.id, 
                          newStatus: 'picked_up',
                          customerEmail: order.created_by,
                          restaurantName: order.restaurant_name
                        })}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        Mark as Picked Up
                      </Button>
                    )}
                    {order.status === 'picked_up' && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({ 
                          orderId: order.id, 
                          newStatus: 'on_the_way',
                          customerEmail: order.created_by,
                          restaurantName: order.restaurant_name
                        })}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        Start Delivery
                      </Button>
                    )}
                    {order.status === 'on_the_way' && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({ 
                          orderId: order.id, 
                          newStatus: 'delivered',
                          customerEmail: order.created_by,
                          restaurantName: order.restaurant_name
                        })}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        Complete Delivery
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{order.restaurant_name}</h3>
                  <p className="text-gray-400 text-sm">{new Date(order.updated_date).toLocaleDateString()}</p>
                </div>
                <p className="text-xl font-bold text-green-400">+${(order.delivery_fee * 0.8).toFixed(2)}</p>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}