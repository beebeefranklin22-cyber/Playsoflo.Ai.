import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, ChevronRight, Sparkles, DollarSign, Clock, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function UnifiedCartManager({ currentUser, onCheckout }) {
  const [cart, setCart] = useState([]);
  const [suggestedBundles, setSuggestedBundles] = useState([]);
  const [loadingBundles, setLoadingBundles] = useState(false);
  const queryClient = useQueryClient();

  // Add item to cart
  const addToCart = (item) => {
    setCart(prev => [...prev, { ...item, cartId: Date.now() }]);
    toast.success(`${item.type} added to cart`);
  };

  // Remove item from cart
  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  // Calculate total
  const total = cart.reduce((sum, item) => sum + (item.price || 0), 0);

  // Get AI-powered bundle suggestions
  const generateBundleSuggestions = async () => {
    if (cart.length < 2) {
      setSuggestedBundles([]);
      return;
    }

    setLoadingBundles(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `The user has these items in their cart: ${JSON.stringify(cart.map(c => ({ type: c.type, title: c.title || c.name, price: c.price })))}. 
        
        Suggest 2-3 AI-optimized bundles that combine these services for a better experience. For each bundle:
        1. Name the bundle
        2. Explain what's included and why these services work well together
        3. Suggest a discount percentage (5-20%)
        
        Format as JSON array with: { name, description, discount, totalSavings }`,
        response_json_schema: {
          type: "object",
          properties: {
            bundles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  discount: { type: "number" },
                  totalSavings: { type: "number" }
                }
              }
            }
          }
        }
      });
      setSuggestedBundles(response.bundles || []);
    } catch (error) {
      console.error("Bundle suggestion error:", error);
    } finally {
      setLoadingBundles(false);
    }
  };

  useEffect(() => {
    if (cart.length >= 2) {
      generateBundleSuggestions();
    }
  }, [cart.length]);

  const serviceIcon = {
    experience: "🎯",
    travel: "✈️",
    car_rental: "🚗",
    food_order: "🍔"
  };

  return (
    <div className="w-full space-y-4">
      {/* Cart Items */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-white font-semibold">Your Cart ({cart.length})</h3>
        {cart.length === 0 ? (
          <p className="text-gray-400 text-sm">No items added yet</p>
        ) : (
          <AnimatePresence>
            {cart.map((item, idx) => (
              <motion.div
                key={item.cartId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-start justify-between p-3 bg-white/5 rounded-xl"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{serviceIcon[item.type] || "📦"}</span>
                    <span className="text-white font-medium text-sm">{item.title || item.name}</span>
                  </div>
                  {item.date && (
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <Clock className="w-3 h-3" /> {item.date}
                    </div>
                  )}
                  {item.location && (
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <MapPin className="w-3 h-3" /> {item.location}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-sm">${(item.price || 0).toFixed(2)}</p>
                  <button
                    onClick={() => removeFromCart(item.cartId)}
                    className="text-red-400 hover:text-red-300 transition mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Bundle Suggestions */}
      {suggestedBundles.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h3 className="text-white font-semibold">AI-Optimized Bundles</h3>
          </div>
          {loadingBundles ? (
            <p className="text-gray-400 text-sm animate-pulse">Generating bundle suggestions...</p>
          ) : (
            <div className="space-y-2">
              {suggestedBundles.map((bundle, idx) => (
                <button
                  key={idx}
                  className="w-full p-3 bg-white/10 hover:bg-white/15 rounded-xl text-left transition group"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-white font-semibold text-sm">{bundle.name}</p>
                      <p className="text-gray-400 text-xs">{bundle.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-green-400 font-bold text-sm">{bundle.discount}% off</p>
                      <p className="text-gray-400 text-xs">Save ${bundle.totalSavings.toFixed(2)}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pricing Summary */}
      {cart.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-gray-300 text-sm">
            <span>Subtotal</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-300 text-sm">
            <span>Service Fee (5%)</span>
            <span>${(total * 0.05).toFixed(2)}</span>
          </div>
          <div className="border-t border-white/10 pt-2 flex justify-between text-white font-bold">
            <span>Total</span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {(total * 1.05).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Checkout Button */}
      {cart.length > 0 && (
        <button
          onClick={() => onCheckout(cart, total * 1.05)}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
        >
          <span>Proceed to Checkout</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}