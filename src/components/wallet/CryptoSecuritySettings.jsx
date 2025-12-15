import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Shield, Lock, Mail, TrendingUp, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function CryptoSecuritySettings({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [crypto2faEnabled, setCrypto2faEnabled] = useState(currentUser?.crypto_2fa_enabled || false);
  const [withdrawalConfirmation, setWithdrawalConfirmation] = useState(currentUser?.withdrawal_confirmations_required !== false);
  const [dailyWithdrawalLimit, setDailyWithdrawalLimit] = useState(currentUser?.daily_crypto_withdrawal_limit || 10000);
  const [dailyStakingLimit, setDailyStakingLimit] = useState(currentUser?.daily_crypto_staking_limit || 50000);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        crypto_2fa_enabled: crypto2faEnabled,
        withdrawal_confirmations_required: withdrawalConfirmation,
        daily_crypto_withdrawal_limit: parseFloat(dailyWithdrawalLimit),
        daily_crypto_staking_limit: parseFloat(dailyStakingLimit)
      });

      queryClient.invalidateQueries(['currentUser']);
      toast.success("Security settings updated successfully");
      onClose();
    } catch (err) {
      console.error("Failed to update settings:", err);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  Crypto Security Settings
                </h2>
                <p className="text-blue-100 text-sm mt-1">Protect your digital assets</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 2FA Toggle */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Two-Factor Authentication</h3>
                    <p className="text-gray-400 text-sm">
                      Require 2FA code for all crypto transactions (withdrawals, exchanges, staking)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCrypto2faEnabled(!crypto2faEnabled)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    crypto2faEnabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    crypto2faEnabled ? 'translate-x-8' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {crypto2faEnabled && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-3">
                  <p className="text-green-300 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    2FA is enabled. You'll need to enter your authenticator code for crypto transactions.
                  </p>
                </div>
              )}
            </div>

            {/* Email Confirmation */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Email Confirmation</h3>
                    <p className="text-gray-400 text-sm">
                      Require email confirmation link for all crypto withdrawals
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWithdrawalConfirmation(!withdrawalConfirmation)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    withdrawalConfirmation ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    withdrawalConfirmation ? 'translate-x-8' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {withdrawalConfirmation && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-3">
                  <p className="text-blue-300 text-xs">
                    You'll receive an email with a confirmation link before any withdrawal is processed.
                  </p>
                </div>
              )}
            </div>

            {/* Spending Limits */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Daily Spending Limits</h3>
                  <p className="text-gray-400 text-sm">
                    Set maximum amounts for daily crypto operations (in USD equivalent)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Daily Withdrawal Limit
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={dailyWithdrawalLimit}
                      onChange={(e) => setDailyWithdrawalLimit(e.target.value)}
                      className="bg-white/10 border-white/20 text-white pl-8"
                      min="100"
                      step="100"
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Current usage: ${currentUser?.daily_withdrawal_used || 0} / ${dailyWithdrawalLimit}
                  </p>
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Daily Staking Limit
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={dailyStakingLimit}
                      onChange={(e) => setDailyStakingLimit(e.target.value)}
                      className="bg-white/10 border-white/20 text-white pl-8"
                      min="100"
                      step="100"
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Current usage: ${currentUser?.daily_staking_used || 0} / ${dailyStakingLimit}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
                <p className="text-yellow-300 text-xs">
                  ⚠️ Limits reset daily at midnight UTC. These help protect against unauthorized access.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-6 text-lg"
            >
              {saving ? "Saving..." : "Save Security Settings"}
            </Button>

            {/* Security Tips */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-white font-semibold text-sm mb-2">🛡️ Security Best Practices</h4>
              <ul className="text-gray-400 text-xs space-y-1">
                <li>• Always enable 2FA for maximum protection</li>
                <li>• Keep your email secure and up-to-date</li>
                <li>• Set conservative daily limits</li>
                <li>• Monitor your account activity regularly</li>
                <li>• Never share your 2FA codes with anyone</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}