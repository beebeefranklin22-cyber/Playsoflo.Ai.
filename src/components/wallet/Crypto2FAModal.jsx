import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export default function Crypto2FAModal({ onVerify, onClose, action = "transaction" }) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      // Simulate verification - in production, verify against stored secret
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simple verification (in production, use proper TOTP verification)
      const isValid = code.length === 6 && /^\d+$/.test(code);
      
      if (isValid) {
        toast.success("✓ Verified successfully");
        onVerify(true);
      } else {
        setError("Invalid code. Please try again.");
        setVerifying(false);
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
      setVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden border border-purple-500/30"
        >
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  Security Verification
                </h2>
                <p className="text-blue-100 text-sm mt-1">Enter your 2FA code</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-300 text-sm font-semibold mb-1">Two-Factor Authentication</p>
                  <p className="text-blue-200 text-xs">
                    To proceed with this {action}, please enter the 6-digit code from your authenticator app.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block">Authentication Code</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''));
                  setError("");
                }}
                placeholder="000000"
                className="bg-white/10 border-white/20 text-white text-2xl text-center tracking-widest font-mono"
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </p>
              )}
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-xs">
                💡 <strong className="text-white">Tip:</strong> Open your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code shown for PlaySoFlo.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-white/20"
                disabled={verifying}
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verifying || code.length !== 6}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
              >
                {verifying ? (
                  "Verifying..."
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}