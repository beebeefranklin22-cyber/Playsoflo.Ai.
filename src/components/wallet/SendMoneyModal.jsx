import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, User, DollarSign, MessageCircle, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { processP2PPayment } from "@/functions/processP2PPayment";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import PaymentConfirmation from "../payment/PaymentConfirmation";

export default function SendMoneyModal({ currentUser, onClose }) {
  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Search for users
  const { data: searchResults = [] } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const users = await base44.entities.User.filter({});
      return users.filter(u => 
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);
    },
    enabled: searchQuery.length >= 2
  });

  const handleSend = async () => {
    if (!recipient || !amount) {
      toast.error("Please enter recipient and amount");
      return;
    }

    setLoading(true);
    try {
      const sendAmount = parseFloat(amount);

      // Verify recipient exists
      const recipientUsers = await base44.entities.User.filter({});
      const recipientUser = recipientUsers.find(u => u.email === recipient);
      
      if (!recipientUser) {
        toast.error("Recipient not found");
        setLoading(false);
        return;
      }

      if (currency === "USD") {
        // Check sender balance
        if (currentUser.balance_usd < sendAmount) {
          toast.error("Insufficient USD balance");
          setLoading(false);
          return;
        }

        // Deduct from sender
        await base44.auth.updateMe({
          balance_usd: currentUser.balance_usd - sendAmount
        });

        // Add to recipient using service role
        await base44.asServiceRole.entities.User.update(recipientUser.id, {
          balance_usd: (recipientUser.balance_usd || 0) + sendAmount
        });

        // Create payment record
        await base44.entities.Payment.create({
          amount_usd: sendAmount,
          amount_rri: 0,
          method: "internal_transfer",
          status: "completed",
          reference_type: "sent",
          sender_email: currentUser.email,
          recipient_email: recipient,
          memo: message || `Transfer to ${recipientUser.full_name || recipient}`
        });

        // Create notification with sound
        await base44.entities.Notification.create({
          recipient_email: recipient,
          type: "payment_received",
          title: "Money Received",
          message: `${currentUser.full_name || currentUser.email} sent you $${sendAmount.toFixed(2)}${message ? `: "${message}"` : ''}`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          read: false
        });
      } else if (currency === "SoFloCoin") {
        const currentCoins = currentUser.soflo_coins || 0;
        if (currentCoins < sendAmount) {
          toast.error("Insufficient SoFloCoin balance");
          setLoading(false);
          return;
        }

        // Atomic SoFloCoin transfer
        const senderNewCoins = currentCoins - sendAmount;
        const recipientCoins = recipientUser.soflo_coins || 0;
        const recipientNewCoins = recipientCoins + sendAmount;

        await base44.auth.updateMe({
          soflo_coins: senderNewCoins
        });

        await base44.asServiceRole.entities.User.update(recipientUser.id, {
          soflo_coins: recipientNewCoins
        });

        // Create payment records
        await base44.entities.Payment.create({
          amount_usd: 0,
          amount_rri: sendAmount,
          method: "internal_transfer",
          status: "completed",
          reference_type: "sent",
          sender_email: currentUser.email,
          recipient_email: recipient,
          memo: message || `SoFloCoin transfer to ${recipientUser.full_name || recipient}`
        });

        // Notification with sound
        await base44.entities.Notification.create({
          recipient_email: recipient,
          type: "payment_received",
          title: "SoFloCoin Received",
          message: `${currentUser.full_name || currentUser.email} sent you ${sendAmount} SFC${message ? `: "${message}"` : ''}`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          read: false
        });
      }

      setShowConfirmation(true);
    } catch (err) {
      console.error("Send failed:", err);
      toast.error(err?.message || "Failed to send money");
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
          recipient={searchQuery}
          type="transfer"
          onClose={() => {
            setShowConfirmation(false);
            onClose();
            window.location.reload();
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

          <div className="p-6">
            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-400" />
                    Recipient
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setRecipient(e.target.value);
                      }}
                      placeholder="Search by name or email..."
                      className="bg-white/10 border-white/20 text-white pl-10"
                    />
                  </div>
                  
                  {searchResults.length > 0 && searchQuery.length >= 2 && (
                    <div className="mt-2 bg-white/10 border border-white/20 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setRecipient(user.email);
                            setSearchQuery(user.full_name || user.email);
                          }}
                          className="w-full px-4 py-3 hover:bg-white/10 transition text-left flex items-center gap-3"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.full_name?.[0] || user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.full_name || 'User'}</p>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-white font-semibold mb-3 block flex items-center gap-2">
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
                          currency === curr
                            ? "bg-purple-600 text-white"
                            : "bg-white/10 text-gray-300 hover:bg-white/20"
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-white font-semibold mb-3 block flex items-center gap-2">
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
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Send className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Money Sent!</h3>
                <p className="text-gray-300 mb-6">
                  {amount} {currency} sent to {recipient}
                </p>
                <Button onClick={() => { onClose(); window.location.reload(); }} className="w-full bg-purple-600">
                  Done
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
      )}
    </>
  );
}