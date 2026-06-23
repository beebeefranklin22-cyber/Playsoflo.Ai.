import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { X, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function RequestPayoutModal({ currentUser, availableBalance, payoutMethods, onClose }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState('');

  const platformFeeRate = 0.05; // 5% platform fee
  const processingFeeRate = 0.029; // 2.9% processing fee

  const requestAmount = parseFloat(amount) || 0;
  const platformFee = requestAmount * platformFeeRate;
  const processingFee = requestAmount * processingFeeRate;
  const netAmount = requestAmount - platformFee - processingFee;

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const selectedMethod = payoutMethods.find(m => m.id === selectedMethodId);
      
      // Calculate revenue breakdown
      const tips = await base44.entities.TipTransaction.filter({ 
        recipient_email: currentUser.email,
        status: 'completed'
      });
      
      const tickets = await base44.entities.LivestreamTicket.filter({
        creator_email: currentUser.email
      });

      const ppvPurchases = await base44.entities.PPVPurchase.filter({
        creator_email: currentUser.email
      });

      const products = await base44.entities.CreatorProduct.filter({
        creator_email: currentUser.email
      });

      const revenue_breakdown = {
        tips: tips.reduce((sum, t) => sum + (t.amount || 0), 0),
        livestream_tickets: tickets.reduce((sum, t) => sum + (t.amount_paid_usd || 0), 0),
        ppv: ppvPurchases.reduce((sum, p) => sum + (p.amount || 0), 0),
        products: products.reduce((sum, p) => sum + ((p.price || 0) * (p.units_sold || 0)), 0),
        subscriptions: 0
      };

      return base44.entities.PayoutRequest.create({
        user_email: currentUser.email,
        amount: requestAmount,
        payout_method_id: selectedMethodId,
        method_type: selectedMethod.method_type,
        status: 'pending',
        requested_date: new Date().toISOString(),
        platform_fee: platformFee,
        processing_fee: processingFee,
        net_amount: netAmount,
        revenue_breakdown
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-requests'] });
      queryClient.invalidateQueries({ queryKey: ['available-balance'] });
      toast.success('Payout request submitted successfully');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to submit payout request: ' + error.message);
    }
  });

  const activeMethods = payoutMethods.filter(m => m.status === 'active');
  const primaryMethod = activeMethods.find(m => m.is_primary);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-400" />
            Request Payout
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Available Balance */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Available Balance</div>
            <div className="text-3xl font-bold text-white">${availableBalance.toFixed(2)}</div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Payout Amount</label>
            <Input
              type="number"
              min="10"
              max={availableBalance}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount..."
              className="bg-white/10 border-white/20 text-white text-lg"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Minimum: $10.00</span>
              <span>Maximum: ${availableBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Payout Method */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Payout Method</label>
            <Select 
              value={selectedMethodId} 
              onValueChange={setSelectedMethodId}
              defaultValue={primaryMethod?.id}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select method..." />
              </SelectTrigger>
              <SelectContent>
                {activeMethods.map(method => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.method_type.replace('_', ' ')} {method.is_primary && '(Primary)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fee Breakdown */}
          {requestAmount >= 10 && (
            <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Requested Amount</span>
                <span className="text-white">${requestAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Platform Fee (5%)</span>
                <span className="text-red-400">-${platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Processing Fee (2.9%)</span>
                <span className="text-red-400">-${processingFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
                <span className="text-white">You'll Receive</span>
                <span className="text-green-400">${netAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Warnings */}
          {requestAmount > 0 && requestAmount < 10 && (
            <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-300">
                Minimum payout amount is $10.00
              </div>
            </div>
          )}

          {requestAmount > availableBalance && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-300">
                Amount exceeds your available balance
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-gray-400 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <strong className="text-blue-300">Processing Time:</strong> Payouts are typically processed within 2-5 business days. 
            You'll receive a notification when your payout is completed.
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => requestPayoutMutation.mutate()}
              disabled={
                requestAmount < 10 || 
                requestAmount > availableBalance || 
                !selectedMethodId ||
                requestPayoutMutation.isPending
              }
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {requestPayoutMutation.isPending ? 'Processing...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}