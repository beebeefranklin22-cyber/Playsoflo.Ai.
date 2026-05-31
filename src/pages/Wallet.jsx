import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Wallet as WalletIcon, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Send, Download, Eye, EyeOff, Sparkles, CreditCard,
  Bitcoin, DollarSign, PiggyBank, Zap, Building, ArrowDownUp,
  Plus, Crown, Building2, Clock, Shield, FileText, Droplet, Globe, Gift, Brain,
  HandCoins, Undo2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SendMoneyModal from "../components/wallet/SendMoneyModal";
import RequestMoneyModal from "../components/wallet/RequestMoneyModal";
import RequestRefundModal from "../components/wallet/RequestRefundModal";
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
import SendCryptoModal from "../components/wallet/SendCryptoModal";
import StakingManager from "../components/wallet/StakingManager";
import CryptoSecuritySettings from "../components/wallet/CryptoSecuritySettings";
import TaxReportingModal from "../components/wallet/TaxReportingModal";
import DeFiTracker from "../components/wallet/DeFiTracker";
import CurrencySelector from "../components/wallet/CurrencySelector";
import EnhancedCurrencySelector from "../components/wallet/EnhancedCurrencySelector";
import RewardsProgram from "../components/wallet/RewardsProgram";
import P2PTradingMarketplace from "../components/wallet/P2PTradingMarketplace";
import TransactionHistoryFilter from "../components/wallet/TransactionHistoryFilter";
import FinancialAnalytics from "../components/wallet/FinancialAnalytics";
import PhysicalCardRequest from "../components/wallet/PhysicalCardRequest";
import RecurringTransfersManager from "../components/wallet/RecurringTransfersManager";
import CurrencyConverter from "../components/wallet/CurrencyConverter";
import CDPCryptoWallet from "../components/wallet/CDPCryptoWallet";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

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
    refetchInterval: 5000,
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

  const { data: exchangeRates = {} } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getExchangeRates');
      return data.rates;
    },
    refetchInterval: 5 * 60 * 1000, // Update every 5 minutes
    staleTime: 3 * 60 * 1000,
  });

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const action = searchParams.get('action');
    
    if (paymentStatus === 'success') {
      if (action === 'add_card') {
        toast.success('✅ Payment method added successfully!');
      } else {
        // Check for pending deposits after successful payment
        const checkDeposits = async () => {
          try {
            const { data } = await base44.functions.invoke('checkPendingDeposits');
            if (data?.processed > 0) {
              toast.success(`✅ ${data.message}`);
              queryClient.invalidateQueries({ queryKey: ['currentUser'] });
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
            }
          } catch (error) {
            console.error('Failed to check pending deposits:', error);
          }
        };
        checkDeposits();
      }
      // Clean URL without page reload
      window.history.replaceState({}, '', createPageUrl("Wallet"));
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment setup cancelled');
      window.history.replaceState({}, '', createPageUrl("Wallet"));
    }
  }, [searchParams, queryClient]);

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
      const [sent, received] = await Promise.all([
        base44.entities.Payment.filter({ sender_email: currentUser.email }),
        base44.entities.Payment.filter({ recipient_email: currentUser.email }),
      ]);
      // Merge + deduplicate by id
      const all = [...sent];
      received.forEach(r => { if (!all.find(p => p.id === r.id)) all.push(r); });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 30);
    },
    enabled: !!currentUser,
    refetchInterval: 5000,
  });

  // AI-powered transaction categorization
  const { data: categorizedTransactions } = useQuery({
    queryKey: ['categorized-transactions', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      try {
        const { data } = await base44.functions.invoke('categorizeCryptoTransactions', {
          time_period: '50'
        });
        return data.data;
      } catch (error) {
        console.error('Categorization failed:', error);
        return null;
      }
    },
    enabled: !!currentUser && transactions.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const getCategoryForTransaction = (txId) => {
    if (!categorizedTransactions?.categorized_transactions) return null;
    return categorizedTransactions.categorized_transactions.find(ct => ct.transaction_id === txId);
  };

  return (
    <div className="min-h-screen pb-24 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-gray-950/98 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Wallet</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">Manage your digital assets</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal('currency-settings')}
              className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all hover:scale-105"
              title="Currency Settings"
            >
              <Globe className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all hover:scale-105"
            >
              {showBalance ? <Eye className="w-5 h-5 text-white" /> : <EyeOff className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>

        {/* Total Balance Card - Compact */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative glass-effect rounded-xl p-4 sm:p-6 border border-white/10"
        >
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-purple-500/10 rounded-full blur-2xl" />
          
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Total Balance</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {showBalance ? formatCurrency((currentUser?.usd_balance || 0) + ((currentUser?.soflo_coins || 0) * 2.45)) : "••••••"}
              </h2>
              {currentUser?.show_dual_currency && currentUser?.primary_currency !== 'USD' && showBalance && (
                <p className="text-gray-400 text-sm">
                  ≈ ${((currentUser?.usd_balance || 0) + ((currentUser?.soflo_coins || 0) * 2.45)).toFixed(2)} USD
                </p>
              )}
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-semibold text-sm">+0.0%</span>
                <span className="text-gray-500 text-xs">this month</span>
              </div>
            </div>
            
            <div className="hidden md:flex flex-col gap-2">
              <div className="text-right">
                <p className="text-gray-400 text-xs">USD Balance</p>
                <p className="text-white font-semibold">{formatCurrency(currentUser?.usd_balance || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs">Crypto Value</p>
                <p className="text-purple-400 font-semibold">{formatCurrency((currentUser?.soflo_coins || 0) * 2.45)}</p>
              </div>
            </div>
          </div>

        </motion.div>

        {/* Quick Actions - Streamlined */}
        <div className="mt-3 flex flex-wrap gap-2 pb-2 -mx-1 px-1">
          <button 
            onClick={() => setActiveModal('add')}
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-green-500/10 border border-green-500/30 rounded-xl hover:bg-green-500/20 transition-all flex-shrink-0"
          >
            <Plus className="w-4 sm:w-5 h-4 sm:h-5 text-green-400" />
            <div className="text-left">
              <p className="text-white text-xs sm:text-sm font-semibold">Add Money</p>
              <p className="text-green-400 text-[10px] sm:text-xs hidden sm:block">Deposit funds</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('send')}
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-all flex-shrink-0"
          >
            <Send className="w-4 sm:w-5 h-4 sm:h-5 text-purple-400" />
            <div className="text-left">
              <p className="text-white text-xs sm:text-sm font-semibold">Send</p>
              <p className="text-purple-400 text-[10px] sm:text-xs hidden sm:block">Transfer</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('request')}
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all flex-shrink-0"
          >
            <HandCoins className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-400" />
            <div className="text-left">
              <p className="text-white text-xs sm:text-sm font-semibold">Request</p>
              <p className="text-emerald-400 text-[10px] sm:text-xs hidden sm:block">Ask for money</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('refund')}
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all flex-shrink-0"
          >
            <Undo2 className="w-4 sm:w-5 h-4 sm:h-5 text-amber-400" />
            <div className="text-left">
              <p className="text-white text-xs sm:text-sm font-semibold">Refund</p>
              <p className="text-amber-400 text-[10px] sm:text-xs hidden sm:block">Request back</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('withdraw')}
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-all flex-shrink-0"
          >
            <Download className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400" />
            <div className="text-left">
              <p className="text-white text-xs sm:text-sm font-semibold">Withdraw</p>
              <p className="text-blue-400 text-[10px] sm:text-xs hidden sm:block">Cash out</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('exchange')}
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/20 transition-all flex-shrink-0"
          >
            <ArrowDownUp className="w-4 sm:w-5 h-4 sm:h-5 text-cyan-400" />
            <div className="text-left">
              <p className="text-white text-xs sm:text-sm font-semibold">Exchange</p>
              <p className="text-cyan-400 text-[10px] sm:text-xs hidden sm:block">Swap crypto</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('currency-converter')}
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/20 transition-all flex-shrink-0"
          >
            <Globe className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-400" />
            <div className="text-left">
              <p className="text-white text-xs sm:text-sm font-semibold">Convert</p>
              <p className="text-indigo-400 text-[10px] sm:text-xs hidden sm:block">Fiat converter</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('recurring')}
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl hover:bg-orange-500/20 transition-all flex-shrink-0"
          >
            <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-orange-400" />
            <div className="text-left">
              <p className="text-white text-xs sm:text-sm font-semibold">Recurring</p>
              <p className="text-orange-400 text-[10px] sm:text-xs hidden sm:block">Auto transfers</p>
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
            <button 
              onClick={() => setActiveModal('crypto-security')}
              className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition text-left"
            >
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-white text-xs font-semibold">Security</span>
            </button>
            <button 
              onClick={() => setActiveModal('rewards')}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg hover:from-purple-500/20 hover:to-pink-500/20 transition text-left"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-white text-xs font-semibold">Rewards</span>
            </button>
            <button 
              onClick={() => setActiveModal('rewards')}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg hover:from-purple-500/20 hover:to-pink-500/20 transition text-left"
            >
              <Gift className="w-4 h-4 text-purple-400" />
              <span className="text-white text-xs font-semibold">Rewards</span>
            </button>
            <button 
              onClick={() => setActiveModal('p2p-trading')}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg hover:from-green-500/20 hover:to-emerald-500/20 transition text-left"
            >
              <ArrowDownUp className="w-4 h-4 text-green-400" />
              <span className="text-white text-xs font-semibold">P2P Trade</span>
            </button>
            <button 
              onClick={() => setActiveModal('analytics')}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg hover:from-purple-500/20 hover:to-blue-500/20 transition text-left"
            >
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-white text-xs font-semibold">AI Analytics</span>
            </button>
          </div>
        </details>
      </div>

      {/* On-chain USDC Wallet (Coinbase) */}
      <div className="px-4 sm:px-6 mb-6">
        <CDPCryptoWallet />
      </div>

      {/* Crypto Wallet Section */}
      <div className="px-4 sm:px-6 mb-6">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Crypto Assets</h3>
            <p className="text-gray-400 text-xs sm:text-sm hidden sm:block">Digital currencies & tokens</p>
          </div>
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setActiveModal('crypto-deposit')}
              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 rounded-lg text-green-400 text-xs sm:text-sm font-medium transition-all"
            >
              Deposit
            </button>
            <button
                onClick={() => setActiveModal('crypto-withdraw')}
                className="px-2 sm:px-3 py-1.5 sm:py-2 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 rounded-lg text-orange-400 text-xs sm:text-sm font-medium transition-all"
              >
                Withdraw
              </button>
            <button
                onClick={() => setActiveModal('send-crypto')}
                className="px-2 sm:px-3 py-1.5 sm:py-2 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 rounded-lg text-purple-400 text-xs sm:text-sm font-medium transition-all flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                Send
              </button>
            <button
              onClick={() => setActiveModal('physical-card')}
              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 rounded-lg text-purple-400 text-xs sm:text-sm font-medium transition-all"
            >
              <CreditCard className="w-4 h-4 inline mr-1" />
              Get Card
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
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Crypto Staking</p>
                  <p className="text-gray-400 text-xs">Up to 12% APY</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('staking')}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-xs font-medium transition-all hover:scale-105"
              >
                Stake
              </button>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                  <Droplet className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">DeFi Portfolio</p>
                  <p className="text-gray-400 text-xs">Track liquidity pools, farms & lending</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('defi-tracker')}
                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 rounded-lg text-white text-xs font-medium transition-all hover:scale-105"
              >
                Track DeFi
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Tax Reporting Section */}
        <div className="px-4 sm:px-6 mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Tax Reporting (Optional)
        </h3>

        {/* Legal Disclaimer */}
        <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-semibold text-sm mb-2">⚠️ LEGAL DISCLAIMER</p>
              <p className="text-red-200 text-xs leading-relaxed">
                <strong>IMPORTANT:</strong> Tax reporting is provided as a convenience tool only. You are solely responsible for the accuracy of all tax information submitted to authorities. 
                Submitting false or misleading tax information is against the law and may result in penalties. 
                <strong className="block mt-2">PlaysoFlo and its affiliates are NOT tax advisors and are NOT legally liable for any errors, omissions, or false returns you may submit using these features.</strong>
                <strong className="block mt-1">Always consult with a qualified tax professional before filing.</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl hover:border-green-500/40 transition-all cursor-pointer group"
            onClick={() => setActiveModal('tax-reports')}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h4 className="text-white font-bold text-lg">Generate Tax Report</h4>
                <p className="text-gray-400 text-xs">AI-powered categorization</p>
              </div>
            </div>
            <ul className="space-y-1 text-sm text-gray-300 mb-3">
              <li>• Capital gains & losses</li>
              <li>• IRS Form 8949 & Schedule D ready</li>
              <li>• Export to CSV/PDF formats</li>
            </ul>
            <div className="flex items-center justify-between">
              <Badge className="bg-green-500/20 text-green-400">Optional Feature</Badge>
              <span className="text-green-400 text-sm font-medium group-hover:underline">Get Started →</span>
            </div>
          </motion.div>

          <div className="p-5 bg-white/5 border border-white/10 rounded-xl">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              What's Included
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>Automatic transaction analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>AI transaction categorization</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>Cost basis calculations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>Multiple format exports</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 flex-shrink-0">!</span>
                <span className="text-yellow-300">Not tax advice - consult CPA</span>
              </li>
            </ul>
          </div>
        </div>
        </div>

        {/* DeFi Portfolio Section */}
        <div className="px-4 sm:px-6 mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Droplet className="w-5 h-5" />
          DeFi Portfolio Tracking
        </h3>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
            <p className="text-gray-400 text-xs mb-1">Liquidity Pools</p>
            <p className="text-white text-xl font-bold">Track & Monitor</p>
            <p className="text-purple-300 text-xs mt-1">Uniswap, Curve & more</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-gray-400 text-xs mb-1">Yield Farming</p>
            <p className="text-white text-xl font-bold">APY Alerts</p>
            <p className="text-blue-300 text-xs mt-1">Real-time monitoring</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
            <p className="text-gray-400 text-xs mb-1">Lending Protocols</p>
            <p className="text-white text-xl font-bold">Aave, Compound</p>
            <p className="text-green-300 text-xs mt-1">Track earnings</p>
          </div>
        </div>

        <button
          onClick={() => setActiveModal('defi-tracker')}
          className="w-full p-5 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-2 border-pink-500/30 rounded-xl hover:border-pink-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Droplet className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h4 className="text-white font-bold text-lg mb-1">Open DeFi Dashboard</h4>
                <p className="text-gray-400 text-sm">View all your DeFi positions, rewards & impermanent loss</p>
              </div>
            </div>
            <div className="text-pink-400 font-semibold group-hover:translate-x-1 transition-transform">
              View Dashboard →
            </div>
          </div>
        </button>
        </div>

      {/* USD Balance Section */}
      <div className="px-4 sm:px-6 mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Fiat Balance</h3>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-effect rounded-xl p-4 border border-white/10 hover:border-green-500/30 transition-all group"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm">US Dollar</h4>
                <p className="text-gray-500 text-xs">USD</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-gray-400 text-xs mb-1">Balance</p>
                <p className="text-white font-bold text-lg">
                  {showBalance ? `$${(currentUser?.usd_balance || 0).toFixed(2)}` : "••••"}
                </p>
              </div>
              <button
                onClick={() => setActiveModal('withdraw')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-semibold transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                Withdraw
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Utilities & Premium Banners */}
      <div className="px-4 sm:px-6 space-y-3 mb-6">
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

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative glass-effect rounded-xl p-5 overflow-hidden border border-purple-500/20 hover:border-purple-500/40 transition-all"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                <Crown className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-purple-400 font-bold text-xs uppercase tracking-wide">Elite</span>
                </div>
                <h4 className="text-white font-bold text-lg">Upgrade Account</h4>
                <p className="text-gray-400 text-sm">Private banking & higher limits</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveModal('subscription')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white text-sm font-medium transition-all hover:scale-105"
            >
              Learn More
            </button>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="px-4 sm:px-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Recent Activity</h3>
            <p className="text-gray-400 text-xs sm:text-sm">Latest {transactions.length} transactions • AI categorized</p>
          </div>
          <button
            onClick={() => setActiveModal('transaction-filter')}
            className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20 transition flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Filter & Export
          </button>
        </div>

        {/* Spending Summary */}
        {categorizedTransactions?.spending_summary && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-400 text-xs">Top Spending Category</p>
                <p className="text-white font-bold text-lg">{categorizedTransactions.spending_summary.top_category}</p>
              </div>
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categorizedTransactions.spending_summary.category_breakdown?.slice(0, 3).map((cat, i) => (
                <div key={i} className="px-2 py-1 bg-white/10 rounded-lg text-xs">
                  <span className="text-white font-medium">{cat.category}</span>
                  <span className="text-gray-400 ml-1">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="space-y-2">
          {transactions.length > 0 ? transactions.slice(0, 10).map((tx, index) => {
            const isIncoming = tx.reference_type === 'deposit' || tx.reference_type === 'received';
            const category = getCategoryForTransaction(tx.id);
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
                      {category?.emoji ? (
                        <span className="text-lg">{category.emoji}</span>
                      ) : isIncoming ? (
                        <ArrowDownLeft className="w-4 h-4 text-green-400" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium text-sm truncate">{tx.memo || tx.reference_type}</p>
                        {category && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            category.color === 'green' ? 'bg-green-500/20 text-green-400' :
                            category.color === 'red' ? 'bg-red-500/20 text-red-400' :
                            category.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                            category.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {category.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">
                          {new Date(tx.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {category?.subcategory && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-500">{category.subcategory}</span>
                          </>
                        )}
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

      {/* Info Sections */}
      <div className="px-4 sm:px-6 space-y-3 mb-8">
        <details className="glass-effect rounded-xl p-4 border border-white/5 group">
          <summary className="cursor-pointer text-white font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              About SoFloCoin
            </span>
            <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-gray-400 text-sm mb-2">Ronron Reserve Index Backed</p>
            <div className="space-y-1 text-sm text-gray-300">
              <div className="flex justify-between"><span>• USD (T-bills)</span><span className="text-gray-400">40%</span></div>
              <div className="flex justify-between"><span>• Tokenized gold</span><span className="text-gray-400">25%</span></div>
              <div className="flex justify-between"><span>• Bitcoin</span><span className="text-gray-400">15%</span></div>
              <div className="flex justify-between"><span>• Ethereum</span><span className="text-gray-400">10%</span></div>
              <div className="flex justify-between"><span>• Foreign currencies</span><span className="text-gray-400">10%</span></div>
            </div>
          </div>
        </details>

        <div className="glass-effect rounded-xl p-4 border border-green-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <PiggyBank className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-1">Bank-Grade Security</h4>
              <p className="text-gray-400 text-xs">Military-grade encryption, 2FA, and 24/7 fraud monitoring protect your assets.</p>
            </div>
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
      {activeModal === 'request' && currentUser && (
        <RequestMoneyModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'refund' && currentUser && (
        <RequestRefundModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
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
      {activeModal === 'crypto-security' && currentUser && (
        <CryptoSecuritySettings currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'tax-reports' && currentUser && (
        <TaxReportingModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'defi-tracker' && currentUser && (
        <DeFiTracker currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'currency-settings' && currentUser && (
        <EnhancedCurrencySelector currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'rewards' && currentUser && (
        <RewardsProgram currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'p2p-trading' && currentUser && (
        <P2PTradingMarketplace currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'transaction-filter' && currentUser && (
        <TransactionHistoryFilter transactions={transactions} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'analytics' && currentUser && (
        <FinancialAnalytics currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'physical-card' && currentUser && (
        <PhysicalCardRequest currentUser={currentUser} isOpen={true} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'recurring' && currentUser && (
        <RecurringTransfersManager currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'send-crypto' && currentUser && (
        <SendCryptoModal currentUser={currentUser} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'currency-converter' && (
        <CurrencyConverter
          exchangeRates={exchangeRates}
          usdBalance={currentUser?.usd_balance || 0}
          onClose={() => setActiveModal(null)}
        />
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        details summary::-webkit-details-marker {
          display: none;
        }
        @media (max-width: 640px) {
          body {
            overflow-x: hidden;
          }
        }
      `}</style>
    </div>
  );
}