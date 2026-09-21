import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { X, Droplet, Clock } from "lucide-react";
import { motion } from "framer-motion";

// This used to call base44.functions.invoke('fetchDeFiPositions'/
// 'trackDeFiAPY', ...), backend functions that were never implemented --
// tracking real on-chain DeFi positions and their live APY needs a real
// DeFi data provider (e.g. Zapper or DeBank) this app isn't hooked up to.
// Rather than a dashboard that looks live but can only ever show an empty
// or erroring state, this is now an honest "coming soon" until that
// integration exists.
export default function DeFiTracker({ onClose }) {
  return (
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
        className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Droplet className="w-7 h-7 text-blue-400" />
            DeFi Portfolio
          </h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-10 text-center space-y-3">
            <Clock className="w-10 h-10 text-yellow-400 mx-auto" />
            <h3 className="text-white font-bold text-lg">Coming Soon</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Tracking your real on-chain DeFi positions and live APY needs a data provider this app isn't connected to yet. This dashboard will go live once that's set up.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
