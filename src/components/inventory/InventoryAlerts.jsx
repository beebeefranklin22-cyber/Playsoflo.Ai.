import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShoppingCart, RefreshCw, CheckCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function InventoryAlerts({ currentUser }) {
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["inventory-products", currentUser?.email],
    queryFn: () => base44.entities.InventoryProduct.filter({ owner_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const alerts = products.filter(p => p.status === "active" && p.track_inventory).map(p => {
    if (p.stock_quantity === 0 && !p.allow_backorder) return { product: p, type: "out", label: "Out of Stock", color: "red" };
    if (p.stock_quantity <= (p.low_stock_threshold || 5) && p.stock_quantity > 0) return { product: p, type: "low", label: "Low Stock", color: "yellow" };
    return null;
  }).filter(Boolean);

  // Variant alerts
  const variantAlerts = products.flatMap(p =>
    (p.variants || []).filter(v => v.stock === 0 || v.stock <= (v.low_stock_threshold || 5))
      .map(v => ({
        product: p, variant: v,
        type: v.stock === 0 ? "out" : "low",
        label: v.stock === 0 ? "Variant Out of Stock" : "Variant Low Stock",
        color: v.stock === 0 ? "red" : "yellow"
      }))
  );

  const allAlerts = [...alerts, ...variantAlerts];

  const handleRestock = async (product, qty) => {
    const add = qty || product.reorder_quantity || 20;
    const newQty = (product.stock_quantity || 0) + add;
    await base44.entities.InventoryProduct.update(product.id, {
      stock_quantity: newQty,
      last_restocked_at: new Date().toISOString()
    });
    queryClient.invalidateQueries(["inventory-products"]);
    toast.success(`Restocked! New quantity: ${newQty}`);
  };

  if (allAlerts.length === 0) {
    return (
      <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <p className="text-white text-xl font-semibold mb-1">All Good!</p>
        <p className="text-gray-400">No stock alerts right now. Everything is well stocked.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          {allAlerts.length} Stock Alert{allAlerts.length !== 1 ? "s" : ""}
        </h3>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries(["inventory-products"])}
          className="border-white/20 text-white hover:bg-white/10">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Out of stock */}
      {allAlerts.filter(a => a.type === "out").length > 0 && (
        <div>
          <p className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-1"><ShoppingCart className="w-4 h-4" /> Out of Stock</p>
          <div className="space-y-2">
            {allAlerts.filter(a => a.type === "out").map((alert, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {alert.product.image_url
                    ? <img src={alert.product.image_url} className="w-12 h-12 object-cover rounded-lg" alt="" />
                    : <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center"><ShoppingCart className="w-6 h-6 text-red-400" /></div>
                  }
                  <div>
                    <p className="text-white font-semibold">{alert.product.name}{alert.variant ? ` — ${alert.variant.name}` : ""}</p>
                    <p className="text-red-400 text-sm">Out of stock{alert.product.allow_backorder ? " (backorders allowed)" : ""}</p>
                    {alert.product.supplier_name && (
                      <p className="text-gray-500 text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {alert.product.supplier_name} — {alert.product.supplier_contact}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => handleRestock(alert.product)}
                    className="bg-red-600 hover:bg-red-700 text-white">
                    + Restock {alert.product.reorder_quantity || 20}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Low stock */}
      {allAlerts.filter(a => a.type === "low").length > 0 && (
        <div>
          <p className="text-yellow-400 font-semibold text-sm mb-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Low Stock</p>
          <div className="space-y-2">
            {allAlerts.filter(a => a.type === "low").map((alert, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {alert.product.image_url
                    ? <img src={alert.product.image_url} className="w-12 h-12 object-cover rounded-lg" alt="" />
                    : <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-yellow-400" /></div>
                  }
                  <div>
                    <p className="text-white font-semibold">{alert.product.name}{alert.variant ? ` — ${alert.variant.name}` : ""}</p>
                    <p className="text-yellow-400 text-sm">
                      {alert.variant ? alert.variant.stock : alert.product.stock_quantity} left
                      (threshold: {alert.variant ? alert.variant.low_stock_threshold : alert.product.low_stock_threshold || 5})
                    </p>
                    {alert.product.supplier_name && (
                      <p className="text-gray-500 text-xs">{alert.product.supplier_name} — {alert.product.supplier_contact}</p>
                    )}
                  </div>
                </div>
                <Button size="sm" onClick={() => handleRestock(alert.product)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white flex-shrink-0">
                  + Restock {alert.product.reorder_quantity || 20}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}