import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { X, Truck, MapPin, Package, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { dispatchInventoryDelivery } from "@/functions/dispatchInventoryDelivery";

export default function CustomerOrderCheckout({ product, storeSettings, currentUser, onClose, onSuccess }) {
  const fulfillment = storeSettings?.fulfillment_options || {};

  const [step, setStep] = useState(1); // 1 = method, 2 = details, 3 = confirm
  const [method, setMethod] = useState(null);
  const [carrier, setCarrier] = useState("");
  const [address, setAddress] = useState({ street: "", city: "", state: "", zip: "" });
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [placing, setPlacing] = useState(false);

  const shippingFee = fulfillment.shipping_enabled
    ? (fulfillment.free_shipping_threshold > 0 && product.base_price * quantity >= fulfillment.free_shipping_threshold
        ? 0
        : (fulfillment.shipping_fee || 0))
    : 0;
  const handlingFee = method === "shipping" ? (fulfillment.handling_fee || 0) : 0;
  const deliveryFee = method === "local_delivery" ? (fulfillment.local_delivery_fee || 5) : 0;
  const subtotal = product.base_price * quantity;
  const total = subtotal + (method === "shipping" ? shippingFee + handlingFee : 0) + deliveryFee;

  const availableMethods = [
    fulfillment.pickup_enabled && { id: "pickup", label: "In-Store Pickup", sublabel: "Free — ready when store confirms", icon: MapPin, color: "teal" },
    fulfillment.shipping_enabled && { id: "shipping", label: "Ship to Me", sublabel: `$${(shippingFee + handlingFee).toFixed(2)} shipping & handling`, icon: Truck, color: "blue" },
    fulfillment.local_delivery_enabled && { id: "local_delivery", label: "Local Delivery", sublabel: `$${deliveryFee.toFixed(2)} — delivered by a driver`, icon: Package, color: "orange" },
  ].filter(Boolean);

  const handlePlaceOrder = async () => {
    if (!currentUser) { toast.error("Please sign in to place an order"); return; }
    if (method === "shipping" && (!address.street || !address.city || !address.state || !address.zip)) {
      toast.error("Please fill in your complete shipping address"); return;
    }
    if (method === "local_delivery" && (!address.street || !address.city)) {
      toast.error("Please fill in your delivery address"); return;
    }
    if (method === "shipping" && !carrier) {
      toast.error("Please choose a shipping carrier"); return;
    }

    setPlacing(true);
    const order = await base44.entities.Order.create({
      order_type: "inventory",
      user_email: currentUser.email,
      product_id: product.id,
      product_name: product.name,
      quantity,
      item_price: product.base_price,
      subtotal,
      shipping_cost: method === "shipping" ? shippingFee : 0,
      handling_fee: method === "shipping" ? handlingFee : 0,
      total_amount: total,
      fulfillment_method: method,
      shipping_carrier: method === "shipping" ? carrier : undefined,
      shipping_address: (method === "shipping" || method === "local_delivery") ? JSON.stringify(address) : undefined,
      pickup_location: method === "pickup" ? (fulfillment.pickup_address || "") : undefined,
      provider_email: product.owner_email,
      status: "pending",
      customer_notes: notes || undefined,
    });

    // Auto-dispatch if local delivery
    if (method === "local_delivery") {
      try {
        await dispatchInventoryDelivery({ order_id: order.id });
      } catch (e) {
        // Non-critical — order is still placed
        console.error("Dispatch failed:", e);
      }
    }

    setPlacing(false);
    toast.success("Order placed successfully!");
    onSuccess && onSuccess(order);
  };

  const colorMap = { teal: "border-teal-500/50 bg-teal-500/10 text-teal-400", blue: "border-blue-500/50 bg-blue-500/10 text-blue-400", orange: "border-orange-500/50 bg-orange-500/10 text-orange-400" };
  const activeColor = method ? (availableMethods.find(m => m.id === method)?.color || "purple") : "purple";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-xl"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full md:max-w-lg bg-gray-900 rounded-t-3xl md:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <h2 className="text-white font-bold text-lg">Place Order</h2>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Product summary */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4">
            {product.image_url
              ? <img src={product.image_url} className="w-16 h-16 rounded-xl object-cover" alt="" />
              : <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center"><Package className="w-6 h-6 text-gray-500" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{product.name}</p>
              <p className="text-purple-400 font-bold">${product.base_price?.toFixed(2)}</p>
              {product.description && <p className="text-gray-500 text-xs truncate">{product.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">−</button>
              <span className="text-white font-bold w-6 text-center">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">+</button>
            </div>
          </div>

          {/* Step 1 — Choose fulfillment method */}
          <div>
            <p className="text-gray-400 text-sm font-medium mb-3">How would you like to receive your order?</p>
            <div className="space-y-2">
              {availableMethods.map(m => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition ${method === m.id ? colorMap[m.color] : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"}`}>
                  <m.icon className="w-5 h-5 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <p className={`font-semibold ${method === m.id ? "" : "text-white"}`}>{m.label}</p>
                    <p className="text-xs opacity-70">{m.sublabel}</p>
                  </div>
                  {method === m.id && <ChevronRight className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Details based on method */}
          {method === "shipping" && (
            <div className="space-y-3">
              <p className="text-white font-semibold">Shipping Address</p>
              <Input value={address.street} onChange={e => setAddress(a => ({ ...a, street: e.target.value }))}
                placeholder="Street address" className="bg-white/10 border-white/20 text-white" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                  placeholder="City" className="bg-white/10 border-white/20 text-white" />
                <Input value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                  placeholder="State" className="bg-white/10 border-white/20 text-white" />
              </div>
              <Input value={address.zip} onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))}
                placeholder="ZIP code" className="bg-white/10 border-white/20 text-white" />

              <div>
                <p className="text-white font-semibold mb-2">Choose Your Carrier</p>
                <div className="flex flex-wrap gap-2">
                  {(fulfillment.accepted_carriers || ["UPS","FedEx","USPS","DHL"]).map(c => (
                    <button key={c} onClick={() => setCarrier(c)}
                      className={`px-4 py-2 rounded-full border text-sm transition ${carrier === c ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/20 text-gray-400 hover:border-blue-500/50"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {method === "local_delivery" && (
            <div className="space-y-3">
              <p className="text-white font-semibold">Delivery Address</p>
              <Input value={address.street} onChange={e => setAddress(a => ({ ...a, street: e.target.value }))}
                placeholder="Street address" className="bg-white/10 border-white/20 text-white" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                  placeholder="City" className="bg-white/10 border-white/20 text-white" />
                <Input value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                  placeholder="State" className="bg-white/10 border-white/20 text-white" />
              </div>
              <Input value={address.zip} onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))}
                placeholder="ZIP code" className="bg-white/10 border-white/20 text-white" />
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                <p className="text-orange-300 text-xs">🚴 A local driver will be assigned to pick up and deliver your order. The driver earns 85% of the delivery fee.</p>
              </div>
            </div>
          )}

          {method === "pickup" && fulfillment.pickup_address && (
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 space-y-1">
              <p className="text-teal-300 text-sm font-semibold">📍 Pickup Location</p>
              <p className="text-white text-sm">{fulfillment.pickup_address}</p>
              {fulfillment.pickup_instructions && <p className="text-gray-400 text-xs">{fulfillment.pickup_instructions}</p>}
              <p className="text-gray-500 text-xs mt-2">You'll receive an email when your order is ready for pickup.</p>
            </div>
          )}

          {/* Notes */}
          {method && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Special Instructions (optional)</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any special requests or notes..."
                className="bg-white/10 border-white/20 text-white" />
            </div>
          )}

          {/* Order Summary */}
          {method && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
              <p className="text-white font-semibold mb-3">Order Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{product.name} × {quantity}</span>
                <span className="text-white">${subtotal.toFixed(2)}</span>
              </div>
              {method === "shipping" && (shippingFee + handlingFee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Shipping & Handling</span>
                  <span className="text-white">${(shippingFee + handlingFee).toFixed(2)}</span>
                </div>
              )}
              {method === "shipping" && shippingFee === 0 && fulfillment.free_shipping_threshold > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">Free Shipping Applied 🎉</span>
                  <span className="text-green-400">$0.00</span>
                </div>
              )}
              {method === "local_delivery" && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Delivery Fee</span>
                  <span className="text-white">${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t border-white/10">
                <span className="text-white">Total</span>
                <span className="text-purple-400 text-lg">${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Place Order */}
          <Button onClick={handlePlaceOrder} disabled={!method || placing}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 text-base">
            {placing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing Order...</> : "Place Order"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}