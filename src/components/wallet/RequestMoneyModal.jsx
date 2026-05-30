import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, HandCoins, User, DollarSign, MessageCircle, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function RequestMoneyModal({ currentUser, onClose }) {
  const [payer, setPayer] = useState("");
  const [payerName, setPayerName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults = [] } = useQuery({
    queryKey: ['request-user-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const users = await base44.entities.User.filter({});
      return users.filter(u => {
        if (u.email === currentUser.email) return false;
        const q = searchQuery.toLowerCase().replace(/^@/, '');
        return (
          u.username?.toLowerCase().includes(q) ||
          u.phone?.includes(searchQuery) ||
          u.full_name?.toLowerCase().includes(q)
        );
      }).slice(0, 5);
    },
    enabled: searchQuery.length >= 2
  });

  const handleRequest = async () => {
    const sendAmount = parseFloat(amount);
    if (!payer) {
      toast.error("Please choose who to request from");
      return;
    }
    if (isNaN(sendAmount) || sendAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      await base44.entities.PaymentRequest.create({
        request_type: "money_request",
        requester_email: currentUser.email,
        requester_name: currentUser.full_name || currentUser.email,
        payer_email: payer,
        payer_name: payerName,
        amount: sendAmount,
        note: note || undefined,
        status: "pending"
      });

      // Real-time notification so the payer gets an instant popup + toast
      await base44.entities.Notification.create({
        recipient_email: payer,
        type: "payment_received",
        title: "💸 Money Requested",
        message: `${currentUser.full_name || currentUser.email} requested $${sendAmount.toFixed(2)}${note ? `: "${note}"` : ''}`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        read: false,
        action_url: "/Wallet"
      });

      toast.success("Request sent!", {
        description: `${payerName || payer} will be notified to pay $${sendAmount.toFixed(2)}.`,
        duration: 5000,
      });
      onClose();
    } catch (err) {
      console.error("Request failed:", err);
      toast.error("Couldn't send request", { description: "Please try again." });
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
          className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <HandCoins className="w-6 h-6" /> Request Money
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" /> Request From
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPayer(""); }}
                  placeholder="@username or phone number..."
                  className="bg-white/10 border-white/20 text-white pl-10"
                />
              </div>
              {searchResults.length > 0 && searchQuery.length >= 2 && !payer && (
                <div className="mt-2 bg-white/10 border border-white/20 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setPayer(u.email);
                        setPayerName(u.full_name || u.username || u.email);
                        setSearchQuery(u.username ? `@${u.username}` : u.full_name || u.email);
                      }}
                      className="w-full px-4 py-3 hover:bg-white/10 transition text-left flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                        {u.full_name?.[0] || u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{u.full_name || 'User'}</p>
                        <p className="text-gray-400 text-sm">{u.username ? `@${u.username}` : u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" /> Amount
              </label>
              <Input
                type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" className="bg-white/10 border-white/20 text-white text-2xl"
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" /> Note (Optional)
              </label>
              <Input
                value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="What's this for?" className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <Button
              onClick={handleRequest}
              disabled={loading || !payer || !amount}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 py-6 text-lg"
            >
              {loading ? "Sending..." : `Request $${amount || "0"}`}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}