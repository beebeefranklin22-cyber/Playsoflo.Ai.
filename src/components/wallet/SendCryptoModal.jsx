import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, CheckCircle, AlertTriangle, Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { sendCryptoInternal } from "@/functions/sendCryptoInternal";

const CRYPTOS = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿", color: "from-orange-500 to-yellow-500" },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", color: "from-blue-500 to-purple-500" },
  { symbol: "USDT", name: "Tether", icon: "₮", color: "from-green-500 to-emerald-500" },
  { symbol: "USDC", name: "USD Coin", icon: "$", color: "from-blue-400 to-cyan-400" },
  { symbol: "SOL", name: "Solana", icon: "◎", color: "from-purple-500 to-pink-500" },
];

export default function SendCryptoModal({ currentUser, onClose }) {
  const [step, setStep] = useState("form"); // form | confirm | success
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: wallets = [] } = useQuery({
    queryKey: ['crypto-wallets', currentUser.email],
    queryFn: () => base44.entities.CryptoWallet.filter({ user_email: currentUser.email, is_active: true }),
    initialData: []
  });

  const currentWallet = wallets.find(w => w.currency === selectedCrypto);
  const availableBalance = currentWallet?.balance || 0;
  const sendAmount = parseFloat(amount || 0);

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const canProceed =
    sendAmount > 0 &&
    sendAmount <= availableBalance &&
    isValidEmail(recipientEmail) &&
    recipientEmail.toLowerCase() !== currentUser.email.toLowerCase();

  const handleConfirm = async () => {
    setSending(true);
    try {
      // Idempotency key: unique per intent (crypto + amount + recipient + timestamp)
      const idempotencyKey = `${currentUser.email}-${selectedCrypto}-${sendAmount}-${recipientEmail}-${Date.now()}`;

      const { data } = await sendCryptoInternal({
        currency: selectedCrypto,
        amount: sendAmount,
        recipient_email: recipientEmail.toLowerCase(),
        note: note.trim() || undefined,
        idempotency_key: idempotencyKey
      });

      if (data?.success) {
        setResult(data);
        setStep("success");
        queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] });
      } else {
        toast.error(data?.error || "Transfer failed");
        setStep("form");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Transfer failed");
      setStep("form");
    } finally {
      setSending(false);
    }
  };

  // Success screen
  if (step === "success" && result) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-center">
            <CheckCircle className="w-16 h-16 text-white mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-white">Sent!</h2>
            <p className="text-green-100">Transfer completed instantly</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Transfer ID</span>
                <span className="text-white font-mono text-xs">{result.transfer_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount</span>
                <span className="text-white font-semibold">{result.amount} {result.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Recipient</span>
                <span className="text-white">{result.recipient_name || result.recipient_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-green-400 font-semibold">Completed</span>
              </div>
            </div>
            <p className="text-gray-400 text-xs text-center">
              Both parties received an email confirmation. Transfer ID saved for your records.
            </p>
            <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 py-4">
              Done
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Confirm screen
  if (step === "confirm") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Confirm Transfer
            </h2>
            <button onClick={() => setStep("form")} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Sending</span>
                <span className="text-white font-bold text-base">{sendAmount} {selectedCrypto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">To</span>
                <span className="text-white">{recipientEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fee</span>
                <span className="text-green-400">Free (internal transfer)</span>
              </div>
              {note && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Note</span>
                  <span className="text-white italic">"{note}"</span>
                </div>
              )}
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-300 text-sm">
                🔒 This transfer happens instantly between platform accounts. The recipient will be notified immediately.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                disabled={sending}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={sending}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
              >
                {sending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</> : "Confirm Send"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main form
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
          className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Send className="w-6 h-6" /> Send Crypto
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Crypto Selection */}
            <div>
              <label className="text-white font-semibold mb-3 block">Select Cryptocurrency</label>
              <div className="grid grid-cols-3 gap-2">
                {CRYPTOS.map((crypto) => {
                  const wallet = wallets.find(w => w.currency === crypto.symbol);
                  const balance = wallet?.balance || 0;
                  return (
                    <button
                      key={crypto.symbol}
                      onClick={() => setSelectedCrypto(crypto.symbol)}
                      className={`p-3 rounded-xl border-2 transition ${
                        selectedCrypto === crypto.symbol
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-white/20 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className={`text-2xl mb-1 bg-gradient-to-r ${crypto.color} bg-clip-text text-transparent font-bold`}>
                        {crypto.icon}
                      </div>
                      <p className="text-white font-semibold text-xs">{crypto.symbol}</p>
                      <p className="text-gray-400 text-xs">{balance.toFixed(6)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Balance */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Available Balance</p>
              <p className="text-white text-xl font-bold">{availableBalance.toFixed(8)} {selectedCrypto}</p>
            </div>

            {/* Recipient */}
            <div>
              <label className="text-white font-semibold mb-2 block">Recipient Email</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="bg-white/10 border-white/20 text-white pl-10"
                />
              </div>
              {recipientEmail && recipientEmail.toLowerCase() === currentUser.email.toLowerCase() && (
                <p className="text-red-400 text-xs mt-1">Cannot send to yourself</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="text-white font-semibold mb-2 block">Amount</label>
              <Input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00000000"
                max={availableBalance}
                className="bg-white/10 border-white/20 text-white text-lg"
              />
              <div className="flex gap-2 mt-2">
                {[0.25, 0.5, 0.75, 1].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setAmount((availableBalance * pct).toFixed(8))}
                    className="flex-1 text-xs text-blue-400 bg-white/5 hover:bg-white/10 rounded-lg py-1 transition"
                  >
                    {pct * 100}%
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-white font-semibold mb-2 block">Note (optional)</label>
              <Input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's this for?"
                maxLength={100}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            {/* Fee info */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
              <p className="text-green-300 text-sm">
                ✅ Internal transfers are <strong>instant and fee-free</strong>. Both parties will receive email + in-app notifications.
              </p>
            </div>

            <Button
              onClick={() => setStep("confirm")}
              disabled={!canProceed}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-5 text-lg"
            >
              <Send className="w-5 h-5 mr-2" />
              Send {amount || "0"} {selectedCrypto}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}