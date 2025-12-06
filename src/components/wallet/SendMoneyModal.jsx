import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, User, DollarSign, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function SendMoneyModal({ currentUser, onClose }) {
  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!recipient || !amount) {
      alert("Please enter recipient and amount");
      return;
    }

    setLoading(true);
    try {
      await base44.entities.P2PTransaction.create({
        sender_email: currentUser.email,
        recipient_email: recipient,
        amount: parseFloat(amount),
        currency,
        message,
        transaction_type: "send",
        status: "completed"
      });

      // Create notification for recipient
      await base44.entities.Notification.create({
        recipient_email: recipient,
        type: "payment_received",
        title: "Money Received",
        message: `${currentUser.full_name} sent you $${amount}`,
        reference_type: "transaction"
      });

      setStep(2);
    } catch (err) {
      console.error("Send failed:", err);
      alert("Failed to send money: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
                    Recipient Email or Username
                  </label>
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="friend@example.com"
                    className="bg-white/10 border-white/20 text-white"
                  />
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
                    {["USD", "SoFloCoin", "BTC", "ETH"].map((curr) => (
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
                  disabled={loading}
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
                  ${amount} sent to {recipient}
                </p>
                <Button onClick={onClose} className="w-full bg-purple-600">
                  Done
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}