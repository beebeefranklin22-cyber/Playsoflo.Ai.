import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Share2, Copy, DollarSign, Users, TrendingUp, 
  ExternalLink, CheckCircle, Gift, Sparkles, Link2
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AffiliateProgram() {
  const [currentUser, setCurrentUser] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // Generate referral code if doesn't exist
      if (!user.referral_code) {
        const code = `PSF${Date.now().toString(36).toUpperCase()}`;
        await base44.auth.updateMe({ referral_code: code });
        const updated = await base44.auth.me();
        setCurrentUser(updated);
        setReferralCode(code);
      } else {
        setReferralCode(user.referral_code);
      }
    };
    loadUser();
  }, []);

  const { data: referrals = [] } = useQuery({
    queryKey: ['my-referrals', currentUser?.email],
    queryFn: () => base44.entities.AffiliateReferral.filter({ 
      referral_code: currentUser.referral_code 
    }),
    enabled: !!currentUser?.referral_code
  });

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareLink = async () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join PlaySoFlo!',
          text: `Join me on PlaySoFlo - Lifestyle, entertainment & more! Use my link to get started.`,
          url: link
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      copyReferralLink();
    }
  };

  const totalEarnings = currentUser?.total_referral_earnings || 0;
  const pendingEarnings = referrals
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.commission_amount || 0), 0);
  const paidEarnings = referrals
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + (r.commission_amount || 0), 0);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-3">
            <Gift className="w-10 h-10 text-purple-400" />
            Affiliate Program
          </h1>
          <p className="text-gray-300 text-lg">Earn 5% commission on every referral sale</p>
        </motion.div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-6">
              <DollarSign className="w-8 h-8 text-green-400 mb-2" />
              <p className="text-3xl font-bold text-white">${totalEarnings.toFixed(2)}</p>
              <p className="text-gray-400 text-sm">Total Earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-6">
              <Users className="w-8 h-8 text-blue-400 mb-2" />
              <p className="text-3xl font-bold text-white">{referrals.length}</p>
              <p className="text-gray-400 text-sm">Total Referrals</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-6">
              <TrendingUp className="w-8 h-8 text-purple-400 mb-2" />
              <p className="text-3xl font-bold text-white">${pendingEarnings.toFixed(2)}</p>
              <p className="text-gray-400 text-sm">Pending Payout</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link */}
        <Card className="bg-white/5 border-white/10 mb-8">
          <CardContent className="p-6">
            <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
              <Link2 className="w-6 h-6 text-purple-400" />
              Your Unique Referral Link
            </h3>
            
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}?ref=${referralCode}`}
                  readOnly
                  className="bg-white/10 border-white/20 text-white font-mono"
                />
                <Button
                  onClick={copyReferralLink}
                  className={copiedCode ? 'bg-green-600' : 'bg-purple-600'}
                >
                  {copiedCode ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <Button onClick={shareLink} className="bg-blue-600 hover:bg-blue-700">
                <Share2 className="w-4 h-4 mr-2" />
                Share Link
              </Button>
              <Button onClick={copyReferralLink} variant="outline" className="border-white/20">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mt-4">
              <p className="text-purple-300 text-sm">
                <strong>How it works:</strong> Share your unique link. When someone makes a purchase using your link, you earn 5% commission instantly credited to your wallet!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <h3 className="text-white font-bold text-xl mb-4">Referral History</h3>
            
            {referrals.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No referrals yet. Start sharing your link!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                      <p className="text-white font-semibold">{ref.referred_user_email}</p>
                      <p className="text-gray-400 text-sm">
                        {new Date(ref.conversion_date || ref.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">+${ref.commission_amount?.toFixed(2) || '0.00'}</p>
                      <p className={`text-xs ${
                        ref.status === 'paid' ? 'text-green-400' :
                        ref.status === 'completed' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {ref.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}