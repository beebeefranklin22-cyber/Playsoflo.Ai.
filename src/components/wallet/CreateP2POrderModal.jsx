import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function CreateP2POrderModal({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    order_type: 'sell',
    crypto_currency: 'BTC',
    crypto_amount: '',
    price_per_unit: '',
    fiat_currency: 'USD',
    payment_methods: ['bank_transfer'],
    min_order_limit: '',
    max_order_limit: '',
    time_limit_minutes: 30,
    terms: ''
  });
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Fetch real-time crypto prices
  const { data: cryptoPrices = {}, refetch: refetchPrices } = useQuery({
    queryKey: ['crypto-prices'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getCryptoPrices');
      return data.prices;
    },
    refetchInterval: 30000, // Auto-update every 30 seconds
  });

  // Auto-fill market price when currency changes
  useEffect(() => {
    const marketPrice = cryptoPrices?.[formData.crypto_currency]?.usd;
    if (marketPrice && !formData.price_per_unit) {
      setFormData(prev => ({ ...prev, price_per_unit: marketPrice.toString() }));
    }
  }, [formData.crypto_currency, cryptoPrices]);

  const createOrderMutation = useMutation({
    mutationFn: async (data) => {
      const totalAmount = parseFloat(data.crypto_amount) * parseFloat(data.price_per_unit);
      
      return await base44.entities.P2POrder.create({
        ...data,
        seller_email: currentUser.email,
        total_amount: totalAmount,
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['p2p-orders']);
      queryClient.invalidateQueries(['my-p2p-orders']);
      toast.success('✅ Order created successfully!');
      onClose();
    },
    onError: (err) => {
      toast.error('Failed to create order: ' + err.message);
    }
  });

  const getAIPriceSuggestion = async () => {
    if (!formData.crypto_amount) {
      toast.error('Please enter amount first');
      return;
    }

    setLoadingAI(true);
    try {
      const { data } = await base44.functions.invoke('getAIPriceSuggestion', {
        cryptoCurrency: formData.crypto_currency,
        cryptoAmount: parseFloat(formData.crypto_amount),
        orderType: formData.order_type
      });

      if (data.success) {
        setAiSuggestion(data.suggestion);
        setFormData(prev => ({
          ...prev,
          price_per_unit: data.suggestion.recommended_price.toString()
        }));
        toast.success('🤖 AI price suggestion applied!');
      }
    } catch (error) {
      toast.error('Failed to get AI suggestion');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.crypto_amount || !formData.price_per_unit) {
      toast.error('Please fill in all required fields');
      return;
    }

    createOrderMutation.mutate(formData);
  };

  const paymentMethods = ['bank_transfer', 'card', 'crypto', 'paypal', 'venmo', 'cash_app'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden my-8"
      >
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Create P2P Order</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white font-semibold mb-2 block">Order Type</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setFormData({...formData, order_type: 'sell'})}
                  className={formData.order_type === 'sell' ? 'bg-green-600' : 'bg-gray-700'}
                >
                  Sell
                </Button>
                <Button
                  type="button"
                  onClick={() => setFormData({...formData, order_type: 'buy'})}
                  className={formData.order_type === 'buy' ? 'bg-blue-600' : 'bg-gray-700'}
                >
                  Buy
                </Button>
              </div>
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Cryptocurrency</label>
              <select
                value={formData.crypto_currency}
                onChange={(e) => setFormData({...formData, crypto_currency: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
              >
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="SoFloCoin">SoFloCoin (SFC)</option>
                <option value="USDT">Tether (USDT)</option>
                <option value="SOL">Solana (SOL)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white font-semibold mb-2 block">Amount</label>
              <Input
                type="number"
                step="any"
                value={formData.crypto_amount}
                onChange={(e) => setFormData({...formData, crypto_amount: e.target.value})}
                placeholder="0.00"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 flex items-center justify-between">
                <span>Price per Unit (USD)</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={getAIPriceSuggestion}
                    disabled={loadingAI || !formData.crypto_amount}
                    className="text-purple-400 hover:text-purple-300 disabled:opacity-50"
                    title="Get AI price suggestion"
                  >
                    {loadingAI ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => refetchPrices()}
                    className="text-blue-400 hover:text-blue-300"
                    title="Refresh price"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </label>
              <Input
                type="number"
                step="any"
                value={formData.price_per_unit}
                onChange={(e) => setFormData({...formData, price_per_unit: e.target.value})}
                placeholder="0.00"
                className="bg-white/10 border-white/20 text-white"
              />
              {cryptoPrices?.[formData.crypto_currency] && (
                <p className="text-xs text-gray-400 mt-1">
                  Market: ${cryptoPrices[formData.crypto_currency].usd.toLocaleString()} 
                  <span className={`ml-2 ${
                    cryptoPrices[formData.crypto_currency].change_24h >= 0 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {cryptoPrices[formData.crypto_currency].change_24h >= 0 ? '+' : ''}
                    {cryptoPrices[formData.crypto_currency].change_24h.toFixed(2)}%
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white font-semibold mb-2 block">Min Order Limit</label>
              <Input
                type="number"
                value={formData.min_order_limit}
                onChange={(e) => setFormData({...formData, min_order_limit: e.target.value})}
                placeholder="100"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Max Order Limit</label>
              <Input
                type="number"
                value={formData.max_order_limit}
                onChange={(e) => setFormData({...formData, max_order_limit: e.target.value})}
                placeholder="10000"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-2 block">Payment Methods</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    const methods = formData.payment_methods.includes(method)
                      ? formData.payment_methods.filter(m => m !== method)
                      : [...formData.payment_methods, method];
                    setFormData({...formData, payment_methods: methods});
                  }}
                  className={`px-3 py-2 rounded-lg text-sm transition ${
                    formData.payment_methods.includes(method)
                      ? 'bg-green-600 text-white'
                      : 'bg-white/10 text-gray-300'
                  }`}
                >
                  {method.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-2 block">Time Limit (minutes)</label>
            <Input
              type="number"
              value={formData.time_limit_minutes}
              onChange={(e) => setFormData({...formData, time_limit_minutes: parseInt(e.target.value)})}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-white font-semibold mb-2 block">Terms & Conditions</label>
            <Textarea
              value={formData.terms}
              onChange={(e) => setFormData({...formData, terms: e.target.value})}
              placeholder="Any specific terms for this trade..."
              className="bg-white/10 border-white/20 text-white h-24"
            />
          </div>

          {aiSuggestion && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 space-y-2">
              <p className="text-purple-300 font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Price Analysis
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Competitive Range</p>
                  <p className="text-white">${aiSuggestion.competitive_range.min} - ${aiSuggestion.competitive_range.max}</p>
                </div>
                <div>
                  <p className="text-gray-400">Market Trend</p>
                  <p className={`font-semibold ${
                    aiSuggestion.market_trend === 'bullish' ? 'text-green-400' :
                    aiSuggestion.market_trend === 'bearish' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {aiSuggestion.market_trend.toUpperCase()}
                  </p>
                </div>
              </div>
              <p className="text-purple-200 text-xs">{aiSuggestion.reasoning}</p>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-300 text-sm">
              💡 <strong>Total Value:</strong> {formData.crypto_amount && formData.price_per_unit 
                ? `$${(parseFloat(formData.crypto_amount) * parseFloat(formData.price_per_unit)).toFixed(2)}`
                : '$0.00'}
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createOrderMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}