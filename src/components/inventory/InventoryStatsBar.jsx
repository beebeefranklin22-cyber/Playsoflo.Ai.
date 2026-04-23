import React, { useMemo } from "react";
import { Package, AlertTriangle, TrendingUp, DollarSign, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

export default function InventoryStatsBar({ products }) {
  const stats = React.useMemo(() => {
    const active = products.filter(p => p.status === "active");
    const lowStock = active.filter(p => p.track_inventory && p.stock_quantity <= (p.low_stock_threshold || 5) && p.stock_quantity > 0);
    const outOfStock = active.filter(p => p.track_inventory && p.stock_quantity === 0);
    const totalValue = active.reduce((sum, p) => sum + ((p.cost_price || p.base_price) * (p.stock_quantity || 0)), 0);
    const totalRetail = active.reduce((sum, p) => sum + (p.base_price * (p.stock_quantity || 0)), 0);
    const totalSold = active.reduce((sum, p) => sum + (p.total_sold || 0), 0);
    return { total: active.length, lowStock: lowStock.length, outOfStock: outOfStock.length, totalValue, totalRetail, totalSold };
  }, [products]);

  const cards = [
    { label: "Total Products", value: stats.total, icon: Package, color: "from-purple-600/20 to-purple-800/20", border: "border-purple-500/30", iconColor: "text-purple-400" },
    { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: "from-yellow-600/20 to-orange-800/20", border: "border-yellow-500/30", iconColor: "text-yellow-400" },
    { label: "Out of Stock", value: stats.outOfStock, icon: ShoppingCart, color: "from-red-600/20 to-red-800/20", border: "border-red-500/30", iconColor: "text-red-400" },
    { label: "Inventory Value", value: `$${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: "from-green-600/20 to-emerald-800/20", border: "border-green-500/30", iconColor: "text-green-400" },
    { label: "Total Sold", value: stats.totalSold, icon: TrendingUp, color: "from-blue-600/20 to-cyan-800/20", border: "border-blue-500/30", iconColor: "text-blue-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-2xl p-4`}
        >
          <div className="flex items-center gap-2 mb-1">
            <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            <p className="text-gray-400 text-xs">{card.label}</p>
          </div>
          <p className="text-white text-2xl font-bold">{card.value}</p>
        </motion.div>
      ))}
    </div>
  );
}