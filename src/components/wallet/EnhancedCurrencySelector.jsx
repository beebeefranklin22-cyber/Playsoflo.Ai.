import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, TrendingUp, DollarSign, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function EnhancedCurrencySelector({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(currentUser?.primary_currency || 'USD');
  const [showDualCurrency, setShowDualCurrency] = useState(currentUser?.show_dual_currency || false);

  const { data: exchangeRates = {} } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      try {
        const { data } = await base44.functions.invoke('getExchangeRates');
        return data.rates;
      } catch {
        return {};
      }
    },
    refetchInterval: 5 * 60 * 1000
  });

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', rate: 1 },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', rate: exchangeRates.EUR || 0.92 },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', rate: exchangeRates.GBP || 0.79 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', rate: exchangeRates.JPY || 149.5 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', rate: exchangeRates.CAD || 1.35 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', rate: exchangeRates.AUD || 1.52 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', rate: exchangeRates.CHF || 0.88 },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', rate: exchangeRates.CNY || 7.24 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', rate: exchangeRates.INR || 83.12 },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽', rate: exchangeRates.MXN || 17.1 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', rate: exchangeRates.BRL || 4.97 },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', rate: exchangeRates.SGD || 1.34 },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', rate: exchangeRates.HKD || 7.82 },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', rate: exchangeRates.NZD || 1.63 },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', rate: exchangeRates.SEK || 10.34 },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', rate: exchangeRates.KRW || 1332 },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', rate: exchangeRates.ZAR || 18.65 },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', rate: exchangeRates.AED || 3.67 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦', rate: exchangeRates.SAR || 3.75 },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', rate: exchangeRates.THB || 35.8 }
  ];

  const filteredCurrencies = currencies.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updateMutation = useMutation({
    mutationFn: async (settings) => {
      return await base44.auth.updateMe(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      toast.success("Currency settings updated!");
      onClose();
    },
    onError: () => toast.error("Failed to update settings")
  });

  const handleSave = () => {
    updateMutation.mutate({
      primary_currency: selectedCurrency,
      show_dual_currency: showDualCurrency
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-400" />
            Currency Settings
          </DialogTitle>
          <p className="text-gray-400 text-sm">
            Display balances in your preferred currency • Real-time exchange rates
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search currencies..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>

          {/* Display Options */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-white font-semibold mb-1">Show Dual Currency</p>
                <p className="text-gray-400 text-sm">Display both your currency and USD</p>
              </div>
              <input
                type="checkbox"
                checked={showDualCurrency}
                onChange={(e) => setShowDualCurrency(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-white/10 checked:bg-purple-600"
              />
            </label>
          </div>

          {/* Currency List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredCurrencies.map((currency) => {
              const isSelected = selectedCurrency === currency.code;
              const valueInCurrency = currentUser?.usd_balance 
                ? (currentUser.usd_balance * currency.rate).toFixed(2)
                : '0.00';

              return (
                <motion.button
                  key={currency.code}
                  onClick={() => setSelectedCurrency(currency.code)}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-left">
                      <span className="text-3xl">{currency.flag}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold">{currency.code}</p>
                          {isSelected && <Check className="w-4 h-4 text-green-400" />}
                        </div>
                        <p className="text-gray-400 text-sm">{currency.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">
                        {currency.symbol}{valueInCurrency}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <TrendingUp className="w-3 h-3" />
                        1 USD = {currency.rate.toFixed(4)} {currency.code}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-300 text-sm font-semibold mb-1">How it works</p>
                <p className="text-blue-200 text-xs">
                  Your funds remain in USD. We display the equivalent value in your selected currency using live exchange rates updated every 5 minutes. 
                  All transactions are still processed in USD to ensure stability.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/5 border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}