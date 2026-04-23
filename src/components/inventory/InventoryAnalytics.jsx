import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Package, Star } from "lucide-react";

const COLORS = ["#9333ea", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

export default function InventoryAnalytics({ currentUser }) {
  const { data: products = [] } = useQuery({
    queryKey: ["inventory-products", currentUser?.email],
    queryFn: () => base44.entities.InventoryProduct.filter({ owner_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const active = products.filter(p => p.status === "active");

  // By category
  const byCategory = Object.entries(
    active.reduce((acc, p) => {
      const cat = p.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = { count: 0, value: 0, sold: 0 };
      acc[cat].count++;
      acc[cat].value += (p.base_price || 0) * (p.stock_quantity || 0);
      acc[cat].sold += p.total_sold || 0;
      return acc;
    }, {})
  ).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count).slice(0, 8);

  // Top sellers
  const topSellers = [...active].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0)).slice(0, 5);

  // Low margin products
  const margins = active
    .filter(p => p.cost_price > 0 && p.base_price > 0)
    .map(p => ({ ...p, margin: ((p.base_price - p.cost_price) / p.base_price * 100) }))
    .sort((a, b) => a.margin - b.margin).slice(0, 5);

  // Stock health
  const healthy = active.filter(p => !p.track_inventory || p.stock_quantity > (p.low_stock_threshold || 5)).length;
  const low = active.filter(p => p.track_inventory && p.stock_quantity <= (p.low_stock_threshold || 5) && p.stock_quantity > 0).length;
  const out = active.filter(p => p.track_inventory && p.stock_quantity === 0).length;
  const stockHealth = [
    { name: "Healthy", value: healthy, color: "#10b981" },
    { name: "Low Stock", value: low, color: "#f59e0b" },
    { name: "Out of Stock", value: out, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const totalRetailValue = active.reduce((s, p) => s + p.base_price * (p.stock_quantity || 0), 0);
  const totalCostValue = active.reduce((s, p) => s + (p.cost_price || 0) * (p.stock_quantity || 0), 0);
  const avgMargin = active.filter(p => p.cost_price > 0).length > 0
    ? active.filter(p => p.cost_price > 0).reduce((s, p) => s + ((p.base_price - p.cost_price) / p.base_price * 100), 0) / active.filter(p => p.cost_price > 0).length
    : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Retail Value", value: `$${totalRetailValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: "text-green-400" },
          { label: "Cost Value", value: `$${totalCostValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: "text-blue-400" },
          { label: "Avg Margin", value: `${avgMargin.toFixed(1)}%`, icon: TrendingUp, color: "text-purple-400" },
          { label: "Total SKUs", value: active.length, icon: Package, color: "text-pink-400" },
        ].map(k => (
          <div key={k.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <k.icon className={`w-5 h-5 ${k.color} mb-2`} />
            <p className="text-gray-400 text-xs">{k.label}</p>
            <p className="text-white text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Category Bar */}
        {byCategory.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white font-semibold mb-4">Products by Category</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory}>
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
                <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]} name="Products" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stock Health Pie */}
        {stockHealth.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white font-semibold mb-4">Stock Health</p>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={stockHealth} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {stockHealth.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {stockHealth.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-gray-300 text-sm">{d.name}</span>
                    <span className="text-white font-semibold text-sm ml-auto pl-2">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Sellers */}
      {topSellers.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-white font-semibold mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> Top Sellers</p>
          <div className="space-y-3">
            {topSellers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-gray-500 text-sm w-5">{i + 1}</span>
                {p.image_url && <img src={p.image_url} className="w-8 h-8 rounded-lg object-cover" alt="" />}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.name}</p>
                  <p className="text-gray-400 text-xs">{p.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-purple-400 font-semibold">{p.total_sold || 0} sold</p>
                  <p className="text-gray-400 text-xs">${p.base_price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Margin Analysis */}
      {margins.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" /> Lowest Margin Products</p>
          <div className="space-y-2">
            {margins.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-white text-sm">{p.name}</p>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(p.margin, 100)}%`, background: p.margin < 20 ? "#ef4444" : p.margin < 40 ? "#f59e0b" : "#10b981" }} />
                  </div>
                </div>
                <span className={`text-sm font-semibold ${p.margin < 20 ? "text-red-400" : p.margin < 40 ? "text-yellow-400" : "text-green-400"}`}>
                  {p.margin.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}