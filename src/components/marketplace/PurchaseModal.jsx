import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, ShoppingCart, DollarSign, CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PaymentConfirmation from "../payment/PaymentConfirmation";

export default function PurchaseModal({ item, currentUser, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [processing, setProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const subtotal = (item.price || 0) * quantity;
  const platformFee = subtotal * 0.05;
  const total = subtotal + platformFee;

  const handlePurchase = async () => {
    if (!shippingAddress && item.category !== "digital") {
      toast.error("Please enter shipping address");
      return;
    }

    if (paymentMethod === "wallet" && currentUser.balance_usd < total) {
      toast.error("Insufficient wallet balance");
      return;
    }

    setProcessing(true);
    try {
      // Deduct from buyer's wallet
      if (paymentMethod === "wallet") {
        await base44.auth.updateMe({
          balance_usd: currentUser.balance_usd - total
        });
      }

      // Create order
      const order = await base44.entities.Order.create({
        order_type: "marketplace",
        user_email: currentUser.email,
        product_id: item.id,
        product_name: item.title,
        quantity,
        item_price: item.price,
        subtotal,
        platform_fee: platformFee,
        total_amount: total,
        status: "pending",
        shipping_address: shippingAddress,
        provider_email: item.provider_email || item.created_by
      });

      // Create payment record
      await base44.entities.Payment.create({
        amount_usd: total,
        amount_rri: 0,
        method: paymentMethod,
        status: "completed",
        reference_type: "order",
        reference_id: order.id,
        sender_email: currentUser.email,
        recipient_email: item.provider_email || item.created_by,
        memo: `Purchase: ${item.title}`
      });

      // Notify provider
      await base44.entities.Notification.create({
        recipient_email: item.provider_email || item.created_by,
        type: "booking_requests",
        title: "New Order",
        message: `${currentUser.full_name || currentUser.email} ordered ${quantity}x ${item.title} for $${total.toFixed(2)}`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        reference_type: "order",
        reference_id: order.id,
        read: false
      });

      setShowConfirmation(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Purchase failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {showConfirmation && (
        <PaymentConfirmation
          amount={total}
          currency="USD"
          recipient={item.provider_name || "Provider"}
          type="order"
          onClose={() => {
            setShowConfirmation(false);
            onClose();
          }}
        />
      )}

      {!showConfirmation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-gray-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Complete Purchase</h2>
              <button onClick={onClose}>
                <X className="w-6 h-6 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Item Details */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              {/* Shipping Address */}
              {item.category !== "digital" && (
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Shipping Address</label>
                  <Textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Enter your full shipping address..."
                    className="bg-white/10 border-white/20 text-white"
                    rows={3}
                  />
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Payment Method</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setPaymentMethod("wallet")}
                    className={`w-full p-4 rounded-xl border-2 transition ${
                      paymentMethod === "wallet"
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-white/20 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-purple-400" />
                        <span className="text-white">Wallet Balance</span>
                      </div>
                      <span className="text-gray-400">${currentUser?.balance_usd?.toFixed(2) || "0.00"}</span>
                    </div>
                  </button>
                </div>

                {paymentMethod === "wallet" && currentUser.balance_usd < total && (
                  <div className="mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
                    Insufficient balance. Please add funds to your wallet.
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal ({quantity}x ${item.price})</span>
                    <span className="text-white">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Platform Fee (5%)</span>
                    <span className="text-white">${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-white font-bold text-lg">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <Button
                onClick={handlePurchase}
                disabled={processing || (paymentMethod === "wallet" && currentUser.balance_usd < total)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6"
              >
                {processing ? "Processing..." : `Pay $${total.toFixed(2)}`}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}