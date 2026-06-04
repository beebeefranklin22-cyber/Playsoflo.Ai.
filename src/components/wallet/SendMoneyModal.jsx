import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, User, DollarSign, MessageCircle, Search, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { secureBalanceUpdate } from "@/functions/secureBalanceUpdate";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import PaymentConfirmation from "../payment/PaymentConfirmation";

export default function SendMoneyModal({ currentUser, onClose }) {
  const [recipient, setRecipient] = useState(null); // full user object
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const debounceRef = useRef(null);
  const queryClient = useQueryClient();

  // Debounced search
  useEffect(() => {
    if (recipient) return; // don't search if recipient already picked
    clearTimeout(debounceRef.current);
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await base44.functions.invoke('searchUsers', { query: searchQuery });
        const results = (data?.users || []).filter(u => u.email !== currentUser?.email).slice(0, 8);
        setSearchResults(results);
      } catch (e) {
        console.error('Search error:', e);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, recipient, currentUser?.email]);

  const handleSend = async () => {
    if (!recipient?.email || !amount) {
      toast.error("Please select a recipient and enter an amount");
      return;
    }

    const sendAmount = parseFloat(amount);
    if (isNaN(sendAmount) || sendAmount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    setLoading(true);
    try {
      if (currency === "USD") {
        const { data } = await secureBalanceUpdate({
          operation: 'transfer',
          amount: sendAmount,
          recipient_email: recipient.email,
          reference_type: 'transfer',
          memo: message || undefined
        });

        if (data?.success) {
          queryClient.invalidateQueries({ queryKey: ['currentUser'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          setShowConfirmation(true);
        } else {
          toast.error(data?.error || "Transfer failed");
        }
      } else if (currency === "SoFloCoin") {
        // Use searchUsers to get the recipient's full record (has id)
        const { data } = await base44.functions.invoke('searchUsers', { query: recipient.email });
        const recipientUser = (data?.users || []).find(u => u.email === recipient.email);

        if (!recipientUser) {
          toast.error("Recipient not found");
          return;
        }

        const currentCoins = currentUser.soflo_coins || 0;
        if (currentCoins < sendAmount) {
          toast.error("Insufficient SoFloCoin balance");
          return;
        }

        await base44.auth.updateMe({ soflo_coins: currentCoins - sendAmount });
        await base44.asServiceRole.entities.User.update(recipientUser.id, {
          soflo_coins: (recipientUser.soflo_coins || 0) + sendAmount
        });
        await base44.entities.Payment.create({
          amount_usd: 0,
          amount_rri: sendAmount,
          method: "internal_transfer",
          status: "completed",
          reference_type: "sent",
          sender_email: currentUser.email,
          recipient_email: recipient.email,
          memo: message || `SoFloCoin transfer to ${recipient.full_name || recipient.email}`
        });
        await base44.entities.Notification.create({
          recipient_email: recipient.email,
          type: "payment_received",
          title: "SoFloCoin Received",
          message: `${currentUser.full_name || currentUser.email} sent you ${sendAmount} SFC${message ? `: "${message}"` : ''}`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          read: false
        });

        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        setShowConfirmation(true);
      }
    } catch (err) {
      console.error("Send failed:", err);
      const serverError = err?.response?.data?.error || err?.message || "";
      const lower = serverError.toLowerCase();
      if (lower.includes("insufficient")) {
        toast.error("Insufficient funds", { description: "You don't have enough balance.", duration: 6000 });
      } else if (lower.includes("not found") || lower.includes("invalid recipient")) {
        toast.error("Invalid recipient", { description: "We couldn't find that user.", duration: 6000 });
      } else {
        toast.error("Transfer failed", { description: serverError || "Something went wrong.", duration: 6000 });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showConfirmation && (
        <PaymentConfirmation
          amount={amount}
          currency={currency}
          recipient={recipient?.full_name || recipient?.username || recipient?.email}
          type="transfer"
          onClose={() => {
            setShowConfirmation(false);
            onClose();
          }}
        />
      )}
      
      {!showConfirmation && (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Send Money</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Recipient */}
            <div>
              <label className="text-white font-semibold mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" />
                Recipient
              </label>

              {/* Selected recipient chip */}
              {recipient ? (
                <div className="flex items-center gap-3 bg-purple-500/20 border border-purple-500/40 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {recipient.profile_picture
                      ? <img src={recipient.profile_picture} className="w-full h-full rounded-full object-cover" alt="" />
                      : (recipient.full_name?.[0] || recipient.email[0]).toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{recipient.full_name || recipient.email}</p>
                    <p className="text-purple-300 text-xs">{recipient.username ? `@${recipient.username}` : recipient.email}</p>
                  </div>
                  <button
                    onClick={() => { setRecipient(null); setSearchQuery(""); setSearchResults([]); }}
                    className="text-gray-400 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, @username, or email..."
                    className="bg-white/10 border-white/20 text-white pl-10"
                    autoFocus
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              )}

              {/* Dropdown results */}
              {!recipient && searchResults.length > 0 && (
                <div className="mt-2 bg-gray-800 border border-white/20 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id || user.email}
                      onClick={() => {
                        setRecipient(user);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="w-full px-4 py-3 hover:bg-white/10 transition text-left flex items-center gap-3 border-b border-white/5 last:border-0"
                    >
                      <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                        {user.profile_picture
                          ? <img src={user.profile_picture} className="w-full h-full object-cover" alt="" />
                          : (user.full_name?.[0] || user.email[0]).toUpperCase()
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate">{user.full_name || 'User'}</p>
                        <p className="text-gray-400 text-xs truncate">
                          {user.username ? `@${user.username}` : user.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!recipient && !searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="mt-2 text-gray-500 text-sm text-center py-2">No users found for "{searchQuery}"</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="text-white font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-400" />
                Amount
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-white/10 border-white/20 text-white text-2xl"
              />
              <div className="flex gap-2 mt-3">
                {["USD", "SoFloCoin"].map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setCurrency(curr)}
                    className={`px-4 py-2 rounded-xl transition ${
                      currency === curr ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-white font-semibold mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                Message (Optional)
              </label>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's this for?"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={loading || !recipient || !amount}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-6 text-lg"
            >
              {loading ? "Sending..." : `Send ${amount || "0"} ${currency}`}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
      )}
    </>
  );
}