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
      {/* Header */}
      <div className="sticky top-16 z-30 bg-gradient-to-b from-gray-950 via-gray-950/95 to-transparent px-6 pt-6 pb-4 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Wallet</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your digital assets</p>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all hover:scale-105"
          >
            {showBalance ? <Eye className="w-5 h-5 text-white" /> : <EyeOff className="w-5 h-5 text-white" />}
          </button>
        </div>

        {/* Total Balance Card - Compact */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
          
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Balance</p>
              <h2 className="text-4xl font-bold text-white mb-2">
                {showBalance ? `$${((currentUser?.usd_balance || 0) + ((currentUser?.soflo_coins || 0) * 2.45)).toFixed(2)}` : "••••••"}
              </h2>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-semibold text-sm">+0.0%</span>
                <span className="text-gray-500 text-xs">this month</span>
              </div>
            </div>
            
            <div className="hidden md:flex flex-col gap-2">
              <div className="text-right">
                <p className="text-gray-400 text-xs">USD</p>
                <p className="text-white font-semibold">${(currentUser?.usd_balance || 0).toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs">Crypto</p>
                <p className="text-purple-400 font-semibold">${((currentUser?.soflo_coins || 0) * 2.45).toFixed(2)}</p>
              </div>
            </div>
          </div>

        </motion.div>

        {/* Quick Actions - Streamlined */}
        <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          <button 
            onClick={() => setActiveModal('add')}
            className="flex items-center gap-3 px-5 py-3 bg-green-500/10 border border-green-500/30 rounded-xl hover:bg-green-500/20 transition-all flex-shrink-0"
          >
            <Plus className="w-5 h-5 text-green-400" />
            <div className="text-left">
              <p className="text-white text-sm font-semibold">Add Money</p>
              <p className="text-green-400 text-xs">Deposit funds</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('send')}
            className="flex items-center gap-3 px-5 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-all flex-shrink-0"
          >
            <Send className="w-5 h-5 text-purple-400" />
            <div className="text-left">
              <p className="text-white text-sm font-semibold">Send</p>
              <p className="text-purple-400 text-xs">Transfer</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('withdraw')}
            className="flex items-center gap-3 px-5 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-all flex-shrink-0"
          >
            <Download className="w-5 h-5 text-blue-400" />
            <div className="text-left">
              <p className="text-white text-sm font-semibold">Withdraw</p>
              <p className="text-blue-400 text-xs">Cash out</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('exchange')}
            className="flex items-center gap-3 px-5 py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/20 transition-all flex-shrink-0"
          >
            <ArrowDownUp className="w-5 h-5 text-cyan-400" />
            <div className="text-left">
              <p className="text-white text-sm font-semibold">Exchange</p>
              <p className="text-cyan-400 text-xs">Swap crypto</p>
            </div>
          </button>
        </div>

        {/* More Options */}
        <details className="mt-3 group">
          <summary className="cursor-pointer text-gray-400 text-sm font-medium hover:text-white transition flex items-center gap-2 px-2">
            <span>More Options</span>
            <span className="group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <button 
              onClick={() => setActiveModal('payment-methods')}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition text-left"
            >
              <CreditCard className="w-4 h-4 text-orange-400" />
              <span className="text-white text-xs">Cards</span>
            </button>
            <button 
              onClick={() => setActiveModal('banks')}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition text-left"
            >
              <Building className="w-4 h-4 text-teal-400" />
              <span className="text-white text-xs">Banks</span>
            </button>
            <button 
              onClick={() => setActiveModal('pending')}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition text-left"
            >
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-xs">Pending</span>
            </button>
            <button 
              onClick={() => setActiveModal('wire')}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition text-left"
            >
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="text-white text-xs">Wire</span>
            </button>
          </div>
        </details>
      </div>

      {/* Crypto Wallet Section */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Crypto Assets</h3>
            <p className="text-gray-400 text-sm">Digital currencies & tokens</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveModal('crypto-deposit')}
              className="px-3 py-2 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 rounded-lg text-green-400 text-sm font-medium transition-all"
            >
              Deposit
            </button>
            <button
              onClick={() => setActiveModal('crypto-withdraw')}
              className="px-3 py-2 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 rounded-lg text-orange-400 text-sm font-medium transition-all"
            >
              Withdraw
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {cryptoAssets.filter(a => a.symbol !== 'USD').map((asset, index) => (
            <motion.div
              key={asset.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-effect rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-${asset.color}-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <asset.icon className={`w-5 h-5 text-${asset.color}-400`} />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">{asset.name}</h4>
                    <p className="text-gray-500 text-xs">{asset.symbol}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-md text-xs font-semibold ${
                  parseFloat(asset.change) >= 0 
                    ? 'bg-green-500/10 text-green-400' 
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {asset.change}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Balance</p>
                  <p className="text-white font-bold text-lg">
                    {showBalance ? `${asset.balance.toFixed(asset.balance < 1 ? 8 : 4)}` : "••••"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs mb-1">Value</p>
                  <p className="text-white font-bold text-lg">
                    {showBalance ? `$${asset.value}` : "••••"}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Crypto Quick Actions */}
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Crypto Staking</p>
                <p className="text-gray-400 text-xs">Earn passive income up to 12% APY</p>
              </div>
            </div>
            <button
              onClick={() => setActiveModal('staking')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-all hover:scale-105"
            >
              Stake Now
            </button>
          </div>
        </div>
      </div>

      {/* USD Balance Section */}
      <div className="px-6 mb-6">
        <h3 className="text-xl font-bold text-white mb-4">Fiat Balance</h3>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-effect rounded-xl p-4 border border-white/10 hover:border-green-500/30 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm">US Dollar</h4>
                <p className="text-gray-500 text-xs">USD</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-gray-400 text-xs mb-1">Balance</p>
              <p className="text-white font-bold text-lg">
                {showBalance ? `$${(currentUser?.usd_balance || 0).toFixed(2)}` : "••••"}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Utilities & Premium Banners */}
      <div className="px-6 space-y-4 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative glass-effect rounded-xl p-5 overflow-hidden border border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer group"
          onClick={() => navigate(createPageUrl("Utilities"))}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <PiggyBank className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-white font-bold text-lg">Utilities & Assets</h4>
                <p className="text-gray-400 text-sm">Manage bills, property, vehicles</p>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
        </motion.div>

      {/* Recent Activity */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Recent Activity</h3>
            <p className="text-gray-400 text-sm">Latest {transactions.length} transactions</p>
          </div>
        </div>
        <div className="space-y-2">
          {transactions.length > 0 ? transactions.slice(0, 10).map((tx, index) => {
            const isIncoming = tx.reference_type === 'deposit' || tx.reference_type === 'received';
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                className="glass-effect rounded-xl p-3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 ${
                      isIncoming ? "bg-green-500/10" : "bg-red-500/10"
                    } rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      {isIncoming ? (
                        <ArrowDownLeft className="w-4 h-4 text-green-400" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{tx.memo || tx.reference_type}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">
                          {new Date(tx.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className={`capitalize ${
                          tx.status === 'completed' ? 'text-green-400' : 
                          tx.status === 'pending' ? 'text-yellow-400' : 'text-gray-400'
                        }`}>{tx.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className={`font-bold text-sm ${
                      isIncoming ? "text-green-400" : "text-red-400"
                    }`}>
                      {isIncoming ? '+' : '-'}${tx.amount_usd?.toFixed(2) || '0.00'}
                    </p>
                    {tx.amount_rri > 0 && (
                      <p className="text-purple-400 text-xs">{tx.amount_rri} SFC</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          }) : (
            <div className="text-center py-16 glass-effect rounded-xl border border-white/5">
              <div className="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No transactions yet</h3>
              <p className="text-gray-400 text-sm">Start by adding funds or making a transfer</p>
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