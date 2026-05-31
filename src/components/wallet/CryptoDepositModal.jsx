import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Copy, CheckCircle, Wallet, QrCode, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function CryptoDepositModal({ currentUser, onClose }) {
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [copied, setCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [confirming, setConfirming] = useState(false);

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

  // Generate or get wallet address for selected crypto
  const currentWallet = wallets.find(w => w.currency === selectedCrypto);
  const walletAddress = currentWallet?.wallet_address || `${selectedCrypto}${currentUser.email.slice(0, 8)}${Math.random().toString(36).substring(7)}`;

  const cryptos = [
    { symbol: "BTC", name: "Bitcoin", icon: "₿", color: "from-orange-500 to-yellow-500" },
    { symbol: "ETH", name: "Ethereum", icon: "Ξ", color: "from-blue-500 to-purple-500" },
    { symbol: "USDT", name: "Tether", icon: "₮", color: "from-green-500 to-emerald-500" },
    { symbol: "USDC", name: "USD Coin", icon: "$", color: "from-blue-400 to-cyan-400" },
    { symbol: "SOL", name: "Solana", icon: "◎", color: "from-purple-500 to-pink-500" },
  ];

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setConfirming(true);
    try {
      // Create or update wallet
      if (!currentWallet) {
        await base44.entities.CryptoWallet.create({
          user_email: currentUser.email,
          currency: selectedCrypto,
          balance: parseFloat(depositAmount),
          wallet_address: walletAddress,
          is_active: true
        });
      } else {
        await base44.entities.CryptoWallet.update(currentWallet.id, {
          balance: (currentWallet.balance || 0) + parseFloat(depositAmount)
        });
      }

      // Record transaction
      await base44.entities.CryptoTransaction.create({
        user_email: currentUser.email,
        transaction_type: "receive",
        from_currency: selectedCrypto,
        to_currency: selectedCrypto,
        from_amount: parseFloat(depositAmount),
        to_amount: parseFloat(depositAmount),
        exchange_rate: 1,
        fee: 0,
        status: "completed",
        blockchain_tx_hash: `0x${Math.random().toString(16).substring(2, 66)}`,
        recipient_address: walletAddress
      });

      // Notification
      await base44.entities.Notification.create({
        recipient_email: currentUser.email,
        type: "payment_received",
        title: "Crypto Deposit Received",
        message: `${depositAmount} ${selectedCrypto} deposited to your wallet`,
        read: false,
        action_url: "/Wallet"
      });

      toast.success("Deposit confirmed!");
      onClose();
    } catch (err) {
      console.error("Deposit failed:", err);
      toast.error("Failed to confirm deposit");
    } finally {
      setConfirming(false);
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
          className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ArrowDown className="w-6 h-6" />
                Deposit Crypto
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
                {cryptos.map((crypto) => (
                  <button
                    key={crypto.symbol}
                    onClick={() => setSelectedCrypto(crypto.symbol)}
                    className={`p-4 rounded-xl border-2 transition ${
                      selectedCrypto === crypto.symbol
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className={`text-3xl mb-2 bg-gradient-to-r ${crypto.color} bg-clip-text text-transparent font-bold`}>
                      {crypto.icon}
                    </div>
                    <p className="text-white font-semibold text-sm">{crypto.symbol}</p>
                    <p className="text-gray-400 text-xs">{crypto.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet Address */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-gray-400 text-sm">Deposit Address</label>
                <Wallet className="w-4 h-4 text-blue-400" />
              </div>
              <div className="bg-black/30 rounded-lg p-3 mb-3">
                <p className="text-white text-sm font-mono break-all">{walletAddress}</p>
              </div>
              <Button
                onClick={handleCopyAddress}
                variant="outline"
                className="w-full border-white/20"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Address
                  </>
                )}
              </Button>
            </div>

            {/* QR Code Placeholder */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center">
              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center mb-3">
                <QrCode className="w-24 h-24 text-gray-400" />
              </div>
              <p className="text-gray-400 text-sm text-center">Scan QR code to deposit {selectedCrypto}</p>
            </div>

            {/* Confirm Deposit */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <p className="text-yellow-300 text-sm mb-3">
                ⚠️ After sending crypto, confirm your deposit below
              </p>
              <Input
                type="number"
                step="any"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Amount deposited"
                className="bg-white/10 border-white/20 text-white mb-3"
              />
              <Button
                onClick={handleConfirmDeposit}
                disabled={confirming || !depositAmount}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
              >
                {confirming ? "Confirming..." : "Confirm Deposit"}
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-white font-semibold mb-2 text-sm">How to deposit:</h4>
              <ol className="text-gray-400 text-xs space-y-2">
                <li>1. Copy the wallet address or scan QR code</li>
                <li>2. Send {selectedCrypto} from your external wallet</li>
                <li>3. Enter the amount you sent and confirm</li>
                <li>4. Your balance will update instantly</li>
              </ol>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}