import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Gift, Users, TrendingUp, DollarSign, Crown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const tiers = [
  { threshold: 0, rate: 0.01, name: "Bronze", color: "from-orange-700 to-orange-500" },
  { threshold: 500, rate: 0.02, name: "Silver", color: "from-gray-400 to-gray-300" },
  { threshold: 2000, rate: 0.03, name: "Gold", color: "from-yellow-500 to-yellow-400" },
  { threshold: 5000, rate: 0.04, name: "Platinum", color: "from-purple-500 to-pink-500" }
];

function rateForSpend(spend) {
  let r = 0.01;
  for (const t of tiers) if (spend >= t.threshold) r = t.rate;
  return r;
}

function getTierForSpend(spend) {
  let tier = tiers[0];
  for (const t of tiers) if (spend >= t.threshold) tier = t;
  return tier;
}

export default function Rewards() {
  const [currentUser, setCurrentUser] = useState(null);
  const [referralLink, setReferralLink] = useState("");

  useEffect(() => {
    base44.auth.me().then((user) => {
      setCurrentUser(user);
      setReferralLink(`https://playsofl.com/join?ref=${user.email}`);
    }).catch(() => {});
  }, []);

  // Demo data - in production this would come from the backend
  const demoReferees = [
    { email: "john@example.com", monthlySpend: 3200, joined: "2024-10-15" },
    { email: "sarah@example.com", monthlySpend: 1850, joined: "2024-11-01" },
    { email: "mike@example.com", monthlySpend: 650, joined: "2024-11-10" },
  ];

  const totalMonthlySpend = demoReferees.reduce((sum, r) => sum + r.monthlySpend, 0);
  const currentTier = getTierForSpend(totalMonthlySpend);
  const currentRate = currentTier.rate;
  const estimatedMonthlyReward = totalMonthlySpend * currentRate;

  const nextTier = tiers.find(t => t.threshold > totalMonthlySpend);
  const progressToNextTier = nextTier 
    ? ((totalMonthlySpend - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100
    : 100;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 via-pink-950 to-purple-950">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Gift className="w-10 h-10 text-pink-400" />
            Referral Rewards
          </h1>
          <p className="text-gray-300 text-lg">
            Earn 1%-4% of your referees' monthly spending when they use PlaySoFlo
          </p>
        </motion.div>

        {/* Current Tier Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <Card className={`bg-gradient-to-br ${currentTier.color} border-0 shadow-2xl`}>
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-2">
                <Crown className="w-8 h-8" />
                {currentTier.name} Tier - {(currentRate * 100).toFixed(0)}% Reward Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="text-white/80 text-sm mb-1">Active Referrals</div>
                  <div className="text-3xl font-bold text-white flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    {demoReferees.length}
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="text-white/80 text-sm mb-1">Monthly Referee Spend</div>
                  <div className="text-3xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-6 h-6" />
                    ${totalMonthlySpend.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="text-white/80 text-sm mb-1">Your Monthly Reward</div>
                  <div className="text-3xl font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-6 h-6" />
                    ${estimatedMonthlyReward.toFixed(2)}
                  </div>
                </div>
              </div>

              {nextTier && (
                <div className="mt-6">
                  <div className="flex justify-between text-white text-sm mb-2">
                    <span>Progress to {nextTier.name} ({(nextTier.rate * 100).toFixed(0)}% rate)</span>
                    <span>${totalMonthlySpend} / ${nextTier.threshold}</span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToNextTier}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Referral Link Card */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  alert("Link copied!");
                }}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-xl text-white font-semibold"
              >
                Copy Link
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-3">
              Share this link with friends. You earn rewards when they spend using their PlaySoFlo account!
            </p>
          </CardContent>
        </Card>

        {/* Reward Tiers */}
        <h2 className="text-2xl font-bold text-white mb-4">Reward Tiers</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {tiers.map((tier, idx) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={`bg-gradient-to-br ${tier.color} border-0 ${currentTier.name === tier.name ? 'ring-4 ring-white' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">{tier.name}</h3>
                      <p className="text-white/80">
                        {tier.threshold === 0 ? "Starting tier" : `$${tier.threshold}+ referee spend/month`}
                      </p>
                    </div>
                    <div className="text-4xl font-bold text-white">
                      {(tier.rate * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-white/80 text-sm">
                    Earn {(tier.rate * 100).toFixed(0)}% of all referee spending
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Your Referees */}
        <h2 className="text-2xl font-bold text-white mb-4">Your Referees</h2>
        <div className="space-y-3">
          {demoReferees.map((referee, idx) => {
            const tier = getTierForSpend(referee.monthlySpend);
            const rate = rateForSpend(referee.monthlySpend);
            const monthlyEarning = referee.monthlySpend * rate;

            return (
              <motion.div
                key={referee.email}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {referee.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{referee.email}</div>
                          <div className="text-gray-400 text-sm">
                            Joined {new Date(referee.joined).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold text-lg">
                          ${monthlyEarning.toFixed(2)}/mo
                        </div>
                        <div className="text-gray-400 text-sm">
                          ${referee.monthlySpend} spent • {(rate * 100).toFixed(0)}% rate
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* How It Works */}
        <Card className="bg-white/5 border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="text-white">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 space-y-2">
            <p>• Share your unique referral link with friends and family</p>
            <p>• They sign up and start using PlaySoFlo for purchases and services</p>
            <p>• You earn 1%-4% of their monthly spending, paid directly in SoFloCoin</p>
            <p>• The more your referees spend collectively, the higher your reward tier</p>
            <p>• Rewards are calculated monthly and deposited automatically</p>
            <p>• No limit on how many people you can refer!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}