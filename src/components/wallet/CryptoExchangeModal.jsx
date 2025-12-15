import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ArrowDownUp, TrendingUp, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import toast from "react-hot-toast";

export default function CryptoExchangeModal({ currentUser, onClose }) {
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("BTC");
  const [fromAmount, setFromAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(true);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async () => {
    try {
      const { data } = await base44.functions.invoke('getCryptoPrices');
      setPrices(data.prices);
      setLoadingPrices(false);
    } catch (err) {
      console.error('Failed to fetch prices:', err);
      toast.error('Failed to fetch live prices');
      setLoadingPrices(false);
    }
  };

  const getExchangeRate = () => {
    if (fromCurrency === toCurrency) return 1;
    
    // Convert from currency to USD first, then to target currency
    const fromPrice = fromCurrency === 'USD' ? 1 : (prices[fromCurrency]?.usd || 1);
    const toPrice = toCurrency === 'USD' ? 1 : (prices[toCurrency]?.usd || 1);
    
    return fromPrice / toPrice;
  };

  const getToAmount = () => {
    if (!fromAmount) return "0";
    const rate = getExchangeRate();
    return (parseFloat(fromAmount) * rate).toFixed(8);
  };

  const handleExchange = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const rate = getExchangeRate();
      const toAmount = parseFloat(getToAmount());
      const fee = parseFloat(fromAmount) * 0.01;

      // Handle buying crypto with USD
      if (fromCurrency === 'USD') {
        const usdBalance = currentUser.usd_balance || 0;
        if (parseFloat(fromAmount) > usdBalance) {
          toast.error("Insufficient USD balance");
          setLoading(false);
          return;
        }

        // Deduct USD from balance
        await base44.auth.updateMe({
          usd_balance: usdBalance - parseFloat(fromAmount)
        });

        // Get or create crypto wallet
        const existingWallets = await base44.entities.CryptoWallet.filter({
          user_email: currentUser.email,
          currency: toCurrency,
          is_active: true
        });

        if (existingWallets.length > 0) {
          await base44.entities.CryptoWallet.update(existingWallets[0].id, {
            balance: (existingWallets[0].balance || 0) + toAmount
          });
        } else {
          await base44.entities.CryptoWallet.create({
            user_email: currentUser.email,
            currency: toCurrency,
            balance: toAmount,
            wallet_address: `${toCurrency}${currentUser.email.slice(0, 8)}${Math.random().toString(36).substring(7)}`,
            is_active: true
          });
        }
      } 
      // Handle selling crypto for USD
      else if (toCurrency === 'USD') {
        const wallets = await base44.entities.CryptoWallet.filter({
          user_email: currentUser.email,
          currency: fromCurrency,
          is_active: true
        });

        if (wallets.length === 0 || (wallets[0].balance || 0) < parseFloat(fromAmount)) {
          toast.error(`Insufficient ${fromCurrency} balance`);
          setLoading(false);
          return;
        }

        // Deduct crypto
        await base44.entities.CryptoWallet.update(wallets[0].id, {
          balance: (wallets[0].balance || 0) - parseFloat(fromAmount)
        });

        // Add USD
        await base44.auth.updateMe({
          usd_balance: (currentUser.usd_balance || 0) + toAmount - fee
        });
      }
      // Handle crypto to crypto exchange
      else {
        const fromWallets = await base44.entities.CryptoWallet.filter({
          user_email: currentUser.email,
          currency: fromCurrency,
          is_active: true
        });

        if (fromWallets.length === 0 || (fromWallets[0].balance || 0) < parseFloat(fromAmount)) {
          toast.error(`Insufficient ${fromCurrency} balance`);
          setLoading(false);
          return;
        }

        // Deduct from currency
        await base44.entities.CryptoWallet.update(fromWallets[0].id, {
          balance: (fromWallets[0].balance || 0) - parseFloat(fromAmount)
        });

        // Add to currency
        const toWallets = await base44.entities.CryptoWallet.filter({
          user_email: currentUser.email,
          currency: toCurrency,
          is_active: true
        });

        if (toWallets.length > 0) {
          await base44.entities.CryptoWallet.update(toWallets[0].id, {
            balance: (toWallets[0].balance || 0) + toAmount
          });
        } else {
          await base44.entities.CryptoWallet.create({
            user_email: currentUser.email,
            currency: toCurrency,
            balance: toAmount,
            wallet_address: `${toCurrency}${currentUser.email.slice(0, 8)}${Math.random().toString(36).substring(7)}`,
            is_active: true
          });
        }
      }

      // Record transaction
      await base44.entities.CryptoTransaction.create({
        user_email: currentUser.email,
        transaction_type: fromCurrency === 'USD' ? 'buy' : (toCurrency === 'USD' ? 'sell' : 'exchange'),
        from_currency: fromCurrency,
        to_currency: toCurrency,
        from_amount: parseFloat(fromAmount),
        to_amount: toAmount,
        exchange_rate: rate,
        fee: fee,
        status: "completed"
      });

      toast.success(`✅ Exchanged ${fromAmount} ${fromCurrency} for ${toAmount.toFixed(8)} ${toCurrency}`);
      onClose();
    } catch (err) {
      console.error("Exchange failed:", err);
      toast.error("Exchange failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cryptos = ["USD", "BTC", "ETH", "SoFloCoin", "USDT", "SOL"];

  return (
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
              <div>
                <h2 className="text-2xl font-bold text-white">Exchange Crypto</h2>
                <p className="text-blue-100 text-sm">Live prices • Updated every 30s</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={fetchPrices}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                  disabled={loadingPrices}
                >
                  <RefreshCw className={`w-5 h-5 text-white ${loadingPrices ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
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
                {cryptos.map((curr) => {
                  const price = prices[curr]?.usd;
                  return (
                    <button
                      key={curr}
                      onClick={() => setFromCurrency(curr)}
                      className={`px-3 py-2 rounded-lg text-sm transition ${
                        fromCurrency === curr
                          ? "bg-blue-600 text-white"
                          : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                    >
                      <div>{curr}</div>
                      {price && curr !== 'USD' && (
                        <div className="text-xs opacity-70">${price.toLocaleString()}</div>
                      )}
                    </button>
                  );
                })}
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
                {cryptos.map((curr) => {
                  const price = prices[curr]?.usd;
                  return (
                    <button
                      key={curr}
                      onClick={() => setToCurrency(curr)}
                      className={`px-3 py-2 rounded-lg text-sm transition ${
                        toCurrency === curr
                          ? "bg-blue-600 text-white"
                          : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                    >
                      <div>{curr}</div>
                      {price && curr !== 'USD' && (
                        <div className="text-xs opacity-70">${price.toLocaleString()}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Exchange Rate</span>
                <span className="text-white font-semibold">
                  1 {fromCurrency} = {getExchangeRate().toFixed(8)} {toCurrency}
                </span>
              </div>
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
  );
}