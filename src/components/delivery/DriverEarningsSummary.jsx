import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Package, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DriverEarningsSummary({ driverEmail }) {
  const [expanded, setExpanded] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ["driver-earnings", driverEmail],
    queryFn: () =>
      base44.entities.Payment.filter({
        recipient_email: driverEmail,
        memo: "Delivery driver earnings"
      }),
    enabled: !!driverEmail,
    refetchInterval: 30000
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["driver-deliveries", driverEmail],
    queryFn: () =>
      base44.entities.DeliveryOrder.filter({ driver_email: driverEmail }),
    enabled: !!driverEmail,
    refetchInterval: 30000
  });

  // Aggregate stats
  const totalEarned  = payments.reduce((sum, p) => sum + (parseFloat(p.amount_usd) || 0), 0);
  const totalOrders  = payments.length;
  const avgPerOrder  = totalOrders > 0 ? totalEarned / totalOrders : 0;

  // This week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weeklyEarnings = payments
    .filter(p => new Date(p.created_date) >= weekStart)
    .reduce((sum, p) => sum + (parseFloat(p.amount_usd) || 0), 0);

  // Recent 5 settlements
  const recent = [...payments]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-white font-bold text-lg">${totalEarned.toFixed(2)}</p>
            <p className="text-gray-400 text-xs">Total Delivery Earnings</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 hover:bg-white/10 rounded-full transition"
        >
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-3 gap-px bg-white/5 border-t border-white/10">
        <div className="bg-gray-900/60 p-3 text-center">
          <Package className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="text-white font-bold text-sm">{totalOrders}</p>
          <p className="text-gray-500 text-xs">Deliveries</p>
        </div>
        <div className="bg-gray-900/60 p-3 text-center">
          <TrendingUp className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="text-white font-bold text-sm">${avgPerOrder.toFixed(2)}</p>
          <p className="text-gray-500 text-xs">Avg/Order</p>
        </div>
        <div className="bg-gray-900/60 p-3 text-center">
          <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
          <p className="text-white font-bold text-sm">${weeklyEarnings.toFixed(2)}</p>
          <p className="text-gray-500 text-xs">This Week</p>
        </div>
      </div>

      {/* Expanded: recent settlements */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-white/10 space-y-2">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Recent Settlements
              </p>
              {recent.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-2">
                  No settlements yet
                </p>
              ) : (
                recent.map((p) => {
                  let meta = {};
                  try { meta = JSON.parse(p.metadata || "{}"); } catch {}
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">
                          {meta.order_number
                            ? `#${meta.order_number.substring(0, 8)}`
                            : "Delivery"}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {formatDate(p.created_date)}
                        </p>
                        {meta.surge_multiplier > 1 && (
                          <span className="text-yellow-400 text-xs">
                            ⚡ {meta.surge_multiplier}x surge
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">
                          +${parseFloat(p.amount_usd).toFixed(2)}
                        </p>
                        {meta.platform_fee > 0 && (
                          <p className="text-gray-500 text-xs">
                            fee ${meta.platform_fee?.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}