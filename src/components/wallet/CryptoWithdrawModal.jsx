import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ArrowUp, Wallet, AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Crypto2FAModal from "./Crypto2FAModal";
import { processCryptoWithdrawal } from "@/functions/processCryptoWithdrawal";

export default function CryptoWithdrawModal({ currentUser, onClose }) {
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(null);
  const [withdrawalResult, setWithdrawalResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: wallets = [] } = useQuery({
    queryKey: ['crypto-wallets', currentUser.email],
    queryFn: async () => {
      return await base44.entities.CryptoWallet.filter({
        user_email: currentUser.email,
        is_active: true
      });
    },
    initialData: []
  });

  const currentWallet = wallets.find(w => w.currency === selectedCrypto);
  const availableBalance = currentWallet?.balance || 0;

  const cryptos = [
    { symbol: "BTC", name: "Bitcoin", icon: "₿", color: "from-orange-500 to-yellow-500", networkFee: 0.0001 },
    { symbol: "ETH", name: "Ethereum", icon: "Ξ", color: "from-blue-500 to-purple-500", networkFee: 0.002 },
    { symbol: "USDT", name: "Tether", icon: "₮", color: "from-green-500 to-emerald-500", networkFee: 1 },
    { symbol: "USDC", name: "USD Coin", icon: "$", color: "from-blue-400 to-cyan-400", networkFee: 1 },
    { symbol: "SOL", name: "Solana", icon: "◎", color: "from-purple-500 to-pink-500", networkFee: 0.000005 },
  ];

  const selectedCryptoData = cryptos.find(c => c.symbol === selectedCrypto);
  const platformFee = 0.50; // Your $0.50 fee
  const networkFee = selectedCryptoData?.networkFee || 0;
  const totalAmount = parseFloat(withdrawAmount || 0);
  const youWillReceive = totalAmount - networkFee;

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!recipientAddress || recipientAddress.length < 20) {
      toast.error("Please enter a valid recipient address");
      return;
    }

    if (totalAmount > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    // Check daily limit
    const dailyLimit = currentUser?.daily_crypto_withdrawal_limit || 10000;
    const dailyUsed = currentUser?.daily_withdrawal_used || 0;
    const priceUSD = totalAmount; // Treat as USD equivalent; no live price feed in this modal

    if (dailyUsed + priceUSD > dailyLimit) {
      toast.error(`Daily withdrawal limit exceeded. Remaining: $${(dailyLimit - dailyUsed).toFixed(2)}`);
      return;
    }

    // Check if 2FA is enabled
    if (currentUser?.crypto_2fa_enabled) {
      setPendingWithdrawal({ amount: totalAmount, address: recipientAddress, priceUSD });
      setShow2FA(true);
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmWithdraw = async () => {
    setConfirming(true);
    try {
      const { data } = await processCryptoWithdrawal({
        currency: selectedCrypto,
        amount: totalAmount,
        recipient_address: recipientAddress,
        network: selectedCrypto
      });

      if (data?.success) {
        setWithdrawalResult(data);
        queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] });
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        toast.success(`✅ Withdrawal queued! ID: ${data.withdrawal_id}`);
        setShowConfirmation(false);
      } else {
        toast.error(data?.error || "Withdrawal failed");
      }
    } catch (err) {
      console.error("Withdrawal failed:", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to process withdrawal");
    } finally {
      setConfirming(false);
    }
  };

  const handle2FAVerified = (verified) => {
    setShow2FA(false);
    if (verified && pendingWithdrawal) {
      setShowConfirmation(true);
    }
    setPendingWithdrawal(null);
  };

  // Show success screen after withdrawal queued
  if (withdrawalResult) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-center">
              <CheckCircle className="w-16 h-16 text-white mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-white">Withdrawal Queued!</h2>
              <p className="text-green-100">Processing to blockchain network</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Withdrawal ID</span>
                  <span className="text-white font-mono text-xs">{withdrawalResult.withdrawal_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount Sent</span>
                  <span className="text-white">{withdrawalResult.amount} {selectedCrypto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">You'll Receive</span>
                  <span className="text-green-400 font-semibold">{withdrawalResult.net_amount?.toFixed(8)} {selectedCrypto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-yellow-400 font-semibold capitalize">{withdrawalResult.status}</span>
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                  📧 A confirmation email has been sent to <strong>{currentUser.email}</strong> with your withdrawal ID for tracking.
                </p>
              </div>
              <p className="text-gray-400 text-xs text-center">
                Estimated processing time: 15–60 minutes depending on network congestion.
              </p>
              <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 py-4">
                Done
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (showConfirmation) {
    if (show2FA) {
      return <Crypto2FAModal onVerify={handle2FAVerified} onClose={() => setShow2FA(false)} action="withdrawal" />;
    }

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={() => setShowConfirmation(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  Confirm Withdrawal
                </h2>
                <button onClick={() => setShowConfirmation(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-white font-semibold">{withdrawAmount} {selectedCrypto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network Fee</span>
                  <span className="text-yellow-400">{networkFee} {selectedCrypto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Platform Fee</span>
                  <span className="text-yellow-400">${platformFee.toFixed(2)} USD</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="text-white font-semibold">You'll Receive</span>
                  <span className="text-green-400 font-bold">{youWillReceive.toFixed(8)} {selectedCrypto}</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-2">Recipient Address</p>
                <p className="text-white text-xs font-mono break-all">{recipientAddress}</p>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-300 text-sm">
                  ⚠️ <strong>Warning:</strong> Crypto transactions are irreversible. Double-check the recipient address before confirming.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowConfirmation(false)}
                  variant="outline"
                  className="flex-1 border-white/20"
                  disabled={confirming}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmWithdraw}
                  disabled={confirming}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-red-600"
                >
                  {confirming ? "Processing..." : "Confirm Withdrawal"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

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
          <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ArrowUp className="w-6 h-6" />
                Withdraw Crypto
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Crypto Selection */}
            <div>
              <label className="text-white font-semibold mb-3 block">Select Cryptocurrency</label>
              <div className="grid grid-cols-2 gap-3">
                {cryptos.map((crypto) => {
                  const wallet = wallets.find(w => w.currency === crypto.symbol);
                  const balance = wallet?.balance || 0;
                  return (
                    <button
                      key={crypto.symbol}
                      onClick={() => setSelectedCrypto(crypto.symbol)}
                      className={`p-4 rounded-xl border-2 transition ${
                        selectedCrypto === crypto.symbol
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-white/20 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className={`text-3xl mb-2 bg-gradient-to-r ${crypto.color} bg-clip-text text-transparent font-bold`}>
                        {crypto.icon}
                      </div>
                      <p className="text-white font-semibold text-sm">{crypto.symbol}</p>
                      <p className="text-gray-400 text-xs">{balance.toFixed(8)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Available Balance */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Available Balance</p>
              <p className="text-white text-2xl font-bold">
                {availableBalance.toFixed(8)} {selectedCrypto}
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="text-white font-semibold mb-3 block">Amount to Withdraw</label>
              <Input
                type="number"
                step="any"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00000000"
                max={availableBalance}
                className="bg-white/10 border-white/20 text-white text-xl"
              />
              <button
                onClick={() => setWithdrawAmount(availableBalance.toString())}
                className="text-blue-400 text-sm mt-2 hover:underline"
              >
                Withdraw all
              </button>
            </div>

            {/* Recipient Address */}
            <div>
              <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Recipient Wallet Address
              </label>
              <Input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder={`Enter ${selectedCrypto} wallet address`}
                className="bg-white/10 border-white/20 text-white font-mono text-sm"
              />
            </div>

            {/* Fee Info */}
            {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Withdrawal Amount</span>
                  <span className="text-white">{withdrawAmount} {selectedCrypto}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Network Fee</span>
                  <span className="text-yellow-400">{networkFee} {selectedCrypto}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Platform Fee</span>
                  <span className="text-yellow-400">${platformFee.toFixed(2)} USD</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between font-semibold">
                  <span className="text-white">You'll Receive</span>
                  <span className="text-green-400">{youWillReceive.toFixed(8)} {selectedCrypto}</span>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <p className="text-yellow-300 text-sm">
                ⚠️ Double-check the recipient address. Crypto transactions are irreversible.
              </p>
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={!withdrawAmount || !recipientAddress || parseFloat(withdrawAmount) <= 0}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 py-6 text-lg"
            >
              <ArrowUp className="w-5 h-5 mr-2" />
              Withdraw {withdrawAmount || "0"} {selectedCrypto}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}