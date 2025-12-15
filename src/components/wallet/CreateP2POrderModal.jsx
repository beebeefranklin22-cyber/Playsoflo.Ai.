import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
              <label className="text-white font-semibold mb-2 block">Price per Unit (USD)</label>
              <Input
                type="number"
                step="any"
                value={formData.price_per_unit}
                onChange={(e) => setFormData({...formData, price_per_unit: e.target.value})}
                placeholder="0.00"
                className="bg-white/10 border-white/20 text-white"
              />
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