import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function PassengerVerificationModal({ open, onClose, ride, onVerified }) {
  const [enteredCode, setEnteredCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = () => {
    setVerifying(true);
    
    setTimeout(() => {
      if (enteredCode === ride.passenger_verification_code) {
        toast.success("Passenger verified! ✓");
        onVerified?.();
        onClose();
      } else {
        toast.error("Invalid code. Please try again.");
        setEnteredCode("");
      }
      setVerifying(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-green-400" />
              Verify Passenger
            </DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="py-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Ask for Verification Code
            </h3>
            <p className="text-gray-400 text-sm">
              Request the 4-digit code from the passenger before starting the ride
            </p>
          </div>

          {/* Passenger Info */}
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <div className="text-gray-400 text-sm mb-1">Passenger Name</div>
            <div className="text-white font-bold text-lg">
              {ride.is_gift_ride ? ride.gift_recipient_name : ride.created_by}
            </div>
            {ride.is_gift_ride && (
              <div className="mt-2 flex items-center gap-2 text-pink-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                This is a gift ride
              </div>
            )}
          </div>

          {/* Code Input */}
          <div className="mb-6">
            <label className="text-white text-sm font-medium mb-2 block">
              Enter 4-Digit Code
            </label>
            <Input
              type="text"
              maxLength={4}
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
              className="text-center text-3xl font-bold tracking-widest bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Safety Tips */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-yellow-300 text-sm">
                <strong>Safety Tips:</strong><br />
                • Verify passenger name matches<br />
                • Check pickup location is correct<br />
                • Never share verification codes
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-white/5 border-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={enteredCode.length !== 4 || verifying}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <Check className="w-4 h-4 mr-2" />
              {verifying ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}