import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Edit2, Trash2, Package, AlertTriangle,
  CheckCircle, Filter, ChevronDown, RefreshCw, Tag
} from "lucide-react";
import { toast } from "sonner";
import ProductFormModal from "./ProductFormModal";
import InventoryStatsBar from "./InventoryStatsBar";

const STATUS_BADGE = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  inactive: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  archived: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function InventoryProductList({ currentUser }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterStock, setFilterStock] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [quickStockId, setQuickStockId] = useState(null);
  const [quickStockVal, setQuickStockVal] = useState("");

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["inventory-products", currentUser?.email],
    queryFn: () => base44.entities.InventoryProduct.filter({ owner_email: currentUser.email }),
    enabled: !!currentUser,
    refetchInterval: 15000,
  });

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (filterStock === "low") return p.track_inventory && p.stock_quantity <= (p.low_stock_threshold || 5) && p.stock_quantity > 0;
    if (filterStock === "out") return p.track_inventory && p.stock_quantity === 0;
    if (filterStock === "ok") return !p.track_inventory || p.stock_quantity > (p.low_stock_threshold || 5);
    if (search) return p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()) || (p.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    return true;
  }).filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await base44.entities.InventoryProduct.delete(id);
    queryClient.invalidateQueries(["inventory-products"]);
    toast.success("Product deleted");
  };

  const handleQuickStock = async (product) => {
    const newQty = parseInt(quickStockVal);
    if (isNaN(newQty) || newQty < 0) { toast.error("Enter a valid quantity"); return; }
    await base44.entities.InventoryProduct.update(product.id, {
      stock_quantity: newQty,
      last_restocked_at: new Date().toISOString()
    });
    queryClient.invalidateQueries(["inventory-products"]);
    toast.success(`Stock updated to ${newQty}`);
    setQuickStockId(null);
    setQuickStockVal("");
  };

  const handleToggleStatus = async (product) => {
    const next = product.status === "active" ? "inactive" : "active";
    await base44.entities.InventoryProduct.update(product.id, { status: next });
    queryClient.invalidateQueries(["inventory-products"]);
    toast.success(`Product ${next}`);
  };

  const getStockBadge = (p) => {
    if (!p.track_inventory) return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">No tracking</Badge>;
    if (p.stock_quantity === 0) return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Out of stock</Badge>;
    if (p.stock_quantity <= (p.low_stock_threshold || 5)) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Low: {p.stock_quantity}</Badge>;
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{p.stock_quantity} in stock</Badge>;
  };

  return (
    <div className="space-y-5">
      <InventoryStatsBar products={products} />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or tag..."
            className="pl-9 bg-white/10 border-white/20 text-white placeholder-gray-500" />
        </div>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>

        <select value={filterStock} onChange={e => setFilterStock(e.target.value)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm">
          <option value="all">All Stock</option>
          <option value="ok">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>

        {categories.length > 0 && (
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <Button onClick={() => { setEditProduct(null); setShowForm(true); }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>

        <Button variant="outline" size="icon" onClick={() => refetch()} className="border-white/20 text-white hover:bg-white/10">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No products found</p>
          <p className="text-gray-600 text-sm mb-6">Add your first product to get started</p>
          <Button onClick={() => { setEditProduct(null); setShowForm(true); }} className="bg-gradient-to-r from-purple-600 to-pink-600">
            <Plus className="w-4 h-4 mr-2" /> Add First Product
          </Button>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/10 text-gray-400 text-xs font-medium uppercase tracking-wide">
            <div className="col-span-4">Product</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2">Stock</div>
            <div className="col-span-2">Actions</div>
          </div>

          <AnimatePresence>
            {filtered.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/5 transition ${i < filtered.length - 1 ? "border-b border-white/5" : ""}`}>
                {/* Product info */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  {p.image_url
                    ? <img src={p.image_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                    : <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5 text-gray-500" /></div>
                  }
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{p.name}</p>
                    <div className="flex items-center gap-2">
                      {p.sku && <span className="text-gray-500 text-xs">#{p.sku}</span>}
                      {p.is_featured && <span className="text-yellow-400 text-xs">⭐</span>}
                      {p.is_on_sale && <Badge className="bg-orange-500/20 text-orange-400 text-xs px-1 py-0">Sale</Badge>}
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div className="col-span-2">
                  <span className="text-gray-400 text-sm">{p.category || "—"}</span>
                  {p.subcategory && <p className="text-gray-600 text-xs">{p.subcategory}</p>}
                </div>

                {/* Price */}
                <div className="col-span-2">
                  <p className="text-white font-semibold">${p.base_price?.toFixed(2)}</p>
                  {p.cost_price > 0 && (
                    <p className="text-green-400 text-xs">
                      +${(p.base_price - p.cost_price).toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Stock */}
                <div className="col-span-2">
                  {quickStockId === p.id ? (
                    <div className="flex items-center gap-1">
                      <Input type="number" value={quickStockVal} onChange={e => setQuickStockVal(e.target.value)}
                        placeholder="Qty" className="w-16 h-7 text-xs bg-white/10 border-white/20 text-white px-2" />
                      <Button size="sm" onClick={() => handleQuickStock(p)} className="h-7 px-2 bg-green-600 hover:bg-green-700">✓</Button>
                      <Button size="sm" variant="ghost" onClick={() => setQuickStockId(null)} className="h-7 px-2 text-gray-400">✗</Button>
                    </div>
                  ) : (
                    <div className="cursor-pointer" onClick={() => { setQuickStockId(p.id); setQuickStockVal(p.stock_quantity?.toString() || "0"); }}>
                      {getStockBadge(p)}
                      <p className="text-gray-600 text-xs mt-0.5">Click to update</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditProduct(p); setShowForm(true); }}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 w-8 p-0">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(p)}
                    className={`h-8 w-8 p-0 ${p.status === "active" ? "text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10" : "text-green-400 hover:bg-green-500/10"}`}>
                    {p.status === "active" ? <ChevronDown className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Variants Summary */}
      {filtered.filter(p => p.variants?.length > 0).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white font-semibold mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-purple-400" /> Product Variants</p>
          <div className="space-y-2">
            {filtered.filter(p => p.variants?.length > 0).map(p => (
              <div key={p.id} className="flex items-start gap-3">
                <p className="text-gray-300 text-sm w-32 truncate flex-shrink-0">{p.name}:</p>
                <div className="flex flex-wrap gap-2">
                  {p.variants.map(v => (
                    <span key={v.id} className={`text-xs px-2 py-1 rounded-full border ${v.stock === 0 ? "bg-red-500/20 text-red-400 border-red-500/30" : v.stock <= (v.low_stock_threshold || 5) ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "bg-white/10 text-gray-300 border-white/10"}`}>
                      {v.name} ({v.stock})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <ProductFormModal
            product={editProduct}
            currentUser={currentUser}
            onClose={() => { setShowForm(false); setEditProduct(null); }}
            onSaved={() => { setShowForm(false); setEditProduct(null); queryClient.invalidateQueries(["inventory-products"]); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}