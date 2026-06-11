import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, HandshakeIcon, DollarSign, MessageSquare, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function MakeOfferModal({ item, currentUser, onClose }) {
  const [offerAmount, setOfferAmount] = useState(item?.price ? String(item.price) : "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!offerAmount || isNaN(parseFloat(offerAmount)) || parseFloat(offerAmount) <= 0) {
      return toast.error("Please enter a valid offer amount");
    }
    setSubmitting(true);
    try {
      // Create a P2P order for services/products (no crypto)
      await base44.entities.P2POrder.create({
        order_type: "buy",
        crypto_currency: null,
        crypto_amount: null,
        fiat_currency: "USD",
        total_amount: parseFloat(offerAmount),
        price_per_unit: parseFloat(offerAmount),
        payment_method: "in_app",
        seller_email: item.provider_email || item.created_by,
        buyer_email: currentUser.email,
        status: "active",
        terms: note || `Offer for: ${item.title}`,
        item_title: item.title,
        item_category: item.category,
        item_type: "service_product",
        original_price: item.price,
      });

      // Notify the provider
      await base44.entities.Notification.create({
        recipient_email: item.provider_email || item.created_by,
        type: "message",
        title: `New offer on "${item.title}"`,
        message: `${currentUser.full_name} offered $${parseFloat(offerAmount).toFixed(2)}${note ? ` — "${note}"` : ""}`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_photo: currentUser.profile_picture,
        read: false,
      });

      setDone(true);
      toast.success("Offer sent to provider!");
      setTimeout(onClose, 1800);
    } catch (err) {
      toast.error("Failed to send offer: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-orange-600/20 to-red-600/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500/30 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-bold">Make an Offer</h2>
              <p className="text-gray-400 text-xs">Negotiate directly with the provider</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
            <CheckCircle className="w-14 h-14 text-green-400" />
            <h3 className="text-white text-lg font-bold">Offer Sent!</h3>
            <p className="text-gray-400 text-sm">The provider has been notified of your offer.</p>
          </div>
        ) : (
          <div className="p-6 space-y-5" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}>
            {/* Item preview */}
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
              {item.image_url && (
                <img src={item.image_url} alt={item.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{item.title}</p>
                <p className="text-gray-400 text-xs">by {item.provider_name}</p>
                <p className="text-orange-400 text-sm font-bold mt-0.5">
                  Listed at ${Number(item.price || 0).toFixed(2)}/{item.price_type || "item"}
                </p>
              </div>
            </div>

            {/* Offer amount */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Your Offer (USD) *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder={String(item.price || "0.00")}
                  value={offerAmount}
                  onChange={e => setOfferAmount(e.target.value)}
                  className="bg-white/10 border-white/20 text-white pl-8 text-lg font-bold"
                />
              </div>
              {item.price && parseFloat(offerAmount) > 0 && parseFloat(offerAmount) < item.price && (
                <p className="text-xs text-orange-400 mt-1">
                  {Math.round((1 - parseFloat(offerAmount) / item.price) * 100)}% below listed price
                </p>
              )}
            </div>

            {/* Note to provider */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Message to Provider (optional)</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  placeholder="Explain your offer, request modifications, ask questions..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600 resize-none"
                />
              </div>
            </div>

            {/* Trust note */}
            <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-300 text-xs">
                Your offer is sent directly to the provider. Payment is only processed after both parties agree and the service is completed.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1 border-white/20 text-white hover:bg-white/10">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold"
              >
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send Offer"}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}