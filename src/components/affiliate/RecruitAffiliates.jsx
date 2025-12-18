import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Copy, Share2, CheckCircle, Gift, TrendingUp, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function RecruitAffiliates({ currentUser, subAffiliates = [] }) {
  const [copied, setCopied] = useState(false);
  
  const recruitLink = `${window.location.origin}/affiliate-signup?ref=${currentUser?.referral_code}`;
  
  const copyRecruitLink = () => {
    navigator.clipboard.writeText(recruitLink);
    setCopied(true);
    toast.success('Recruitment link copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const shareRecruitLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join PlaySoFlo Affiliate Program',
          text: 'Earn 5-10% commission on every sale! Join me as an affiliate.',
          url: recruitLink
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      copyRecruitLink();
    }
  };

  const totalRecruitBonus = subAffiliates.reduce((sum, r) => sum + (r.recruitment_bonus || 0), 0);
  const activeRecruits = subAffiliates.filter(r => r.commission_amount > 0).length;

  return (
    <div className="space-y-6">
      {/* Program Overview */}
      <Card className="bg-gradient-to-br from-pink-500/20 to-purple-600/10 border-pink-500/30">
        <CardContent className="p-6">
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
            <Gift className="w-8 h-8 text-pink-400" />
            Recruit Affiliates & Earn More!
          </h3>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4">
              <Users className="w-6 h-6 text-pink-400 mb-2" />
              <p className="text-2xl font-bold text-white">{subAffiliates.length}</p>
              <p className="text-gray-400 text-sm">Total Recruits</p>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4">
              <TrendingUp className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-2xl font-bold text-white">{activeRecruits}</p>
              <p className="text-gray-400 text-sm">Active Recruits</p>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4">
              <DollarSign className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-2xl font-bold text-green-400">+${totalRecruitBonus.toFixed(2)}</p>
              <p className="text-gray-400 text-sm">Bonus Earned</p>
            </div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <p className="text-purple-300 text-sm">
              <strong>How it works:</strong> Recruit new affiliates using your link. Earn 2% of everything they make - forever! 
              Plus, they get special perks for joining under you.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recruitment Link */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            Your Affiliate Recruitment Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2">
              <Input
                value={recruitLink}
                readOnly
                className="bg-white/10 border-white/20 text-white font-mono text-sm"
              />
              <Button
                onClick={copyRecruitLink}
                className={copied ? 'bg-green-600' : 'bg-purple-600'}
              >
                {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Button onClick={shareRecruitLink} className="bg-blue-600 hover:bg-blue-700">
              <Share2 className="w-4 h-4 mr-2" />
              Share Recruit Link
            </Button>
            <Button onClick={copyRecruitLink} variant="outline" className="border-white/20">
              <Copy className="w-4 h-4 mr-2" />
              Copy Recruit Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Why Recruit?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-start gap-3 p-3 bg-green-500/10 rounded-xl"
            >
              <DollarSign className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <p className="text-white font-semibold">Passive Income</p>
                <p className="text-gray-400 text-sm">
                  Earn 2% of everything your recruits make - lifetime recurring income
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-start gap-3 p-3 bg-purple-500/10 rounded-xl"
            >
              <TrendingUp className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <p className="text-white font-semibold">Build Your Network</p>
                <p className="text-gray-400 text-sm">
                  Create a team of affiliates and grow your income exponentially
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-xl"
            >
              <Gift className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <p className="text-white font-semibold">Recruit Bonuses</p>
                <p className="text-gray-400 text-sm">
                  Get rewarded for building a strong affiliate network
                </p>
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Active Recruits */}
      {subAffiliates.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Your Recruited Affiliates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subAffiliates.map((recruit, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-white font-semibold">{recruit.referred_user_email}</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(recruit.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">
                      ${(recruit.commission_amount || 0).toFixed(2)}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Your bonus: ${(recruit.recruitment_bonus || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}