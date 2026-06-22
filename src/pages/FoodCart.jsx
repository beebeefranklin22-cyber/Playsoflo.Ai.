import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Minus, Trash2, MapPin, Store, Clock, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import StripePaymentForm from "../components/payment/StripePaymentForm";
import { dispatchFoodOrder } from "@/functions/dispatchFoodOrder";

export default function FoodCart() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart-items'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CartItem.list();
    }
  });

  const { data: restaurant } = useQuery({
    queryKey: ['cart-restaurant'],
    queryFn: async () => {
      if (cartItems.length === 0) return null;
      const restaurants = await base44.entities.Restaurant.list();
      return restaurants.find(r => r.id === cartItems[0].restaurant_id);
    },
    enabled: cartItems.length > 0
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, newQuantity }) => {
      if (newQuantity <= 0) {
        return base44.entities.CartItem.delete(itemId);
      }
      return base44.entities.CartItem.update(itemId, { quantity: newQuantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart-items']);
    }
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const deletePromises = cartItems.map(item => base44.entities.CartItem.delete(item.id));
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart-items']);
      toast.success('Cart cleared');
    }
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const subtotal = cartItems.reduce((sum, item) => sum + (item.menu_item_price * item.quantity), 0);
      const deliveryFee = restaurant?.delivery_fee || 3.99;
      // Platform charges 15% from merchant, not from customer
      const commissionAmount = parseFloat((subtotal * 0.15).toFixed(2));
      const total = subtotal + deliveryFee;

      const order = await base44.entities.FoodOrder.create({
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        restaurant_address: restaurant.address || restaurant.name,
        restaurant_owner_email: restaurant.owner_email || restaurant.created_by || '',
        restaurant_phone: restaurant.phone || '',
        items: cartItems.map(item => ({
          menu_item_id: item.menu_item_id,
          name: item.menu_item_name,
          price: item.menu_item_price,
          quantity: item.quantity
        })),
        subtotal,
        delivery_fee: deliveryFee,
        commission_amount: commissionAmount,
        total,
        delivery_address: deliveryAddress,
        special_instructions: specialInstructions,
        status: 'pending',
        estimated_delivery_time: restaurant.estimated_delivery_time,
        driver_earnings: parseFloat((deliveryFee * 0.80).toFixed(2))
      });

      return order;
    },
    onSuccess: (order) => {
      setOrderId(order.id);
      setShowPayment(true);
    }
  });

  const handlePaymentSuccess = async (paymentResult) => {
    try {
      // Dispatch: creates DeliveryOrder, notifies restaurant + drivers
      await dispatchFoodOrder({
        food_order_id: orderId,
        payment_intent_id: paymentResult?.payment_intent_id || paymentResult?.id || ''
      });
    } catch (err) {
      console.warn('Dispatch non-fatal error:', err);
    }

    await clearCartMutation.mutateAsync();
    toast.success('Order placed! Restaurant and drivers notified.');
    navigate(createPageUrl("FoodOrderTracking") + `?id=${orderId}`);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.menu_item_price * item.quantity), 0);
  const deliveryFee = restaurant?.delivery_fee || 3.99;
  const total = subtotal + deliveryFee;

  if (cartItems.length === 0 && !showPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold text-white mb-4">Your cart is empty</h1>
          <p className="text-gray-300 mb-6">Add items from restaurants to get started</p>
          <Button onClick={() => navigate(createPageUrl("FoodDelivery"))} className="bg-orange-600 hover:bg-orange-700">
            Browse Restaurants
          </Button>
        </div>
      </div>
    );
  }

  if (showPayment && orderId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowPayment(false)}
            className="mb-4 p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Complete Payment</h2>
            <StripePaymentForm
              amount={total}
              referenceType="order"
              referenceId={orderId}
              description={`Food delivery from ${restaurant?.name}`}
              onSuccess={handlePaymentSuccess}
              onError={(error) => toast.error(error.message)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(createPageUrl("FoodDelivery"))}
            className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Your Cart</h1>
        </div>

        {restaurant && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 mb-6">
            <h2 className="text-xl font-bold text-white mb-1">{restaurant.name}</h2>
            <div className="flex flex-wrap gap-3 mt-2">
              {restaurant.address && (
                <div className="flex items-center gap-1 text-gray-300 text-sm">
                  <Store className="w-4 h-4 text-orange-400" />
                  {restaurant.address}
                </div>
              )}
              {restaurant.estimated_delivery_time && (
                <div className="flex items-center gap-1 text-gray-300 text-sm">
                  <Clock className="w-4 h-4 text-orange-400" />
                  {restaurant.estimated_delivery_time}
                </div>
              )}
              {restaurant.phone && (
                <div className="flex items-center gap-1 text-gray-300 text-sm">
                  <Phone className="w-4 h-4 text-orange-400" />
                  {restaurant.phone}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {cartItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">{item.menu_item_name}</h3>
                <p className="text-orange-400 font-bold">${item.menu_item_price.toFixed(2)}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-orange-600 rounded-full px-3 py-2">
                  <button
                    onClick={() => updateQuantityMutation.mutate({ itemId: item.id, newQuantity: item.quantity - 1 })}
                    className="text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-white font-bold min-w-[20px] text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantityMutation.mutate({ itemId: item.id, newQuantity: item.quantity + 1 })}
                    className="text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => updateQuantityMutation.mutate({ itemId: item.id, newQuantity: 0 })}
                  className="p-2 hover:bg-red-500/20 rounded-full transition"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Delivery Details
          </h3>
          
          <Input
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Enter delivery address"
            className="mb-4 bg-white/10 border-white/20 text-white placeholder-gray-400"
          />

          <Textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Special instructions (optional)"
            className="bg-white/10 border-white/20 text-white placeholder-gray-400"
          />
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-300">
              <span>Subtotal ({cartItems.reduce((s, i) => s + i.quantity, 0)} item{cartItems.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''})</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Delivery Fee</span>
              <span className="text-orange-300">${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="h-px bg-white/20 my-2" />
            <div className="flex justify-between text-white text-xl font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <p className="text-gray-500 text-xs text-center mt-1">Delivery fee set by restaurant · Platform commission charged to merchant</p>
          </div>
        </div>

        <Button
          onClick={() => createOrderMutation.mutate()}
          disabled={!deliveryAddress || createOrderMutation.isPending}
          className="w-full bg-orange-600 hover:bg-orange-700 py-6 text-lg"
        >
          {createOrderMutation.isPending ? 'Processing...' : 'Proceed to Payment'}
        </Button>
      </div>
    </div>
  );
}