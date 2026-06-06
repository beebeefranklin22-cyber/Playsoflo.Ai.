import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  X, CheckCircle, ArrowRight, MapPin, Package, Truck,
  CreditCard, Shield, Star, Minus, Plus, FileText, MessageSquare
} from "lucide-react";
import StripePaymentForm from "../payment/StripePaymentForm";

export default function EcommerceOrderModal({ item, currentUser, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=details, 2=review, 3=payment, 4=confirmed
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({
    delivery_address: "",
    city: "",
    state: "",
    zip: "",
    phone: currentUser?.phone || "",
    delivery_notes: "",
    delivery_type: "delivery", // or "pickup"
  });
  const [orderId, setOrderId] = useState(null);

  const unitPrice = item.price || 0;
  const subtotal = unitPrice * quantity;
  const deliveryFee = form.delivery_type === "delivery" ? (subtotal >= 50 ? 0 : 4.99) : 0;
  const total = subtotal + deliveryFee;

  const maxQty = item.originalData?.stock_quantity || 99;

  const handleProceed = () => {
    if (form.delivery_type === "delivery") {
      if (!form.delivery_address) return toast.error("Please enter your delivery address");
      if (!form.city) return toast.error("Please enter your city");
    }
    if (!form.phone) return toast.error("Please enter your phone number");
    setStep(2);
  };

  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      const providerEmail = item.provider_email || item.created_by;
      const fullAddress = form.delivery_type === "delivery"
        ? `${form.delivery_address}, ${form.city}, ${form.state} ${form.zip}`.trim()
        : "Customer pickup";

      // Create order record
      const order = await base44.entities.Order.create({
        order_type: item.category,
        item_id: item.originalData?.id || item.id,
        item_title: item.title,
        quantity,
        total_usd: total,
        pickup: form.delivery_type === "pickup",
        delivery_address: fullAddress,
        status: "confirmed",
        provider_email: providerEmail,
        payment_intent_id: paymentIntentId,
        customer_phone: form.phone,
        notes: form.delivery_notes,
      });

      setOrderId(order.id);

      // Dispatch delivery / fulfillment
      try {
        const dispatchFn = item.itemType === "inventory_product" ? "dispatchInventoryDelivery" : "dispatchProductOrder";
        await base44.functions.invoke(dispatchFn, {
          order_id: order.id,
          item_title: item.title,
          provider_email: providerEmail,
          delivery_address: fullAddress,
          quantity,
          price: total,
          payment_intent_id: paymentIntentId,
          pickup: form.delivery_type === "pickup",
        });
      } catch (e) {
        console.error("Dispatch error (non-fatal):", e);
      }

      // Notifications
      try {
        await base44.functions.invoke("sendBookingNotification", {
          recipientEmail: providerEmail,
          type: "new_order",
          bookingId: order.id,
          bookingTitle: `Order: ${item.title} x${quantity}`,
          customerName: currentUser.full_name,
          totalPrice: total,
        });
        await base44.functions.invoke("sendBookingNotification", {
          recipientEmail: currentUser.email,
          type: "order_confirmed",
          bookingId: order.id,
          bookingTitle: item.title,
          totalPrice: total,
          providerName: item.provider_name,
        });
      } catch (e) { /* non-fatal */ }

      if (window.NativeAppBridge?.triggerHaptic) window.NativeAppBridge.triggerHaptic("success");
      setStep(4);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error("Order failed: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        className="w-full sm:max-w-lg bg-gray-950 rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[95vh] flex flex-col"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 p-5 flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-blue-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{item.title}</h2>
              <p className="text-blue-300 text-sm">by {item.provider_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/80 mt-2">
            <span className="font-bold text-white">${unitPrice.toFixed(2)} each</span>
            {item.rating && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {item.rating}
              </span>
            )}
            {item.originalData?.stock_quantity > 0 && (
              <span className="text-green-300">{item.originalData.stock_quantity} in stock</span>
            )}
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all ${step >= s ? "bg-blue-400" : "bg-white/20"}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          <AnimatePresence mode="wait">

            {/* Step 1: Delivery Details */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {/* Quantity */}
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Quantity</label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-white font-bold text-xl w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                      className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Delivery type */}
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Fulfillment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["delivery", "pickup"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setForm({ ...form, delivery_type: t })}
                        className={`py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${form.delivery_type === t ? "bg-blue-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}
                      >
                        {t === "delivery" ? <Truck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                        {t === "delivery" ? "Deliver to me" : "I'll pick up"}
                      </button>
                    ))}
                  </div>
                </div>

                {form.delivery_type === "delivery" && (
                  <>
                    <div>
                      <label className="text-gray-300 text-sm mb-1 block flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Street Address *
                      </label>
                      <input
                        type="text"
                        placeholder="123 Main St, Apt 4B"
                        value={form.delivery_address}
                        onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text" placeholder="City *"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                      />
                      <input
                        type="text" placeholder="State"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                    <input
                      type="text" placeholder="ZIP Code"
                      value={form.zip}
                      onChange={(e) => setForm({ ...form, zip: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </>
                )}

                <div>
                  <label className="text-gray-300 text-sm mb-1 block">Phone Number *</label>
                  <input
                    type="tel" placeholder="Your phone number"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-sm mb-1 block flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Delivery Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Leave at door, ring bell, etc."
                    value={form.delivery_notes}
                    onChange={(e) => setForm({ ...form, delivery_notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
                  />
                </div>

                {/* Price summary */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal ({quantity}x)</span><span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Delivery</span>
                    <span>{deliveryFee === 0 ? <span className="text-green-400">FREE</span> : `$${deliveryFee.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold border-t border-white/10 pt-2">
                    <span>Total</span><span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleProceed}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white font-bold hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  Review Order <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-white font-bold text-lg">Review Your Order</h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 text-sm">
                  <Row label="Item" value={item.title} />
                  <Row label="Quantity" value={quantity} />
                  <Row label="Seller" value={item.provider_name} />
                  <Row label="Fulfillment" value={form.delivery_type === "delivery" ? "Home Delivery" : "Store Pickup"} />
                  {form.delivery_type === "delivery" && (
                    <Row label="Deliver to" value={`${form.delivery_address}, ${form.city}`} />
                  )}
                  <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                  <Row label="Delivery Fee" value={deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`} />
                  <div className="border-t border-white/10 pt-3 flex justify-between">
                    <span className="text-gray-400 font-bold">Total</span>
                    <span className="text-white font-bold text-xl">${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-300 text-sm">
                  ⚠️ You are about to pay <strong>${total.toFixed(2)}</strong>. The seller will be notified immediately to prepare your order.
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition">
                    Edit Order
                  </button>
                  <button onClick={() => setStep(3)} className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
                    <CreditCard className="w-4 h-4" /> Pay ${total.toFixed(2)}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-white font-bold text-lg">Secure Payment</h3>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-sm text-blue-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>Payment secured by Stripe. Seller is notified instantly. Driver dispatched for delivery.</span>
                </div>
                <StripePaymentForm
                  amount={total}
                  description={`${item.title} x${quantity}`}
                  recipientEmail={item.provider_email || item.created_by}
                  onSuccess={handlePaymentSuccess}
                  metadata={{ type: "product_order", item_id: item.id, quantity, category: item.category }}
                />
                <button onClick={() => setStep(2)} className="w-full py-3 bg-white/10 border border-white/20 rounded-xl text-gray-300 hover:bg-white/20 transition text-sm">
                  ← Back
                </button>
              </motion.div>
            )}

            {/* Step 4: Confirmed */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Order Confirmed!</h3>
                <p className="text-gray-300">
                  <strong>{item.provider_name}</strong> has been notified. {form.delivery_type === "delivery" ? "A driver will be assigned for delivery." : "Your item will be ready for pickup."}
                </p>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left text-sm space-y-2">
                  <Row label="Item" value={`${item.title} x${quantity}`} />
                  <Row label="Total Paid" value={`$${total.toFixed(2)}`} highlight />
                  <Row label="Fulfillment" value={form.delivery_type === "delivery" ? "Home Delivery" : "Pickup"} />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(createPageUrl("FoodOrderTracking"))}
                    className="flex-1 py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> Track Order
                  </button>
                  <button onClick={onClose} className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl text-gray-300 hover:bg-white/20 transition">
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-right ${highlight ? "text-green-400 font-bold text-base" : "text-white"}`}>{value}</span>
    </div>
  );
}