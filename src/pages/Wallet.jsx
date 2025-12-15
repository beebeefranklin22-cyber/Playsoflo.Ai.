import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Wallet as WalletIcon, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Send, Download, Eye, EyeOff, Sparkles, CreditCard,
  Bitcoin, DollarSign, PiggyBank, Zap, Building, ArrowDownUp,
  Plus, Crown, Building2, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SendMoneyModal from "../components/wallet/SendMoneyModal";
import CryptoExchangeModal from "../components/wallet/CryptoExchangeModal";
import CardManagementModal from "../components/wallet/CardManagementModal";
import BankAccountModal from "../components/wallet/BankAccountModal";
import AddMoneyModal from "../components/wallet/AddMoneyModal";
import WithdrawModal from "../components/wallet/WithdrawModal";
import SubscriptionManagementModal from "../components/wallet/SubscriptionManagementModal";
import WireTransferModal from "../components/wallet/WireTransferModal";
import PaymentMethodsManager from "../components/wallet/PaymentMethodsManager";
import PendingTransfersModal from "../components/wallet/PendingTransfersModal";
import CryptoDepositModal from "../components/wallet/CryptoDepositModal";
import CryptoWithdrawModal from "../components/wallet/CryptoWithdrawModal";
import StakingManager from "../components/wallet/StakingManager";

export default function Wallet() {
  const [showBalance, setShowBalance] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user;
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: cryptoPrices = {} } = useQuery({
    queryKey: ['crypto-prices'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getCryptoPrices');
      return data.prices;
    },
    refetchInterval: 30000, // Update every 30 seconds
    staleTime: 20000,
  });

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const action = searchParams.get('action');
    
    if (paymentStatus === 'success') {
      if (action === 'add_card') {
        toast.success('✅ Payment method added successfully!');
      } else {
        toast.success('Payment completed successfully!');
      }
      // Clean URL without page reload
      window.history.replaceState({}, '', createPageUrl("Wallet"));
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment setup cancelled');
      window.history.replaceState({}, '', createPageUrl("Wallet"));
    }
  }, [searchParams]);

  useEffect(() => {
    const checkLowBalance = async () => {
      if (!currentUser) return;
      try {
        if (currentUser.usd_balance < 10) {
          const recentWarnings = await base44.entities.Notification.filter({
            recipient_email: currentUser.email,
            type: "payment_received",
            title: "Low Balance Warning"
          });

          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentWarning = recentWarnings.find(n => new Date(n.created_date) > oneDayAgo);

          if (!recentWarning) {
            await base44.entities.Notification.create({
              recipient_email: currentUser.email,
              type: "payment_received",
              title: "Low Balance Warning",
              message: `Your wallet balance is low ($${currentUser.usd_balance.toFixed(2)}). Add funds to continue using services.`,
              read: false,
              action_url: "/Wallet"
            });
          }
        }
      } catch (error) {
        console.log("Error checking low balance:", error);
      }
    };
    checkLowBalance();
  }, [currentUser]);

  const { data: cryptoWallets = [] } = useQuery({
    queryKey: ['crypto-wallets', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.CryptoWallet.filter({
        user_email: currentUser.email,
        is_active: true
      });
    },
    enabled: !!currentUser,
  });

  const cryptoAssets = [
    { 
      name: "SoFloCoin",
      symbol: "SFC",
      balance: currentUser?.soflo_coins || 0, 
      value: ((currentUser?.soflo_coins || 0) * (cryptoPrices?.SoFloCoin?.usd || 2.45)).toFixed(2),
      change: `${(cryptoPrices?.SoFloCoin?.change_24h || 0) >= 0 ? '+' : ''}${(cryptoPrices?.SoFloCoin?.change_24h || 0).toFixed(2)}%`,
      color: "purple",
      icon: Sparkles
    },
    { 
      name: "Bitcoin", 
      symbol: "BTC", 
      balance: cryptoWallets.find(w => w.currency === 'BTC')?.balance || 0, 
      value: ((cryptoWallets.find(w => w.currency === 'BTC')?.balance || 0) * (cryptoPrices?.BTC?.usd || 0)).toFixed(2),
      change: `${(cryptoPrices?.BTC?.change_24h || 0) >= 0 ? '+' : ''}${(cryptoPrices?.BTC?.change_24h || 0).toFixed(2)}%`,
      color: "orange",
      icon: Bitcoin
    },
    { 
      name: "Ethereum",
      symbol: "ETH",
      balance: cryptoWallets.find(w => w.currency === 'ETH')?.balance || 0,
      value: ((cryptoWallets.find(w => w.currency === 'ETH')?.balance || 0) * (cryptoPrices?.ETH?.usd || 0)).toFixed(2),
      change: `${(cryptoPrices?.ETH?.change_24h || 0) >= 0 ? '+' : ''}${(cryptoPrices?.ETH?.change_24h || 0).toFixed(2)}%`,
      color: "blue",
      icon: Zap
    },
    { 
      name: "USD Balance", 
      symbol: "USD", 
      balance: currentUser?.usd_balance || 0, 
      value: (currentUser?.usd_balance || 0).toFixed(2),
      change: "+0.0%",
      color: "green",
      icon: DollarSign
    },
  ];

  // Fetch real transaction history
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const payments = await base44.entities.Payment.filter({
        created_by: currentUser.email
      });
      return payments.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20);
    },
    enabled: !!currentUser,
    refetchInterval: 15000,
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Header with Balance */}
      <div className="relative px-6 pt-12 pb-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Wallet</h1>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            {showBalance ? <Eye className="w-5 h-5 text-white" /> : <EyeOff className="w-5 h-5 text-white" />}
          </button>
        </div>

        {/* Total Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative glass-effect rounded-3xl p-8 glow-effect"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
          
          <div className="relative">
            <p className="text-gray-400 mb-2">Total Portfolio Value</p>
            <h2 className="text-5xl font-bold text-white mb-4">
              {showBalance ? `$${((currentUser?.usd_balance || 0) + ((currentUser?.soflo_coins || 0) * 2.45)).toFixed(2)}` : "••••••"}
            </h2>
            <div className="flex items-center gap-2 text-gray-400">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">+0.0%</span>
              <span className="text-gray-400 text-sm">this month</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-3 mt-8">
            <button 
              onClick={() => setActiveModal('add')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-white text-xs font-medium">Add Money</span>
            </button>

            <button 
              onClick={() => setActiveModal('send')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Send className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-white text-xs font-medium">Send</span>
            </button>

            <button 
              onClick={() => setActiveModal('withdraw')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Download className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-white text-xs font-medium">Withdraw</span>
            </button>

            <button 
              onClick={() => setActiveModal('exchange')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <ArrowDownUp className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-white text-xs font-medium">Exchange</span>
            </button>
            
            <button 
              onClick={() => setActiveModal('pending')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-white text-xs font-medium">Pending</span>
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-4 gap-3 mt-3">
            <button 
              onClick={() => setActiveModal('payment-methods')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-white text-xs font-medium">Payment</span>
            </button>

            <button 
              onClick={() => setActiveModal('banks')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center">
                <Building className="w-6 h-6 text-teal-400" />
              </div>
              <span className="text-white text-xs font-medium">Banks</span>
            </button>

            <button 
              onClick={() => setActiveModal('subscription')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-white text-xs font-medium">Plans</span>
            </button>

            <button 
              onClick={() => setActiveModal('wire')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-indigo-400" />
              </div>
              <span className="text-white text-xs font-medium">Wire</span>
            </button>

            <button 
              onClick={() => setActiveModal('crypto-deposit')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-white text-xs font-medium">Deposit</span>
            </button>

            <button 
              onClick={() => setActiveModal('crypto-withdraw')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-red-400" />
              </div>
              <span className="text-white text-xs font-medium">Send Crypto</span>
            </button>

            <button 
              onClick={() => setActiveModal('staking')}
              className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition"
            >
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-white text-xs font-medium">Staking</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Assets */}
      <div className="px-6 mb-8">
        <h3 className="text-xl font-bold text-white mb-4">Your Assets</h3>
        <div className="space-y-3">
          {cryptoAssets.map((asset, index) => (
            <motion.div
              key={asset.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect rounded-2xl p-5 hover:bg-white/10 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-${asset.color}-500/20 rounded-full flex items-center justify-center`}>
                    <asset.icon className={`w-6 h-6 text-${asset.color}-400`} />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">{asset.name}</h4>
                    <p className="text-gray-400 text-sm">
                      {showBalance ? `${asset.balance} ${asset.symbol}` : "••••"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-white font-semibold">
                    {showBalance ? `$${asset.value}` : "••••"}
                  </p>
                  <p className={`text-sm ${parseFloat(asset.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {asset.change}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Manage Utilities CTA */}
      <div className="px-6 mt-8">
        <div className="relative glass-effect rounded-3xl p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl opacity-30" />
          <div className="relative">
            <h4 className="text-2xl font-bold text-white mb-2">Pay Utilities & Manage Assets</h4>
            <p className="text-gray-300 mb-4">Handle bills and track property, vehicles, and more</p>
            <button className="px-6 py-3 bg-cyan-600 rounded-full text-white font-semibold hover:scale-105 transition-transform" onClick={() => navigate(createPageUrl("Utilities"))}>
              Open Utilities
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-6">
        <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {transactions.length > 0 ? transactions.map((tx, index) => {
            const isIncoming = tx.reference_type === 'deposit' || tx.reference_type === 'received';
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.5) }}
                className="glass-effect rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${
                    isIncoming ? "bg-green-500/20" : "bg-red-500/20"
                  } rounded-full flex items-center justify-center`}>
                    {isIncoming ? (
                      <ArrowDownLeft className="w-5 h-5 text-green-400" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{tx.memo || tx.reference_type}</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(tx.created_date).toLocaleDateString()} • {tx.method}
                    </p>
                    <p className="text-gray-500 text-xs capitalize">{tx.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    isIncoming ? "text-green-400" : "text-red-400"
                  }`}>
                    {isIncoming ? '+' : '-'}${tx.amount_usd?.toFixed(2) || '0.00'}
                  </p>
                  {tx.amount_rri > 0 && (
                    <p className="text-purple-400 text-xs">{tx.amount_rri} SFC</p>
                  )}
                </div>
              </motion.div>
            );
          }) : (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No transactions yet</h3>
              <p className="text-gray-400">Your transaction history will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Premium Upgrade Banner */}
      <div className="px-6 mt-8">
        <div className="relative glass-effect rounded-3xl p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-3xl opacity-30" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-semibold text-sm">ELITE ACCESS</span>
            </div>
            <h4 className="text-2xl font-bold text-white mb-2">
              Upgrade to Elite
            </h4>
            <p className="text-gray-300 mb-4">
              Get private banking, higher limits, and exclusive experiences
            </p>
            <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold hover:scale-105 transition-transform">
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* SoFloCoin Breakdown Section */}
      <div className="px-6 mt-8">
        <div className="relative glass-effect rounded-3xl p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl opacity-30" />
          <div className="relative">
            <h4 className="text-2xl font-bold text-white mb-2">SoFloCoin (Ronron Reserve Index Backed)</h4> {/* Updated title */}
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• 40% USD (short-term T-bills)</li>
              <li>• 25% tokenized gold</li>
              <li>• 15% BTC</li>
              <li>• 10% ETH</li>
              <li>• 10% diversified foreign currencies (EUR, JPY, GBP)</li>
            </ul>
            <p className="text-gray-400 text-sm mt-3">SoFloCoin is a hybrid reserve-backed stable asset for PlaySoFlo.</p> {/* Updated description */}
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="px-6 mt-8">
        <div className="relative glass-effect rounded-3xl p-6 overflow-hidden border border-green-500/30">
          <div className="relative">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-green-400" />
              Bank-Grade Security
            </h4>
            <p className="text-gray-300 text-sm">Your wallet is protected by military-grade encryption, multi-factor authentication, and anti-bot technology. All transactions are monitored 24/7 for fraudulent activity.</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'add' && currentUser && (
        <AddMoneyModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'send' && currentUser && (
        <SendMoneyModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'withdraw' && currentUser && (
        <WithdrawModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'exchange' && currentUser && (
        <CryptoExchangeModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'cards' && currentUser && (
        <CardManagementModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'banks' && currentUser && (
        <BankAccountModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'subscription' && currentUser && (
        <SubscriptionManagementModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'wire' && currentUser && (
        <WireTransferModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'payment-methods' && currentUser && (
        <PaymentMethodsManager currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'pending' && currentUser && (
        <PendingTransfersModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'crypto-deposit' && currentUser && (
        <CryptoDepositModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'crypto-withdraw' && currentUser && (
        <CryptoWithdrawModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'staking' && currentUser && (
        <StakingManager currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}