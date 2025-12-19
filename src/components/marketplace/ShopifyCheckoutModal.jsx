import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ShoppingCart, Loader2, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ShopifyCheckoutModal({ product, onClose }) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US"
  });

  const handleCheckout = async () => {
    if (!shippingAddress.name || !shippingAddress.line1 || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.postal_code) {
      toast.error('Please fill in all required shipping fields');
      return;
    }

    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('createShopifyCheckout', {
        product_id: product.id,
        quantity,
        shipping_address: shippingAddress
      });

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      toast.error('Checkout failed. Please try again.');
      setLoading(false);
    }
  };

  const subtotal = product.price * quantity;
  const shipping = 5.00;
  const platformFee = (subtotal + shipping) * 0.05;
  const total = subtotal + shipping + platformFee;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl border border-white/10 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 border-b border-white/10 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Complete Your Order</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Summary */}
          <div className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <img src={product.image_url || product.image} alt={product.title} className="w-24 h-24 object-cover rounded-lg" />
            <div className="flex-1">
              <h3 className="text-white font-bold mb-1">{product.title}</h3>
              <p className="text-gray-400 text-sm mb-2 line-clamp-2">{product.description}</p>
              <div className="flex items-center gap-4">
                <span className="text-purple-400 font-bold text-lg">${product.price}</span>
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 text-sm">Qty:</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-20 bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-purple-400" />
              <h3 className="text-white font-bold">Shipping Address</h3>
            </div>

            <Input
              placeholder="Full Name *"
              value={shippingAddress.name}
              onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
              className="bg-white/10 border-white/20 text-white placeholder-gray-500"
            />

            <Input
              placeholder="Street Address *"
              value={shippingAddress.line1}
              onChange={(e) => setShippingAddress({ ...shippingAddress, line1: e.target.value })}
              className="bg-white/10 border-white/20 text-white placeholder-gray-500"
            />

            <Input
              placeholder="Apt, Suite, etc. (Optional)"
              value={shippingAddress.line2}
              onChange={(e) => setShippingAddress({ ...shippingAddress, line2: e.target.value })}
              className="bg-white/10 border-white/20 text-white placeholder-gray-500"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="City *"
                value={shippingAddress.city}
                onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder-gray-500"
              />
              <Input
                placeholder="State *"
                value={shippingAddress.state}
                onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder-gray-500"
              />
            </div>

            <Input
              placeholder="ZIP Code *"
              value={shippingAddress.postal_code}
              onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
              className="bg-white/10 border-white/20 text-white placeholder-gray-500"
            />
          </div>

          {/* Affiliate Commission Notice */}
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h4 className="text-white font-bold mb-1">You Earn Commission!</h4>
                <p className="text-green-300 text-sm">
                  5% affiliate commission (${(subtotal * 0.05).toFixed(2)}) will be instantly added to your wallet after purchase
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6">
            <h3 className="text-white font-bold mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal ({quantity} item{quantity > 1 ? 's' : ''})</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Shipping & Handling</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Platform Service Fee (5%)</span>
                <span>${platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-400 bg-green-500/10 rounded-lg px-2 py-1">
                <span className="font-semibold">Your Commission (instant)</span>
                <span className="font-bold">+${(subtotal * 0.05).toFixed(2)}</span>
              </div>
              <div className="border-t border-white/20 pt-2 mt-2">
                <div className="flex justify-between text-white font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Proceed to Payment
              </>
            )}
          </Button>

          <p className="text-gray-400 text-xs text-center">
            Secure checkout powered by Stripe • All payments are encrypted
          </p>
        </div>
      </motion.div>
    </div>
  );
}