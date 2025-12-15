import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Gift, TrendingUp, Users, Lock, DollarSign, Award, Calendar, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function RewardsProgram({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: rewards = [] } = useQuery({
    queryKey: ['crypto-rewards', currentUser.email],
    queryFn: async () => {
      const all = await base44.entities.CryptoReward.filter({
        user_email: currentUser.email
      });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const claimRewardMutation = useMutation({
    mutationFn: async (rewardId) => {
      const reward = rewards.find(r => r.id === rewardId);
      
      // Add to wallet
      if (reward.reward_currency === 'SoFloCoin') {
        await base44.auth.updateMe({
          soflo_coins: (currentUser.soflo_coins || 0) + reward.reward_amount
        });
      } else {
        const wallets = await base44.entities.CryptoWallet.filter({
          user_email: currentUser.email,
          currency: reward.reward_currency
        });
        
        if (wallets[0]) {
          await base44.entities.CryptoWallet.update(wallets[0].id, {
            balance: wallets[0].balance + reward.reward_amount
          });
        }
      }

      // Update reward status
      return await base44.entities.CryptoReward.update(rewardId, {
        status: 'claimed',
        distributed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crypto-rewards']);
      queryClient.invalidateQueries(['currentUser']);
      queryClient.invalidateQueries(['crypto-wallets']);
      toast.success('✅ Reward claimed!');
    }
  });

  const pendingRewards = rewards.filter(r => r.status === 'pending');
  const claimedRewards = rewards.filter(r => r.status === 'claimed');
  const totalEarned = claimedRewards.reduce((sum, r) => sum + (r.reward_value_usd || 0), 0);

  const rewardCategories = [
    { icon: Users, label: 'Referrals', desc: 'Invite friends, earn crypto', reward: '10 SFC per referral' },
    { icon: TrendingUp, label: 'DeFi Activity', desc: 'Stake, farm, provide liquidity', reward: 'Up to 5% bonus' },
    { icon: Lock, label: 'HODLing', desc: 'Hold assets for rewards', reward: '0.1% weekly' },
    { icon: DollarSign, label: 'Trading Volume', desc: 'Trade to earn', reward: '0.05% cashback' },
  ];

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
        className="w-full max-w-5xl bg-gray-900 rounded-3xl overflow-hidden my-8"
      >
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                <Gift className="w-8 h-8" />
                Crypto Rewards
              </h2>
              <p className="text-purple-100">Earn crypto for your activity</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-purple-100 text-sm">Pending Rewards</p>
              <p className="text-white text-2xl font-bold">{pendingRewards.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-purple-100 text-sm">Total Claimed</p>
              <p className="text-white text-2xl font-bold">{claimedRewards.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-purple-100 text-sm">Lifetime Earned</p>
              <p className="text-white text-2xl font-bold">${totalEarned.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-3 mb-6">
            <Button
              onClick={() => setActiveTab('overview')}
              variant={activeTab === 'overview' ? 'default' : 'outline'}
              className={activeTab === 'overview' ? 'bg-purple-600' : ''}
            >
              Overview
            </Button>
            <Button
              onClick={() => setActiveTab('pending')}
              variant={activeTab === 'pending' ? 'default' : 'outline'}
              className={activeTab === 'pending' ? 'bg-purple-600' : ''}
            >
              Pending ({pendingRewards.length})
            </Button>
            <Button
              onClick={() => setActiveTab('history')}
              variant={activeTab === 'history' ? 'default' : 'outline'}
              className={activeTab === 'history' ? 'bg-purple-600' : ''}
            >
              History
            </Button>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Earn Rewards</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {rewardCategories.map((cat, idx) => (
                    <Card key={idx} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <cat.icon className="w-6 h-6 text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-bold mb-1">{cat.label}</h4>
                            <p className="text-gray-400 text-sm mb-2">{cat.desc}</p>
                            <Badge className="bg-green-500/20 text-green-400">{cat.reward}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-6 h-6 text-purple-400" />
                  <h4 className="text-white font-bold text-lg">Referral Program</h4>
                </div>
                <p className="text-gray-300 mb-4">Invite friends and earn 10 SFC per successful referral!</p>
                <div className="flex gap-3">
                  <input
                    readOnly
                    value={`https://playsoflo.com/ref/${currentUser.email}`}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://playsoflo.com/ref/${currentUser.email}`);
                      toast.success('Referral link copied!');
                    }}
                    className="bg-purple-600"
                  >
                    Copy Link
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="space-y-3">
              {pendingRewards.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No pending rewards</p>
                </div>
              ) : (
                pendingRewards.map((reward) => (
                  <Card key={reward.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                            <h4 className="text-white font-bold">{reward.action_description}</h4>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-400">
                              {new Date(reward.created_date).toLocaleDateString()}
                            </span>
                            <Badge className="bg-purple-500/20 text-purple-400">
                              {reward.reward_type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 text-2xl font-bold">
                            +{reward.reward_amount} {reward.reward_currency}
                          </p>
                          <p className="text-gray-400 text-sm">${reward.reward_value_usd?.toFixed(2)}</p>
                          <Button
                            onClick={() => claimRewardMutation.mutate(reward.id)}
                            disabled={claimRewardMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 mt-2"
                            size="sm"
                          >
                            Claim
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {claimedRewards.map((reward) => (
                <Card key={reward.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-2">{reward.action_description}</h4>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(reward.distributed_at).toLocaleDateString()}
                          </span>
                          <Badge className="bg-gray-500/20 text-gray-400">
                            {reward.reward_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-xl font-bold">
                          {reward.reward_amount} {reward.reward_currency}
                        </p>
                        <p className="text-gray-500 text-sm">${reward.reward_value_usd?.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}