import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Shield, DollarSign, ArrowRightLeft, Gift, Lock, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function HelpModal({ topic, onClose }) {
  const helpContent = {
    escrow: {
      icon: Shield,
      title: "What is Escrow Protection?",
      description: "Escrow is a secure payment system that protects both buyers and sellers in P2P trades.",
      sections: [
        {
          title: "How it works",
          points: [
            "Seller locks crypto in escrow when order is matched",
            "Buyer sends payment via selected method",
            "Seller confirms payment receipt",
            "Crypto is automatically released to buyer",
            "Platform takes a small 0.5% fee"
          ]
        },
        {
          title: "Why it's safe",
          points: [
            "Crypto cannot be accessed until payment confirmed",
            "Disputes are reviewed by platform moderators",
            "Both parties must complete their obligations",
            "Automatic refunds if conditions not met"
          ]
        }
      ]
    },
    p2p_trading: {
      icon: ArrowRightLeft,
      title: "Peer-to-Peer Trading",
      description: "Trade crypto directly with other users at your own prices with full escrow protection.",
      sections: [
        {
          title: "Creating Orders",
          points: [
            "Set your own price per crypto unit",
            "Choose accepted payment methods",
            "Define minimum and maximum limits",
            "Set time limits for payment completion"
          ]
        },
        {
          title: "Trading Process",
          points: [
            "Create sell/buy order with your terms",
            "Wait for another user to match your order",
            "Complete the transaction via escrow",
            "Rate your trading partner after completion"
          ]
        },
        {
          title: "Building Reputation",
          points: [
            "Complete trades successfully to build rating",
            "Higher ratings attract more traders",
            "Reviews help establish trustworthiness",
            "Track your trading statistics"
          ]
        }
      ]
    },
    rewards: {
      icon: Gift,
      title: "Crypto Rewards Program",
      description: "Earn free crypto for your activity on the platform. The more you engage, the more you earn.",
      sections: [
        {
          title: "Ways to Earn",
          points: [
            "Referrals: 10 SFC per successful referral",
            "DeFi Activity: Up to 5% bonus on positions",
            "HODLing: 0.1% weekly for holding assets",
            "Trading Volume: 0.05% cashback on trades",
            "P2P Trading: 1 SFC per completed trade"
          ]
        },
        {
          title: "Claiming Rewards",
          points: [
            "Rewards appear in your Rewards dashboard",
            "Claim anytime - no minimum threshold",
            "Rewards expire after 30 days if not claimed",
            "Instantly added to your wallet when claimed"
          ]
        }
      ]
    },
    staking: {
      icon: Lock,
      title: "Crypto Staking",
      description: "Lock your crypto for a period and earn passive income through staking rewards.",
      sections: [
        {
          title: "How Staking Works",
          points: [
            "Choose cryptocurrency and lock period (7-90 days)",
            "Earn APY (4.5%-12% depending on crypto and period)",
            "Rewards calculated and distributed automatically",
            "Cannot unstake before lock period ends",
            "Receive principal + rewards when unlocking"
          ]
        },
        {
          title: "Available Options",
          points: [
            "ETH: 4.5% APY • Min 7 days",
            "SOL: 7.2% APY • Min 14 days",
            "SoFloCoin: 12% APY • Min 30 days",
            "BTC: 3.5% APY • Min 30 days"
          ]
        }
      ]
    },
    defi: {
      icon: DollarSign,
      title: "DeFi Portfolio Tracking",
      description: "Track your decentralized finance positions including liquidity pools, yield farms, and lending protocols.",
      sections: [
        {
          title: "What We Track",
          points: [
            "Liquidity pools (Uniswap, Curve, PancakeSwap)",
            "Yield farming positions and rewards",
            "Lending protocols (Aave, Compound)",
            "Real-time APY monitoring and alerts",
            "Impermanent loss calculations"
          ]
        },
        {
          title: "Benefits",
          points: [
            "All positions in one dashboard",
            "Automatic APY change alerts",
            "Historical performance tracking",
            "Earnings summaries and projections"
          ]
        }
      ]
    },
    verification: {
      icon: Shield,
      title: "Provider Verification",
      description: "Verified providers get more bookings, higher trust scores, and access to premium features.",
      sections: [
        {
          title: "Verification Benefits",
          points: [
            "Verified badge on all listings",
            "Higher search ranking",
            "Instant booking eligibility",
            "Higher daily transaction limits",
            "Access to premium tools"
          ]
        },
        {
          title: "What You Need",
          points: [
            "Government-issued photo ID",
            "Proof of ownership (vehicle/property)",
            "Insurance documentation",
            "Business license (if applicable)"
          ]
        }
      ]
    }
  };

  const content = helpContent[topic];
  if (!content) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <content.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{content.title}</h2>
                <p className="text-purple-100 text-sm">{content.description}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {content.sections.map((section, idx) => (
            <Card key={idx} className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-white font-bold text-lg mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.points.map((point, pointIdx) => (
                    <li key={pointIdx} className="flex items-start gap-3 text-gray-300 text-sm">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          <Button onClick={onClose} className="w-full bg-purple-600 hover:bg-purple-700">
            Got it!
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}