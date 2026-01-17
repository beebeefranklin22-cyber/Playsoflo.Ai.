import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Cart() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => navigate(createPageUrl("Home")));
  }, []);

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart', currentUser?.email],
    queryFn: () => base44.entities.Cart.filter({ user_email: currentUser.email }),
    enabled: !!currentUser
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }) => base44.entities.Cart.update(id, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: (id) => base44.entities.Cart.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Item removed from cart');
    }
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(cartItems.map(item => base44.entities.Cart.delete(item.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Cart cleared');
    }
  });

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Group by item type
  const groupedItems = cartItems.reduce((acc, item) => {
    if (!acc[item.item_type]) acc[item.item_type] = [];
    acc[item.item_type].push(item);
    return acc;
  }, {});

  const typeLabels = {
    marketplace: "Marketplace Items",
    food: "Food Orders",
    ticket: "Tickets & Events",
    service: "Services",
    rental: "Rentals",
    product: "Products"
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="glass-effect border-white/10 max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <ShoppingCart className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
            <p className="text-gray-400 mb-6">Start adding items to your cart!</p>
            <Button
              onClick={() => navigate(createPageUrl("Marketplace"))}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ShoppingCart className="w-8 h-8" />
              Shopping Cart
            </h1>
            <p className="text-gray-400 mt-1">{totalItems} items</p>
          </div>
          {cartItems.length > 0 && (
            <Button
              onClick={() => clearCartMutation.mutate()}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cart
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(groupedItems).map(([type, items]) => (
              <Card key={type} className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">{typeLabels[type]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="flex gap-4 p-4 bg-white/5 rounded-xl"
                    >
                      {item.item_image && (
                        <img
                          src={item.item_image}
                          alt={item.item_name}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{item.item_name}</h3>
                        <p className="text-purple-400 font-bold mt-1">${item.price.toFixed(2)}</p>
                        {item.notes && (
                          <p className="text-gray-400 text-sm mt-1">{item.notes}</p>
                        )}
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 });
                            }
                          }}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                        >
                          <Minus className="w-4 h-4 text-white" />
                        </button>
                        <span className="text-white font-bold w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItemMutation.mutate(item.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition"
                      >
                        <X className="w-5 h-5 text-red-400" />
                      </button>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <Card className="glass-effect border-white/10 sticky top-20">
              <CardHeader>
                <CardTitle className="text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Estimated Tax</span>
                    <span>${(totalAmount * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 mt-2">
                    <div className="flex justify-between text-white font-bold text-lg">
                      <span>Total</span>
                      <span>${(totalAmount * 1.08).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  onClick={() => toast.info('Checkout coming soon!')}
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-white/20"
                  onClick={() => navigate(createPageUrl("Marketplace"))}
                >
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}