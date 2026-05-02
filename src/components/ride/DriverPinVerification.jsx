import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, CheckCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Used by the DRIVER:
 * - Generates a 4-digit PIN and saves it to the RideRequest
 * - Shows the PIN to driver for verbal confirmation
 *
 * Used by the PASSENGER (RideWaitScreen / DriverMatchedCard):
 * - Displays the same PIN so passenger can confirm verbally
 * - Shows confirmation state once driver marks ride started
 */

// ─── Driver-side: generate & display PIN ──────────────────────────────────────
export function DriverPinPanel({ ride, onPinConfirmed }) {
  const [pin, setPin] = useState(ride?.safety_pin || null);
  const [generating, setGenerating] = useState(false);
  const [confirmed, setConfirmed] = useState(ride?.safety_pin_confirmed || false);

  const generatePin = async () => {
    setGenerating(true);
    const newPin = String(Math.floor(1000 + Math.random() * 9000));
    try {
      await base44.asServiceRole
        ? base44.entities.RideRequest.update(ride.id, { safety_pin: newPin, safety_pin_confirmed: false })
        : base44.entities.RideRequest.update(ride.id, { safety_pin: newPin, safety_pin_confirmed: false });
      setPin(newPin);
      setConfirmed(false);
    } catch (err) {
      toast.error("Could not save PIN");
    }
    setGenerating(false);
  };

  const confirmBoardedPin = async () => {
    try {
      await base44.entities.RideRequest.update(ride.id, { safety_pin_confirmed: true });
      setConfirmed(true);
      toast.success("PIN confirmed — ride started!");
      onPinConfirmed?.();
    } catch (err) {
      toast.error("Could not confirm PIN");
    }
  };

  useEffect(() => {
    // Auto-generate if no pin yet
    if (!pin && ride?.id) generatePin();
  }, [ride?.id]);

  if (confirmed) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-500/20 border border-green-500/40 rounded-xl">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <span className="text-green-300 font-semibold text-sm">Passenger verified — ride in progress</span>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-5 h-5 text-yellow-400" />
        <span className="text-white font-semibold text-sm">Safety PIN</span>
        <span className="text-xs text-gray-400 ml-auto">Share with passenger verbally</span>
      </div>

      {pin ? (
        <div className="flex items-center justify-center gap-3">
          {pin.split("").map((digit, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="w-14 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl flex items-center justify-center text-3xl font-bold text-yellow-300"
            >
              {digit}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={generatePin}
          disabled={generating}
          className="border-white/20 text-gray-300 hover:bg-white/10 flex-1"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          New PIN
        </Button>
        {pin && (
          <Button
            size="sm"
            onClick={confirmBoardedPin}
            className="bg-green-600 hover:bg-green-700 flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Passenger is in — Start Ride
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Passenger-side: view PIN & confirm ───────────────────────────────────────
export function PassengerPinDisplay({ ride }) {
  const [pin, setPin] = useState(ride?.safety_pin || null);
  const [confirmed, setConfirmed] = useState(ride?.safety_pin_confirmed || false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const unsubscribe = base44.entities.RideRequest.subscribe((event) => {
      if (event.data?.id === ride?.id && event.type === "update") {
        setPin(event.data.safety_pin || null);
        setConfirmed(event.data.safety_pin_confirmed || false);
      }
    });
    return unsubscribe;
  }, [ride?.id]);

  useEffect(() => {
    setPin(ride?.safety_pin || null);
    setConfirmed(ride?.safety_pin_confirmed || false);
  }, [ride?.safety_pin, ride?.safety_pin_confirmed]);

  if (!pin) {
    return (
      <div className="text-xs text-gray-500 italic text-center py-2">
        Driver will generate a safety PIN when they arrive
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-500/20 border border-green-500/40 rounded-xl">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <span className="text-green-300 font-semibold text-sm">PIN confirmed — enjoy your ride!</span>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-yellow-500/30 rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-yellow-400" />
        <span className="text-white font-semibold text-sm">Your Safety PIN</span>
        <button
          onClick={() => setRevealed(!revealed)}
          className="ml-auto text-gray-400 hover:text-white"
        >
          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-gray-400 text-xs">When you get in, verify the driver says this PIN</p>
      <div className="flex items-center justify-center gap-3">
        {pin.split("").map((digit, i) => (
          <div
            key={i}
            className="w-12 h-14 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl flex items-center justify-center text-2xl font-bold text-yellow-300"
          >
            {revealed ? digit : "•"}
          </div>
        ))}
      </div>
    </div>
  );
}