import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Users, Copy, Check, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AffiliateHub() {
  const [currentUser, setCurrentUser] = useState(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: referrals = [] } = useQuery({
    queryKey: ['affiliate-referrals', currentUser?.email],
    queryFn: () => base44.entities.AffiliateReferral.filter({ created_by: currentUser.email }),
    enabled: !!currentUser
  });

  const totalEarnings = referrals
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + (r.commission_amount || 0), 0);

  const pendingEarnings = referrals
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.commission_amount || 0), 0);

  const referralCode = currentUser?.email ? btoa(currentUser.email).slice(0, 8).toUpperCase() : '';
  const shopifyLink = `https://www.shopify.com/?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shopifyLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const trackReferral = async (email) => {
    if (!email || !currentUser) return;
    
    try {
      await base44.entities.AffiliateReferral.create({
        affiliate_program: 'shopify',
        referral_code: referralCode,
        referred_user_email: email,
        status: 'pending'
      });
      toast.success('Referral tracked!');
    } catch (error) {
      toast.error('Failed to track referral');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-900 to-blue-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">💰 Affiliate Hub</h1>
          <p className="text-gray-300">Earn commissions by referring Shopify to your network</p>
        </motion.div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-white font-semibold">Total Earnings</h3>
            </div>
            <p className="text-3xl font-bold text-white">${totalEarnings.toFixed(2)}</p>
            <p className="text-green-400 text-sm mt-1">Paid to your Stripe account</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-500/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-white font-semibold">Pending</h3>
            </div>
            <p className="text-3xl font-bold text-white">${pendingEarnings.toFixed(2)}</p>
            <p className="text-yellow-400 text-sm mt-1">Processing</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold">Referrals</h3>
            </div>
            <p className="text-3xl font-bold text-white">{referrals.length}</p>
            <p className="text-blue-400 text-sm mt-1">Total signups</p>
          </motion.div>
        </div>

        {/* Shopify Referral Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-8 mb-8"
        >
          <div className="flex items-start gap-4 mb-6">
            <img 
              src="https://cdn.shopify.com/shopifycloud/brochure/assets/brand-assets/shopify-logo-primary-logo-456baa801ee66a0a435671082365958316831c9960c480451dd0330bcdae304f.svg"
              alt="Shopify"
              className="w-32 h-auto"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">Shopify Affiliate Program</h2>
              <p className="text-gray-300 mb-4">
                Earn up to $150 per referral when someone starts a Shopify store through your link
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                  $58-150 per sale
                </span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                  30-day cookie
                </span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                  Global program
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <label className="text-white text-sm font-semibold mb-2 block">Your Referral Link</label>
            <div className="flex gap-2">
              <Input
                value={shopifyLink}
                readOnly
                className="flex-1 bg-white/10 border-white/20 text-white"
              />
              <Button
                onClick={copyLink}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => window.open(shopifyLink, '_blank')}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Try Shopify Free
            </Button>
            <Button
              onClick={() => window.open('https://www.shopify.com/partners', '_blank')}
              variant="outline"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
            >
              Join Partner Program
            </Button>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 rounded-2xl p-8 mb-8"
        >
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            How It Works
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <h4 className="text-white font-semibold mb-2">Share Your Link</h4>
              <p className="text-gray-400 text-sm">Copy and share your unique Shopify referral link</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">2</span>
              </div>
              <h4 className="text-white font-semibold mb-2">User Signs Up</h4>
              <p className="text-gray-400 text-sm">They create a Shopify store through your link</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <h4 className="text-white font-semibold mb-2">Earn Commission</h4>
              <p className="text-gray-400 text-sm">Get paid when they subscribe to a plan</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">4</span>
              </div>
              <h4 className="text-white font-semibold mb-2">Stripe Payout</h4>
              <p className="text-gray-400 text-sm">Earnings paid directly to your Stripe account</p>
            </div>
          </div>
        </motion.div>

        {/* Referrals List */}
        {referrals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold text-white mb-4">Your Referrals</h3>
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-medium">{referral.referred_user_email || 'Anonymous'}</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(referral.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">${referral.commission_amount?.toFixed(2) || '0.00'}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      referral.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      referral.status === 'completed' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {referral.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}