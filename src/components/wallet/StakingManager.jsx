import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  X, TrendingUp, Lock, Unlock, DollarSign, 
  Calendar, Percent, RefreshCw, Plus, AlertCircle, Shield 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Crypto2FAModal from "./Crypto2FAModal";

export default function StakingManager({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState("ETH");
  const [stakeAmount, setStakeAmount] = useState("");
  const [lockPeriod, setLockPeriod] = useState(30);
  const [show2FA, setShow2FA] = useState(false);
  const [pendingStake, setPendingStake] = useState(null);

  // Fetch crypto wallets
  const { data: wallets = [] } = useQuery({
    queryKey: ['crypto-wallets', currentUser.email],
    queryFn: async () => {
      return await base44.entities.CryptoWallet.filter({
        user_email: currentUser.email,
        is_active: true
      });
    },
  });

  // Fetch active stakes
  const { data: stakes = [] } = useQuery({
    queryKey: ['stakes', currentUser.email],
    queryFn: async () => {
      const allStakes = await base44.entities.Staking.filter({
        user_email: currentUser.email
      });
      return allStakes.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    },
  });

  // Calculate rewards periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await base44.functions.invoke('calculateStakingRewards');
        queryClient.invalidateQueries(['stakes']);
      } catch (err) {
        console.log('Reward calculation error:', err);
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  // Staking options
  const stakingOptions = [
    { currency: "ETH", apy: 4.5, minLock: 7, icon: "Ξ", color: "from-blue-500 to-purple-500" },
    { currency: "SOL", apy: 7.2, minLock: 14, icon: "◎", color: "from-purple-500 to-pink-500" },
    { currency: "SoFloCoin", apy: 12.0, minLock: 30, icon: "✨", color: "from-purple-600 to-blue-600" },
    { currency: "BTC", apy: 3.5, minLock: 30, icon: "₿", color: "from-orange-500 to-yellow-500" },
  ];

  const stakeMutation = useMutation({
    mutationFn: async ({ currency, amount, lockDays, valueUSD }) => {
      const wallet = wallets.find(w => w.currency === currency);
      const sfcBalance = currency === 'SoFloCoin' ? (currentUser.soflo_coins || 0) : 0;
      const availableBalance = currency === 'SoFloCoin' ? sfcBalance : (wallet?.balance || 0);

      if (amount > availableBalance) {
        throw new Error(`Insufficient balance. Available: ${availableBalance.toFixed(4)} ${currency}`);
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Deduct from wallet and update daily staking usage
      if (currency === 'SoFloCoin') {
        await base44.auth.updateMe({
          soflo_coins: sfcBalance - amount,
          daily_staking_used: (currentUser.daily_staking_used || 0) + (valueUSD || 0)
        });
      } else {
        await base44.entities.CryptoWallet.update(wallet.id, {
          balance: wallet.balance - amount
        });
        await base44.auth.updateMe({
          daily_staking_used: (currentUser.daily_staking_used || 0) + (valueUSD || 0)
        });
      }

      const option = stakingOptions.find(o => o.currency === currency);
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + lockDays * 24 * 60 * 60 * 1000);

      return await base44.entities.Staking.create({
        user_email: currentUser.email,
        currency,
        amount,
        apy: option.apy,
        lock_period_days: lockDays,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        earned_rewards: 0,
        last_reward_calculation: startDate.toISOString(),
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stakes']);
      queryClient.invalidateQueries(['crypto-wallets']);
      queryClient.invalidateQueries(['currentUser']);
      toast.success('✅ Staking started!');
      setShowStakeModal(false);
      setStakeAmount("");
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to stake');
    }
  });

  const unstakeMutation = useMutation({
    mutationFn: async (stake) => {
      const now = new Date();
      const endDate = new Date(stake.end_date);
      
      if (now < endDate) {
        throw new Error('Lock period not completed. Early unstake will forfeit rewards.');
      }

      // Return principal + rewards
      const totalAmount = stake.amount + (stake.earned_rewards || 0);

      if (stake.currency === 'SoFloCoin') {
        await base44.auth.updateMe({
          soflo_coins: (currentUser.soflo_coins || 0) + totalAmount
        });
      } else {
        const wallet = wallets.find(w => w.currency === stake.currency);
        if (wallet) {
          await base44.entities.CryptoWallet.update(wallet.id, {
            balance: wallet.balance + totalAmount
          });
        }
      }

      return await base44.entities.Staking.update(stake.id, {
        status: 'completed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stakes']);
      queryClient.invalidateQueries(['crypto-wallets']);
      queryClient.invalidateQueries(['currentUser']);
      toast.success('✅ Unstaked successfully! Funds returned to wallet.');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to unstake');
    }
  });

  const getAvailableBalance = (currency) => {
    if (currency === 'SoFloCoin') return currentUser.soflo_coins || 0;
    const wallet = wallets.find(w => w.currency === currency);
    return wallet?.balance || 0;
  };

  const activeStakes = stakes.filter(s => s.status === 'active');
  const totalStaked = activeStakes.reduce((sum, s) => sum + s.amount, 0);
  const totalRewards = activeStakes.reduce((sum, s) => sum + (s.earned_rewards || 0), 0);

  const handleStake = () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const dailyLimit = currentUser?.daily_crypto_staking_limit || 50000;
    const dailyUsed = currentUser?.daily_staking_used || 0;
    const valueUSD = parseFloat(stakeAmount) * 2; // Simplified calculation

    if (dailyUsed + valueUSD > dailyLimit) {
      toast.error(`Daily staking limit exceeded. Remaining: $${(dailyLimit - dailyUsed).toFixed(2)}`);
      return;
    }

    if (currentUser?.crypto_2fa_enabled) {
      setPendingStake({
        currency: selectedCrypto,
        amount: parseFloat(stakeAmount),
        lockDays: lockPeriod,
        valueUSD
      });
      setShow2FA(true);
      return;
    }

    stakeMutation.mutate({
      currency: selectedCrypto,
      amount: parseFloat(stakeAmount),
      lockDays: lockPeriod,
      valueUSD
    });
  };

  const handle2FAVerified = (verified) => {
    setShow2FA(false);
    if (verified && pendingStake) {
      stakeMutation.mutate(pendingStake);
    }
    setPendingStake(null);
  };

  if (show2FA) {
    return <Crypto2FAModal onVerify={handle2FAVerified} onClose={() => setShow2FA(false)} action="staking" />;
  }

  return (
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
        className="w-full max-w-6xl bg-gray-900 rounded-3xl overflow-hidden my-8"
      >
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white">Crypto Staking</h2>
              <p className="text-purple-100">Earn passive income on your crypto</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-purple-100 text-sm">Total Staked</p>
              <p className="text-white text-2xl font-bold">{totalStaked.toFixed(4)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-purple-100 text-sm">Total Rewards</p>
              <p className="text-green-400 text-2xl font-bold">{totalRewards.toFixed(6)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-purple-100 text-sm">Active Stakes</p>
              <p className="text-white text-2xl font-bold">{activeStakes.length}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Staking Options */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Staking Options</h3>
              <Button
                onClick={() => setShowStakeModal(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Stake Crypto
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stakingOptions.map((option) => (
                <Card key={option.currency} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                  <CardContent className="p-6">
                    <div className={`text-4xl mb-3 bg-gradient-to-r ${option.color} bg-clip-text text-transparent font-bold`}>
                      {option.icon}
                    </div>
                    <h4 className="text-white font-bold text-lg mb-1">{option.currency}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">APY</span>
                        <span className="text-green-400 font-bold">{option.apy}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Min Lock</span>
                        <span className="text-white">{option.minLock} days</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Available</span>
                        <span className="text-white">{getAvailableBalance(option.currency).toFixed(4)}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedCrypto(option.currency);
                        setLockPeriod(option.minLock);
                        setShowStakeModal(true);
                      }}
                      className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                      size="sm"
                    >
                      Stake Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Active Stakes */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Your Stakes</h3>
            {stakes.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl">
                <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No active stakes yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stakes.map((stake) => {
                  const now = new Date();
                  const endDate = new Date(stake.end_date);
                  const isUnlocked = now >= endDate;
                  const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <Card key={stake.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-white font-bold text-xl">{stake.currency}</h4>
                              <Badge className={
                                stake.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                stake.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-gray-500/20 text-gray-400'
                              }>
                                {stake.status}
                              </Badge>
                              {!isUnlocked && stake.status === 'active' && (
                                <Badge className="bg-orange-500/20 text-orange-400">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Locked
                                </Badge>
                              )}
                              {isUnlocked && stake.status === 'active' && (
                                <Badge className="bg-green-500/20 text-green-400">
                                  <Unlock className="w-3 h-3 mr-1" />
                                  Unlocked
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-gray-400 text-sm mb-1">Staked Amount</p>
                                <p className="text-white font-bold">{stake.amount.toFixed(4)} {stake.currency}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm mb-1">Earned Rewards</p>
                                <p className="text-green-400 font-bold">{(stake.earned_rewards || 0).toFixed(6)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm mb-1">APY</p>
                                <p className="text-white font-bold">{stake.apy}%</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm mb-1">
                                  {isUnlocked ? 'Completed' : 'Days Remaining'}
                                </p>
                                <p className="text-white font-bold">
                                  {isUnlocked ? '✓' : `${daysRemaining} days`}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Started: {new Date(stake.start_date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Ends: {new Date(stake.end_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          {stake.status === 'active' && (
                            <Button
                              onClick={() => unstakeMutation.mutate(stake)}
                              disabled={!isUnlocked || unstakeMutation.isPending}
                              className={isUnlocked ? "bg-green-600 hover:bg-green-700" : "bg-gray-600"}
                              title={!isUnlocked ? 'Cannot unstake before lock period ends' : 'Unstake and claim rewards'}
                            >
                              {unstakeMutation.isPending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4 mr-2" />
                                  Unstake
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Stake Modal */}
        <AnimatePresence>
          {showStakeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80"
              onClick={() => setShowStakeModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-gray-800 rounded-2xl p-6"
              >
                <h3 className="text-2xl font-bold text-white mb-4">Stake {selectedCrypto}</h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Amount to Stake</label>
                    <Input
                      type="number"
                      step="any"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-white/10 border-white/20 text-white text-xl"
                    />
                    <p className="text-gray-400 text-xs mt-2">
                      Available: {getAvailableBalance(selectedCrypto).toFixed(4)} {selectedCrypto}
                    </p>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Lock Period</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[7, 14, 30, 90].map((days) => (
                        <button
                          key={days}
                          onClick={() => setLockPeriod(days)}
                          className={`p-3 rounded-lg transition ${
                            lockPeriod === days
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/10 text-gray-300 hover:bg-white/20'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-400">Estimated APY</span>
                      <span className="text-green-400 font-bold">
                        {stakingOptions.find(o => o.currency === selectedCrypto)?.apy}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Est. Rewards ({lockPeriod}d)</span>
                      <span className="text-white font-bold">
                        {stakeAmount ? (
                          (parseFloat(stakeAmount) * (stakingOptions.find(o => o.currency === selectedCrypto)?.apy / 100) * (lockPeriod / 365)).toFixed(6)
                        ) : '0.00'} {selectedCrypto}
                      </span>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                    <div className="flex items-start gap-2 text-yellow-300 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p>Funds will be locked for {lockPeriod} days. Early unstaking forfeits rewards.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowStakeModal(false)}
                      variant="outline"
                      className="flex-1 border-white/20"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleStake}
                      disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || stakeMutation.isPending}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {stakeMutation.isPending ? 'Staking...' : 'Confirm Stake'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}