import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, TrendingUp, ArrowUpRight, Wallet, 
  Coins, Download, Calendar, CheckCircle, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function EarningsSection({ currentUser }) {
  const queryClient = useQueryClient();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawType, setWithdrawType] = useState("wallet");

  // Fetch earnings data
  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-bookings-earnings', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email
      }, '-created_date');
    },
    enabled: !!currentUser
  });

  // Calculate metrics
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const pendingEarnings = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'pending')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);
  
  const availableBalance = currentUser?.provider_wallet_balance || 0;
  
  // Monthly earnings data for chart
  const monthlyData = {};
  completedBookings.forEach(booking => {
    const month = new Date(booking.booking_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthlyData[month] = (monthlyData[month] || 0) + booking.total_price;
  });
  
  const chartData = Object.entries(monthlyData).map(([month, earnings]) => ({
    month,
    earnings
  })).slice(-6);

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: async ({ amount, type }) => {
      const newBalance = availableBalance - amount;
      
      if (type === 'wallet') {
        // Transfer to main wallet and convert to SoFloCoin
        const sofloCoinRate = 0.01; // $1 = 100 SFC (example)
        const sofloCoinAmount = amount / sofloCoinRate;
        
        // Create crypto transaction
        await base44.entities.CryptoTransaction.create({
          currency: 'SFC',
          amount: sofloCoinAmount,
          transaction_type: 'provider_earnings_transfer',
          status: 'completed',
          usd_value: amount,
          memo: `Provider earnings transfer: $${amount} → ${sofloCoinAmount.toFixed(2)} SFC`
        });
      } else {
        // Withdraw to bank (would integrate with Stripe)
        await base44.entities.Payment.create({
          amount_usd: amount,
          method: 'bank_transfer',
          status: 'pending',
          reference_type: 'provider_withdrawal',
          memo: 'Provider withdrawal to bank account'
        });
      }
      
      // Update provider wallet balance
      await base44.auth.updateMe({
        provider_wallet_balance: newBalance
      });
      
      return { type, amount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['current-user']);
      setShowWithdraw(false);
      setWithdrawAmount("");
      
      if (data.type === 'wallet') {
        toast.success(`Transferred $${data.amount} to wallet as SoFloCoin!`);
      } else {
        toast.success(`Withdrawal of $${data.amount} initiated!`);
      }
    },
    onError: () => {
      toast.error('Withdrawal failed');
    }
  });

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > availableBalance) {
      toast.error('Invalid amount');
      return;
    }
    withdrawMutation.mutate({ amount, type: withdrawType });
  };

  return (
    <div className="space-y-6">
      {/* Earnings Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="w-8 h-8 text-green-400" />
              <Badge className="bg-green-500/30 text-green-300 border-0">Available</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">${availableBalance.toFixed(2)}</div>
            <div className="text-green-300 text-sm">Ready to Withdraw</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-blue-400" />
              <Badge className="bg-blue-500/30 text-blue-300 border-0">Total</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">${totalEarnings.toFixed(2)}</div>
            <div className="text-blue-300 text-sm">All-Time Earnings</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-400" />
              <Badge className="bg-yellow-500/30 text-yellow-300 border-0">Pending</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">${pendingEarnings.toFixed(2)}</div>
            <div className="text-yellow-300 text-sm">Upcoming Bookings</div>
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Actions */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Withdraw Earnings</h3>
              <p className="text-gray-400 text-sm">Transfer to wallet or bank account</p>
            </div>
            <Button
              onClick={() => setShowWithdraw(!showWithdraw)}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={availableBalance <= 0}
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
          </div>

          <AnimatePresence>
            {showWithdraw && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4 border-t border-white/10"
              >
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Amount (USD)</label>
                  <Input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    max={availableBalance}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <p className="text-gray-500 text-xs mt-1">Available: ${availableBalance.toFixed(2)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setWithdrawType('wallet')}
                    className={`p-4 rounded-xl border-2 transition ${
                      withdrawType === 'wallet'
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <Coins className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-white font-medium mb-1">To Wallet</p>
                    <p className="text-gray-400 text-xs">Get SoFloCoin rewards</p>
                  </button>

                  <button
                    onClick={() => setWithdrawType('bank')}
                    className={`p-4 rounded-xl border-2 transition ${
                      withdrawType === 'bank'
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <Download className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-white font-medium mb-1">To Bank</p>
                    <p className="text-gray-400 text-xs">Direct deposit (2-3 days)</p>
                  </button>
                </div>

                {withdrawType === 'wallet' && withdrawAmount && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                    <p className="text-purple-300 text-sm">
                      You'll receive <span className="font-bold">{(parseFloat(withdrawAmount) * 100).toFixed(2)} SFC</span> in your wallet
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > availableBalance || withdrawMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {withdrawMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Withdrawal
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Earnings Chart */}
      {chartData.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Earnings Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="earnings" stroke="#a855f7" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Earnings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Recent Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {completedBookings.slice(0, 10).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex-1">
                  <p className="text-white font-medium">{booking.service_title}</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(booking.booking_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-green-400 font-bold">+${booking.total_price}</div>
              </div>
            ))}
            
            {completedBookings.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No completed bookings yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}