import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ArrowDownUp, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function CryptoExchangeModal({ currentUser, onClose }) {
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("BTC");
  const [fromAmount, setFromAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const exchangeRates = {
    "USD-BTC": 0.000016,
    "USD-ETH": 0.00051,
    "USD-SoFloCoin": 0.41,
    "BTC-USD": 62340,
    "ETH-USD": 1950,
    "SoFloCoin-USD": 2.45
  };

  const getToAmount = () => {
    if (!fromAmount) return "0";
    const key = `${fromCurrency}-${toCurrency}`;
    const rate = exchangeRates[key] || 1;
    return (parseFloat(fromAmount) * rate).toFixed(8);
  };

  const handleExchange = async () => {
    if (!fromAmount) {
      alert("Please enter an amount");
      return;
    }

    setLoading(true);
    try {
      const key = `${fromCurrency}-${toCurrency}`;
      const rate = exchangeRates[key] || 1;
      
      await base44.entities.CryptoTransaction.create({
        user_email: currentUser.email,
        transaction_type: "exchange",
        from_currency: fromCurrency,
        to_currency: toCurrency,
        from_amount: parseFloat(fromAmount),
        to_amount: parseFloat(getToAmount()),
        exchange_rate: rate,
        fee: parseFloat(fromAmount) * 0.01,
        status: "completed"
      });

      alert(`Successfully exchanged ${fromAmount} ${fromCurrency} for ${getToAmount()} ${toCurrency}`);
      onClose();
    } catch (err) {
      console.error("Exchange failed:", err);
      alert("Failed to exchange: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cryptos = ["USD", "BTC", "ETH", "SoFloCoin", "USDT", "SOL"];

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
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Exchange Crypto</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-white/5 rounded-2xl p-4">
              <label className="text-gray-400 text-sm mb-2 block">From</label>
              <Input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="bg-white/10 border-white/20 text-white text-2xl mb-3"
              />
              <div className="flex gap-2 flex-wrap">
                {cryptos.map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setFromCurrency(curr)}
                    className={`px-3 py-1 rounded-lg text-sm transition ${
                      fromCurrency === curr
                        ? "bg-blue-600 text-white"
                        : "bg-white/10 text-gray-300 hover:bg-white/20"
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  const temp = fromCurrency;
                  setFromCurrency(toCurrency);
                  setToCurrency(temp);
                }}
                className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
              >
                <ArrowDownUp className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="bg-white/5 rounded-2xl p-4">
              <label className="text-gray-400 text-sm mb-2 block">To</label>
              <div className="text-white text-2xl font-bold mb-3">
                {getToAmount()}
              </div>
              <div className="flex gap-2 flex-wrap">
                {cryptos.map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setToCurrency(curr)}
                    className={`px-3 py-1 rounded-lg text-sm transition ${
                      toCurrency === curr
                        ? "bg-blue-600 text-white"
                        : "bg-white/10 text-gray-300 hover:bg-white/20"
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-300 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>Exchange fee: 1% • Instant settlement</span>
              </div>
            </div>

            <Button
              onClick={handleExchange}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 py-6 text-lg"
            >
              {loading ? "Processing..." : "Confirm Exchange"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}