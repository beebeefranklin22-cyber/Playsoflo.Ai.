import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Heart, Star, Zap, DollarSign, X, Sparkles, Crown, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import StripePaymentForm from "../payment/StripePaymentForm";

const QUICK_TIPS = [
  { amount: 5,   label: "$5",   icon: Heart,    gradient: "from-pink-500 to-rose-500",    emoji: "💗" },
  { amount: 10,  label: "$10",  icon: Star,     gradient: "from-yellow-500 to-amber-500", emoji: "⭐" },
  { amount: 25,  label: "$25",  icon: Gift,     gradient: "from-purple-500 to-violet-600",emoji: "🎁" },
  { amount: 50,  label: "$50",  icon: Zap,      gradient: "from-blue-500 to-cyan-500",   emoji: "⚡" },
  { amount: 100, label: "$100", icon: Crown,    gradient: "from-orange-500 to-red-500",  emoji: "👑" },
];

// Floating tip notification that flies up and fades out
function TipBubble({ tip, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.8 }}
      animate={{ opacity: 1, y: -20, scale: 1 }}
      exit={{ opacity: 0, y: -80, scale: 0.6 }}
      transition={{ duration: 0.4, exit: { duration: 0.8 } }}
      onAnimationComplete={() => setTimeout(onDone, 4000)}
      className="pointer-events-none"
    >
      <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2.5 rounded-full shadow-2xl shadow-orange-500/40 border border-yellow-400/30 backdrop-blur-sm">
        <span className="text-lg">{tip.emoji}</span>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-sm">{tip.tipper}</span>
          <span className="text-xs text-yellow-100">tipped <span className="font-bold">${tip.amount}</span></span>
        </div>
        {tip.message && (
          <span className="text-xs text-yellow-100 italic max-w-[120px] truncate border-l border-yellow-400/50 pl-2">
            "{tip.message}"
          </span>
        )}
      </div>
    </motion.div>
  );
}

// Confetti burst for large tips
function ConfettiBurst({ active }) {
  const particles = Array.from({ length: 12 });
  const colors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff6bcd", "#ffffff"];
  return (
    <AnimatePresence>
      {active && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, x: "50%", y: "50%", scale: 0 }}
              animate={{
                opacity: 0,
                x: `${50 + (Math.random() - 0.5) * 160}%`,
                y: `${50 + (Math.random() - 0.5) * 160}%`,
                scale: Math.random() * 1.5 + 0.5,
                rotate: Math.random() * 720,
              }}
              transition={{ duration: 1.2, delay: i * 0.04, ease: "easeOut" }}
              className="absolute w-2 h-2 rounded-sm"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

export default function LiveTippingOverlay({ streamId, creatorEmail, currentUser }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState("select"); // "select" | "pay"
  const [recentTips, setRecentTips] = useState([]);
  const [confetti, setConfetti] = useState(false);
  const [sessionTotal, setSessionTotal] = useState(0);

  // Real-time tip subscription
  useEffect(() => {
    if (!streamId) return;
    const unsubscribe = base44.entities.TipTransaction.subscribe((event) => {
      if (event.type === "create" && event.data?.content_id === streamId) {
        const d = event.data;
        const tipAmt = d.amount_usd || 0;
        const tipItem = {
          id: d.id || Date.now(),
          amount: tipAmt,
          message: d.message,
          tipper: d.tipper_username || d.tipper_name || "Anonymous",
          emoji: QUICK_TIPS.find(t => t.amount === tipAmt)?.emoji || "💰",
        };
        setRecentTips(prev => [tipItem, ...prev].slice(0, 6));
        if (tipAmt >= 50) {
          setConfetti(true);
          setTimeout(() => setConfetti(false), 1400);
        }
      }
    });
    return () => unsubscribe();
  }, [streamId]);

  const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;

  const openModal = (amount = null) => {
    setSelectedAmount(amount || 5);
    setCustomAmount(amount ? "" : "");
    setMessage("");
    setStep("select");
    setShowModal(true);
  };

  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      await base44.entities.TipTransaction.create({
        creator_email: creatorEmail,
        tipper_email: currentUser.email,
        tipper_name: currentUser.full_name,
        tipper_username: currentUser.username,
        amount_usd: finalAmount,
        message: message || `$${finalAmount} tip! 🎉`,
        content_id: streamId,
        is_livestream_tip: true,
        payment_intent_id: paymentIntentId,
      });

      // Update creator's balance
      try {
        const creators = await base44.entities.User.filter({ email: creatorEmail });
        if (creators[0]) {
          await base44.entities.User.update(creators[0].id, {
            usd_balance: (creators[0].usd_balance || 0) + finalAmount * 0.9 // 10% platform fee
          });
        }
      } catch {}

      setSessionTotal(prev => prev + finalAmount);
      toast.success(`🎉 $${finalAmount} tip sent!`);
      queryClient.invalidateQueries({ queryKey: ["tips"] });
      setShowModal(false);
    } catch (err) {
      toast.error("Failed to record tip");
    }
  };

  return (
    <>
      {/* Quick tip buttons row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {QUICK_TIPS.slice(0, 4).map((tip) => (
          <motion.button
            key={tip.amount}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => openModal(tip.amount)}
            disabled={!currentUser}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r ${tip.gradient} text-white text-xs font-bold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <tip.icon className="w-3.5 h-3.5" />
            {tip.label}
          </motion.button>
        ))}
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => openModal(null)}
          disabled={!currentUser}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold disabled:opacity-40"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          Custom
        </motion.button>
      </div>

      {/* Session total badge */}
      {sessionTotal > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1 text-xs text-green-400 font-semibold"
        >
          <DollarSign className="w-3 h-3" />
          You've tipped ${sessionTotal} this stream
        </motion.div>
      )}

      {/* Floating tip notifications overlay */}
      <div className="fixed top-20 right-4 z-40 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {recentTips.map((tip) => (
            <TipBubble
              key={tip.id}
              tip={tip}
              onDone={() => setRecentTips(prev => prev.filter(t => t.id !== tip.id))}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Confetti burst */}
      <div className="fixed inset-0 z-30 pointer-events-none">
        <ConfettiBurst active={confetti} />
      </div>

      {/* Tip Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-gradient-to-b from-gray-900 to-black rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden"
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Send a Tip</h3>
                      <p className="text-white/70 text-sm">Support the creator directly</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                {/* Decorative sparkle */}
                <div className="absolute top-2 right-14 text-xl opacity-60">✨</div>
              </div>

              <div className="p-5 space-y-4">
                {step === "select" ? (
                  <>
                    {/* Preset amounts */}
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Quick Amounts</p>
                      <div className="grid grid-cols-5 gap-2">
                        {QUICK_TIPS.map((tip) => (
                          <motion.button
                            key={tip.amount}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => { setSelectedAmount(tip.amount); setCustomAmount(""); }}
                            className={`flex flex-col items-center gap-1 p-3 rounded-2xl font-bold text-sm transition border-2 ${
                              selectedAmount === tip.amount && !customAmount
                                ? `bg-gradient-to-br ${tip.gradient} border-transparent text-white shadow-lg`
                                : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                            }`}
                          >
                            <span className="text-lg">{tip.emoji}</span>
                            <span className="text-xs">${tip.amount}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Custom amount */}
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Custom Amount</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Enter amount..."
                          value={customAmount}
                          onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                          className="pl-7 bg-white/5 border-white/15 text-white placeholder:text-gray-600 text-center text-lg font-bold focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Message <span className="text-gray-600 normal-case font-normal">(optional)</span></p>
                      <div className="relative">
                        <Input
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          placeholder="Say something nice... 💬"
                          maxLength={80}
                          className="bg-white/5 border-white/15 text-white placeholder:text-gray-600 pr-10"
                        />
                        <Send className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <span className="text-gray-400 text-sm">You're sending</span>
                      <span className="text-white text-2xl font-bold">${finalAmount || "—"}</span>
                    </div>

                    <Button
                      onClick={() => setStep("pay")}
                      disabled={!finalAmount || finalAmount < 1}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-5 text-base font-bold rounded-2xl"
                    >
                      <DollarSign className="w-5 h-5 mr-2" />
                      Continue to Payment
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Payment summary */}
                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-4 text-center">
                      <p className="text-gray-400 text-sm">Tipping</p>
                      <p className="text-white text-4xl font-black">${finalAmount}</p>
                      {message && <p className="text-gray-400 text-sm mt-1 italic">"{message}"</p>}
                    </div>

                    <StripePaymentForm
                      amount={finalAmount}
                      referenceType="tip"
                      referenceId={streamId}
                      description={`Livestream tip for ${creatorEmail}`}
                      onSuccess={handlePaymentSuccess}
                      onError={(err) => toast.error("Payment failed: " + err.message)}
                      metadata={{ type: "tip", stream_id: streamId, creator_email: creatorEmail }}
                    />

                    <Button
                      onClick={() => setStep("select")}
                      variant="ghost"
                      className="w-full text-gray-400 hover:text-white"
                    >
                      ← Change Amount
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}