import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Clock, ChefHat, Bike, MapPin, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LoadMoreButton } from "../components/Pagination";

export default function FoodOrderTracking() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const orderId = new URLSearchParams(location.search).get('id');

  const { data: order, isLoading } = useQuery({
    queryKey: ['food-order', orderId],
    queryFn: async () => {
      const orders = await base44.entities.FoodOrder.list();
      return orders.find(o => o.id === orderId);
    },
    enabled: !!orderId,
    refetchInterval: 5000
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      await base44.entities.FoodOrder.update(orderId, { status: newStatus });

      const statusMessages = {
        'confirmed': '✅ Order Confirmed - Your order is being prepared',
        'preparing': '👨‍🍳 Preparing - Your food is being made',
        'ready': '📦 Ready - Your order is ready for pickup',
        'picked_up': '🚴 Picked Up - Driver is heading to you',
        'on_the_way': '🚗 On The Way - Your delivery will arrive soon',
        'delivered': '✨ Delivered - Enjoy your meal!'
      };

      if (statusMessages[newStatus]) {
        await base44.entities.Notification.create({
          user_email: order.created_by,
          type: 'order_update',
          title: statusMessages[newStatus].split(' - ')[0],
          message: `${order.restaurant_name}: ${statusMessages[newStatus].split(' - ')[1]}`,
          reference_id: orderId,
          reference_type: 'food_order'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['food-order', orderId]);
      toast.success('Order status updated');
    }
  });

  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPerPage = 10;

  const { data: allOrders = [] } = useQuery({
    queryKey: ['my-food-orders', ordersPage],
    queryFn: async () => {
      const user = await base44.auth.me();
      const skip = (ordersPage - 1) * ordersPerPage;
      const orders = await base44.entities.FoodOrder.filter({ created_by: user.email });
      return orders.slice(skip, skip + ordersPerPage);
    }
  });

  const statusSteps = [
    { key: 'pending', label: 'Order Placed', icon: Check },
    { key: 'confirmed', label: 'Confirmed', icon: Check },
    { key: 'preparing', label: 'Preparing', icon: ChefHat },
    { key: 'ready', label: 'Ready', icon: Check },
    { key: 'picked_up', label: 'Picked Up', icon: Bike },
    { key: 'on_the_way', label: 'On The Way', icon: Bike },
    { key: 'delivered', label: 'Delivered', icon: Check }
  ];

  const getCurrentStepIndex = (status) => {
    return statusSteps.findIndex(step => step.key === status);
  };

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">My Orders</h1>
          
          {allOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-300 mb-6">No orders yet</p>
              <Button onClick={() => navigate(createPageUrl("FoodDelivery"))} className="bg-orange-600 hover:bg-orange-700">
                Order Food
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {allOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(createPageUrl("FoodOrderTracking") + `?id=${order.id}`)}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 cursor-pointer hover:bg-white/20 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{order.restaurant_name}</h3>
                      <p className="text-gray-300 text-sm">{new Date(order.created_date).toLocaleDateString()}</p>
                    </div>
                    <Badge className={
                      order.status === 'delivered' ? 'bg-green-500/20 text-green-300' :
                      order.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
                      'bg-blue-500/20 text-blue-300'
                    }>
                      {order.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 mb-4">
                    {order.items.map((item, idx) => (
                      <p key={idx} className="text-gray-300 text-sm">
                        {item.quantity}x {item.name}
                      </p>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-lg">${order.total.toFixed(2)}</span>
                    <Button variant="outline" size="sm">Track Order</Button>
                  </div>
                </div>
              ))}

              <LoadMoreButton
                onLoadMore={() => setOrdersPage(p => p + 1)}
                hasMore={allOrders.length >= ordersPerPage}
                loading={false}
              />
              </div>
              )}
              </div>
              </div>
              );
              }

  if (isLoading) {
    return <div className="p-6 text-white text-center">Loading order...</div>;
  }

  if (!order) {
    return <div className="p-6 text-white text-center">Order not found</div>;
  }

  const currentStepIndex = getCurrentStepIndex(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(createPageUrl("FoodOrderTracking"))}
            className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Order Tracking</h1>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{order.restaurant_name}</h2>
              <p className="text-gray-300">Order #{order.id.slice(0, 8)}</p>
            </div>
            <Badge className={
              order.status === 'delivered' ? 'bg-green-500/20 text-green-300 text-lg px-4 py-2' :
              order.status === 'cancelled' ? 'bg-red-500/20 text-red-300 text-lg px-4 py-2' :
              'bg-blue-500/20 text-blue-300 text-lg px-4 py-2'
            }>
              {order.status.replace('_', ' ')}
            </Badge>
          </div>

          <div className="relative mb-8">
            <div className="absolute top-6 left-0 right-0 h-1 bg-white/20">
              <div 
                className="h-full bg-orange-500 transition-all duration-500"
                style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
              />
            </div>

            <div className="relative flex justify-between">
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentStepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                        isCompleted ? 'bg-orange-500' : 'bg-white/20'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isCompleted ? 'text-white' : 'text-gray-400'}`} />
                    </motion.div>
                    <span className={`text-xs text-center ${isCompleted ? 'text-white' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {order.estimated_delivery_time && order.status !== 'delivered' && (
            <div className="flex items-center gap-2 justify-center text-white mb-4">
              <Clock className="w-5 h-5" />
              <span className="text-lg">Estimated delivery: {order.estimated_delivery_time}</span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Delivery Address
            </h3>
            <p className="text-gray-300">{order.delivery_address}</p>
            {order.special_instructions && (
              <div className="mt-4 p-3 bg-white/5 rounded-lg">
                <p className="text-gray-400 text-sm">Instructions:</p>
                <p className="text-gray-300">{order.special_instructions}</p>
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Order Items</h3>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-gray-300">
                  <span>{item.quantity}x {item.name}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="h-px bg-white/20 my-2" />
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Delivery Fee</span>
                <span>${order.delivery_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {order.driver_email && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Your Driver</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{order.driver_email.split('@')[0]}</p>
                <p className="text-gray-400 text-sm">Delivery driver</p>
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}