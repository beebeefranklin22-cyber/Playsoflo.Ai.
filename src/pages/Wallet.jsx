import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Wallet as WalletIcon, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Send, Download, Eye, EyeOff, Sparkles, CreditCard,
  Bitcoin, DollarSign, PiggyBank, Zap, Building, ArrowDownUp,
  Plus, Crown, Building2
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import SendMoneyModal from "../components/wallet/SendMoneyModal";
import CryptoExchangeModal from "../components/wallet/CryptoExchangeModal";
import CardManagementModal from "../components/wallet/CardManagementModal";
import BankAccountModal from "../components/wallet/BankAccountModal";
import AddMoneyModal from "../components/wallet/AddMoneyModal";
import WithdrawModal from "../components/wallet/WithdrawModal";
import SubscriptionManagementModal from "../components/wallet/SubscriptionManagementModal";
import WireTransferModal from "../components/wallet/WireTransferModal";
import PaymentMethodsManager from "../components/wallet/PaymentMethodsManager";

export default function Wallet() {
  const [showBalance, setShowBalance] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Payment completed successfully!');
      navigate(createPageUrl("Wallet"), { replace: true });
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment cancelled');
      navigate(createPageUrl("Wallet"), { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("User not authenticated or error fetching user:", error);
        // Continue - guest users can still see the wallet UI
      }
    };
    fetchUser();
  }, []);

  const cryptoAssets = [
    { 
      name: "SoFloCoin", // Renamed from "Ronron Reserve Index"
      symbol: "SFC",     // Renamed from "RRI"
      balance: currentUser?.soflo_coins || 0, 
      value: ((currentUser?.soflo_coins || 0) * 2.45).toFixed(2),
      change: "+12.5%",
      color: "purple",
      icon: Sparkles
    },
    { 
      name: "Bitcoin", 
      symbol: "BTC", 
      balance: 0.0234, 
      value: "1,458.90",
      change: "+8.2%",
      color: "orange",
      icon: Bitcoin
    },
    { 
      name: "Ethereum", // New asset added
      symbol: "ETH",
      balance: 0.856,
      value: "1,672.30",
      change: "+5.4%",
      color: "blue",
      icon: Zap
    },
    { 
      name: "USD Balance", 
      symbol: "USD", 
      balance: 5420.50, 
      value: "5,420.50",
      change: "+0.1%",
      color: "green",
      icon: DollarSign
    },
  ];

  const recentTransactions = [
    { type: "received", name: "Exotic Car Experience", amount: "+250 RRI", time: "2 hours ago" },
    { type: "sent", name: "Yacht Charter", amount: "-1,200 RRI", time: "1 day ago" },
    { type: "received", name: "Referral Bonus", amount: "+100 RRI", time: "2 days ago" },
  ];

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
              {showBalance ? "$7,329.40" : "••••••"}
            </h2>
            <div className="flex items-center gap-2 text-green-400">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">+15.8%</span>
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
                  <p className="text-green-400 text-sm">{asset.change}</p>
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
          {recentTransactions.map((tx, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="glass-effect rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${
                  tx.type === "received" ? "bg-green-500/20" : "bg-red-500/20"
                } rounded-full flex items-center justify-center`}>
                  {tx.type === "received" ? (
                    <ArrowDownLeft className="w-5 h-5 text-green-400" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{tx.name}</p>
                  <p className="text-gray-400 text-sm">{tx.time}</p>
                </div>
              </div>
              <p className={`font-semibold ${
                tx.type === "received" ? "text-green-400" : "text-red-400"
              }`}>
                {tx.amount}
              </p>
            </motion.div>
          ))}
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
    </div>
  );
}