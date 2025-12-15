import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Globe, DollarSign, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function CurrencySelector({ currentUser, onClose }) {
  const queryClient = useQueryClient();

  const currencies = [
    { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
    { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
    { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar", flag: "🇨🇦" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar", flag: "🇦🇺" },
    { code: "CHF", symbol: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
    { code: "CNY", symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳" },
    { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real", flag: "🇧🇷" },
  ];

  const updateCurrencyMutation = useMutation({
    mutationFn: async (currency) => {
      await base44.auth.updateMe({
        primary_currency: currency
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      toast.success('✓ Currency updated');
    },
    onError: () => {
      toast.error('Failed to update currency');
    }
  });

  const toggleDualCurrency = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({
        show_dual_currency: !currentUser.show_dual_currency
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      toast.success('✓ Display settings updated');
    }
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Globe className="w-7 h-7" />
                  Currency Settings
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Choose your preferred display currency
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Current Selection */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Current Currency</p>
                    <p className="text-white text-xl font-bold">
                      {currencies.find(c => c.code === currentUser.primary_currency)?.name || "US Dollar"}
                    </p>
                  </div>
                  <div className="text-4xl">
                    {currencies.find(c => c.code === currentUser.primary_currency)?.flag || "🇺🇸"}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dual Currency Toggle */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">Show Dual Currency</p>
                    <p className="text-gray-400 text-sm">Display both your currency and USD</p>
                  </div>
                  <button
                    onClick={() => toggleDualCurrency.mutate()}
                    className={`w-12 h-6 rounded-full transition ${
                      currentUser.show_dual_currency ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      currentUser.show_dual_currency ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Currency Grid */}
            <div>
              <h3 className="text-white font-semibold mb-3">Select Currency</h3>
              <div className="grid grid-cols-2 gap-3">
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => updateCurrencyMutation.mutate(currency.code)}
                    disabled={updateCurrencyMutation.isPending}
                    className={`p-4 rounded-xl border-2 transition text-left ${
                      currentUser.primary_currency === currency.code
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{currency.flag}</span>
                      {currentUser.primary_currency === currency.code && (
                        <CheckCircle className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <p className="text-white font-semibold">{currency.code}</p>
                    <p className="text-gray-400 text-sm">{currency.name}</p>
                    <p className="text-gray-500 text-xs mt-1">{currency.symbol}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-300 text-sm">
                <strong>💡 Note:</strong> Exchange rates are updated in real-time. Tax reports will automatically convert to your primary currency.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}