import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Undo2, DollarSign, MessageCircle, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function RequestRefundModal({ currentUser, onClose }) {
  const [selectedTx, setSelectedTx] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Payments the current user SENT — they can ask the recipient for a refund
  const { data: sentPayments = [] } = useQuery({
    queryKey: ['refund-eligible-payments', currentUser?.email],
    queryFn: async () => {
      const sent = await base44.entities.Payment.filter({ sender_email: currentUser.email });
      return sent
        .filter(p => p.recipient_email && p.recipient_email !== currentUser.email && (p.amount_usd || 0) > 0)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 20);
    },
    enabled: !!currentUser
  });

  const handleSelect = (tx) => {
    setSelectedTx(tx);
    setAmount(String(tx.amount_usd || ""));
  };

  const handleRequest = async () => {
    const refundAmount = parseFloat(amount);
    if (!selectedTx) {
      toast.error("Select a transaction to refund");
      return;
    }
    if (isNaN(refundAmount) || refundAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      await base44.entities.PaymentRequest.create({
        request_type: "refund_request",
        requester_email: currentUser.email,
        requester_name: currentUser.full_name || currentUser.email,
        payer_email: selectedTx.recipient_email,
        amount: refundAmount,
        note: note || `Refund request for "${selectedTx.memo || 'payment'}"`,
        original_payment_id: selectedTx.id,
        status: "pending"
      });

      await base44.entities.Notification.create({
        recipient_email: selectedTx.recipient_email,
        type: "payment_received",
        title: "↩️ Refund Requested",
        message: `${currentUser.full_name || currentUser.email} requested a $${refundAmount.toFixed(2)} refund${note ? `: "${note}"` : ''}`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        read: false,
        action_url: "/Wallet"
      });

      toast.success("Refund request sent!", {
        description: "They'll be notified to review and approve it.",
        duration: 5000,
      });
      onClose();
    } catch (err) {
      console.error("Refund request failed:", err);
      toast.error("Couldn't send refund request", { description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 flex items-center justify-between sticky top-0">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Undo2 className="w-6 h-6" /> Request Refund
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" /> Select a Payment
              </label>
              {sentPayments.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-gray-400 text-sm">No eligible payments to refund.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {sentPayments.map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => handleSelect(tx)}
                      className={`w-full px-4 py-3 rounded-xl text-left transition border ${
                        selectedTx?.id === tx.id
                          ? "bg-amber-500/20 border-amber-500/50"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm truncate">{tx.memo || tx.reference_type}</p>
                          <p className="text-gray-400 text-xs truncate">
                            To {tx.recipient_email} • {new Date(tx.created_date).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-red-400 font-bold text-sm ml-3">${(tx.amount_usd || 0).toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedTx && (
              <>
                <div>
                  <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-400" /> Refund Amount
                  </label>
                  <Input
                    type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" className="bg-white/10 border-white/20 text-white text-2xl"
                  />
                </div>
                <div>
                  <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-amber-400" /> Reason (Optional)
                  </label>
                  <Input
                    value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="Why are you requesting a refund?" className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <Button
                  onClick={handleRequest}
                  disabled={loading || !amount}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 py-6 text-lg"
                >
                  {loading ? "Sending..." : `Request $${amount || "0"} Refund`}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}