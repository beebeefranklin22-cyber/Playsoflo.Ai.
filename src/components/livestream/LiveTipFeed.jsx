import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, TrendingUp, Gift } from "lucide-react";

export default function LiveTipFeed({ streamId, isCreator }) {
  const [tips, setTips] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);

  // Load existing tips for this stream
  useEffect(() => {
    if (!streamId) return;
    base44.entities.TipTransaction.filter({ content_id: streamId })
      .then(data => {
        setTips(data.slice(-20).reverse());
        setTotalEarned(data.reduce((sum, t) => sum + (t.amount_usd || 0), 0));
      })
      .catch(() => {});
  }, [streamId]);

  // Subscribe to new tips in real-time
  useEffect(() => {
    if (!streamId) return;
    const unsub = base44.entities.TipTransaction.subscribe((event) => {
      if (event.type === "create" && event.data?.content_id === streamId) {
        const d = event.data;
        setTips(prev => [d, ...prev].slice(0, 20));
        setTotalEarned(prev => prev + (d.amount_usd || 0));
      }
    });
    return () => unsub();
  }, [streamId]);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-green-900/40 to-emerald-900/40">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-green-400" />
          <span className="text-white font-semibold text-sm">Live Tips</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-400 font-bold text-sm">${totalEarned.toFixed(2)}</span>
          {isCreator && <span className="text-gray-500 text-xs">earned</span>}
        </div>
      </div>

      {/* Tip list */}
      <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
        <AnimatePresence initial={false}>
          {tips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <DollarSign className="w-8 h-8 text-gray-600 mb-2" />
              <p className="text-gray-500 text-sm">No tips yet</p>
              <p className="text-gray-600 text-xs">Be the first to tip!</p>
            </div>
          ) : (
            tips.map((tip, i) => (
              <motion.div
                key={tip.id || i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(tip.tipper_name || tip.tipper_username || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-semibold truncate">
                      {tip.tipper_username || tip.tipper_name || "Anonymous"}
                    </p>
                    {tip.message && (
                      <p className="text-gray-400 text-xs truncate italic">"{tip.message}"</p>
                    )}
                  </div>
                </div>
                <span className="text-green-400 font-bold text-sm flex-shrink-0 ml-2">
                  ${tip.amount_usd}
                </span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}