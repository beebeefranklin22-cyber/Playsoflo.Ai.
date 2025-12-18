import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, DollarSign, Wallet, Building, CheckCircle, AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProviderPayoutManager({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("wallet");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch provider earnings
  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-completed-bookings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const allBookings = await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email,
        status: 'completed'
      });
      return allBookings;
    },
    enabled: !!currentUser && isOpen
  });

  const { data: rentals = [] } = useQuery({
    queryKey: ['provider-completed-rentals', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const allRentals = await base44.entities.CarRental.filter({
        provider_email: currentUser.email,
        status: 'completed'
      });
      return allRentals;
    },
    enabled: !!currentUser && isOpen
  });

  const { data: propertyBookings = [] } = useQuery({
    queryKey: ['provider-completed-property', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const allPropertyBookings = await base44.entities.Booking.filter({
        host_email: currentUser.email,
        status: 'completed'
      });
      return allPropertyBookings;
    },
    enabled: !!currentUser && isOpen
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', currentUser?.email],
    queryFn: () => base44.entities.BankAccount.filter({ user_email: currentUser.email }),
    enabled: !!currentUser && isOpen
  });

  // Calculate available earnings (platform takes 5-19% fee)
  const calculateEarnings = () => {
    const bookingEarnings = bookings.reduce((sum, b) => {
      const platformFee = (b.total_price || 0) * 0.05; // 5% platform fee
      return sum + ((b.total_price || 0) - platformFee);
    }, 0);

    const rentalEarnings = rentals.reduce((sum, r) => {
      const fee = (r.total_amount || 0) * (r.platform_commission_rate || 0.19);
      return sum + ((r.total_amount || 0) - fee);
    }, 0);

    const propertyEarnings = propertyBookings.reduce((sum, b) => {
      const platformFee = (b.total_price || 0) * 0.10; // 10% platform fee for properties
      return sum + ((b.total_price || 0) - platformFee);
    }, 0);

    return bookingEarnings + rentalEarnings + propertyEarnings;
  };

  const availableEarnings = calculateEarnings() - (currentUser?.total_payouts_requested || 0);

  const requestPayoutMutation = useMutation({
    mutationFn: async ({ amount, method, bankId }) => {
      const response = await base44.functions.invoke('processProviderPayout', {
        amount,
        payout_method: method,
        bank_account_id: bankId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      queryClient.invalidateQueries(['provider-completed-bookings']);
      setSuccess(true);
      toast.success('Payout processed successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message || 'Payout failed');
      setProcessing(false);
    }
  });

  const handlePayout = () => {
    const payoutAmount = parseFloat(amount);
    
    if (!payoutAmount || payoutAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (payoutAmount > availableEarnings) {
      toast.error('Amount exceeds available earnings');
      return;
    }

    if (payoutAmount < 10) {
      toast.error('Minimum payout is $10');
      return;
    }

    if (payoutMethod === 'bank' && !selectedBankId) {
      toast.error('Please select a bank account');
      return;
    }

    setProcessing(true);
    requestPayoutMutation.mutate({
      amount: payoutAmount,
      method: payoutMethod,
      bankId: selectedBankId
    });
  };

  if (!isOpen) return null;

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
          className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-green-400" />
              Request Payout
            </h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {!success ? (
            <div className="space-y-6">
              {/* Earnings Summary */}
              <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Available Earnings</p>
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-white text-3xl font-bold">${availableEarnings.toFixed(2)}</p>
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-400">
                      <span>Service Bookings:</span>
                      <span>${(bookings.reduce((s, b) => s + ((b.total_price || 0) * 0.95), 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Car Rentals:</span>
                      <span>${(rentals.reduce((s, r) => s + ((r.total_amount || 0) * 0.81), 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Property Rentals:</span>
                      <span>${(propertyBookings.reduce((s, b) => s + ((b.total_price || 0) * 0.90), 0)).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Amount Input */}
              <div>
                <label className="text-white font-semibold mb-3 block">Payout Amount</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-white/10 border-white/20 text-white text-2xl text-center"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setAmount((availableEarnings * 0.25).toFixed(2))}
                    className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setAmount((availableEarnings * 0.5).toFixed(2))}
                    className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setAmount((availableEarnings * 0.75).toFixed(2))}
                    className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setAmount(availableEarnings.toFixed(2))}
                    className="flex-1 px-3 py-2 bg-green-600 rounded-lg text-white text-sm hover:bg-green-700"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Payout Method */}
              <div>
                <label className="text-white font-semibold mb-3 block">Payout Method</label>
                <div className="space-y-3">
                  <button
                    onClick={() => setPayoutMethod('wallet')}
                    className={`w-full p-4 rounded-xl border-2 transition ${
                      payoutMethod === 'wallet'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-white/20 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="w-6 h-6 text-white" />
                      <div className="text-left">
                        <p className="text-white font-semibold">PlaySoFlo Wallet</p>
                        <p className="text-gray-400 text-sm">Instant • Use in-app or withdraw</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPayoutMethod('bank')}
                    className={`w-full p-4 rounded-xl border-2 transition ${
                      payoutMethod === 'bank'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-white/20 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Building className="w-6 h-6 text-white" />
                      <div className="text-left">
                        <p className="text-white font-semibold">Bank Transfer</p>
                        <p className="text-gray-400 text-sm">1-3 business days • Direct deposit</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Bank Selection */}
              {payoutMethod === 'bank' && (
                <div>
                  <label className="text-white font-semibold mb-3 block">Select Bank Account</label>
                  {bankAccounts.length === 0 ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <p className="text-yellow-300 text-sm mb-3">
                        No bank accounts linked. Add one to enable bank transfers.
                      </p>
                      <Button
                        onClick={() => {
                          onClose();
                          // Navigate to wallet to add bank
                          setTimeout(() => {
                            window.location.href = '/Wallet';
                          }, 100);
                        }}
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        Add Bank Account
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Choose bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.bank_name} ••••{bank.account_number_last4}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Fee Notice */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-300 text-xs">
                    Platform fees (5-19%) have already been deducted from your earnings shown above. The full amount is yours to withdraw.
                  </p>
                </div>
              </div>

              {/* Minimum Notice */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-300 text-xs">
                    Minimum payout: $10 • Wallet transfers are instant • Bank transfers take 1-3 business days
                  </p>
                </div>
              </div>

              <Button
                onClick={handlePayout}
                disabled={processing || !amount || parseFloat(amount) < 10 || (payoutMethod === 'bank' && !selectedBankId)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-6 text-lg"
              >
                {processing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  'Request Payout'
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Payout Successful!</h3>
              <p className="text-gray-300 mb-6">
                ${parseFloat(amount).toFixed(2)} has been {payoutMethod === 'wallet' ? 'added to your wallet' : 'sent to your bank account'}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {payoutMethod === 'wallet' ? 'View Wallet' : 'Done'}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}