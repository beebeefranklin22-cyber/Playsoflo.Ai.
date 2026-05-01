import React, { useState } from "react";
import { autoDSImportProducts } from "@/functions/autoDSImportProducts";
import { autoDSFulfillOrder } from "@/functions/autoDSFulfillOrder";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, ShoppingCart, Plus, RefreshCw, ExternalLink, Truck, DollarSign, Star, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function DropshippingDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [retailPrice, setRetailPrice] = useState("");
  const [activeTab, setActiveTab] = useState("find"); // find | imported | orders
  const queryClient = useQueryClient();

  const categories = ["Electronics", "Fashion", "Home & Garden", "Beauty", "Toys", "Sports", "Auto", "Pet Supplies"];

  // Search AutoDS products
  const { data: searchResults, isLoading: searching, refetch: doSearch } = useQuery({
    queryKey: ['autods-products', searchQuery, category],
    queryFn: async () => {
      if (!searchQuery && !category) return { products: [] };
      const res = await autoDSImportProducts({ query: searchQuery, category, limit: 20 });
      return res.data;
    },
    enabled: false,
    retry: false
  });

  // Get imported products from marketplace
  const { data: importedProducts = [] } = useQuery({
    queryKey: ['imported-dropship-products'],
    queryFn: () => base44.entities.MarketplaceItem.filter({ item_type: 'dropship' }),
    refetchInterval: 30000
  });

  // Get pending orders that need fulfillment
  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['dropship-orders'],
    queryFn: () => base44.entities.Order.filter({ order_type: 'dropship' }),
    refetchInterval: 15000
  });

  // Import product to marketplace
  const importMutation = useMutation({
    mutationFn: async (product) => {
      const price = parseFloat(retailPrice) || product.suggested_retail_price;
      return base44.entities.MarketplaceItem.create({
        title: product.title,
        description: product.description,
        images: product.images,
        price,
        cost_price: product.supplier_price,
        item_type: 'dropship',
        supplier: product.supplier,
        autods_product_id: product.autods_id,
        sku: product.sku,
        category: product.category,
        stock_quantity: product.stock,
        shipping_info: product.shipping_time,
        status: 'active'
      });
    },
    onSuccess: () => {
      toast.success("Product imported to your marketplace!");
      queryClient.invalidateQueries({ queryKey: ['imported-dropship-products'] });
      setSelectedProduct(null);
      setRetailPrice("");
    },
    onError: (err) => toast.error(err.message)
  });

  // Fulfill an order via AutoDS
  const fulfillMutation = useMutation({
    mutationFn: async (order) => {
      const shippingAddr = order.shipping_address ? JSON.parse(order.shipping_address) : {};
      const res = await autoDSFulfillOrder({
        order_id: order.id,
        autods_product_id: order.autods_product_id,
        quantity: order.quantity || 1,
        shipping_address: shippingAddr
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Order submitted to supplier!");
      queryClient.invalidateQueries({ queryKey: ['dropship-orders'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch();
  };

  const products = searchResults?.products || [];
  const isApiKeyMissing = searchResults?.error?.includes('AUTODS_API_KEY');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">AutoDS Dropshipping</h1>
              <p className="text-gray-400">Import products & auto-fulfill orders</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { label: "Imported Products", value: importedProducts.length, icon: Package, color: "from-purple-500 to-indigo-500" },
              { label: "Pending Orders", value: pendingOrders.filter(o => o.status === 'pending').length, icon: ShoppingCart, color: "from-pink-500 to-rose-500" },
              { label: "Processing", value: pendingOrders.filter(o => o.status === 'processing').length, icon: RefreshCw, color: "from-emerald-500 to-teal-500" }
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Key Warning */}
        {isApiKeyMissing && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-semibold">AutoDS API Key Required</p>
              <p className="text-amber-400/80 text-sm mt-1">
                Go to your AutoDS dashboard → Settings → API to get your key, then add it in Base44 Dashboard → Settings → Environment Variables as <code className="bg-white/10 px-1 rounded">AUTODS_API_KEY</code>.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl w-fit">
          {[
            { id: "find", label: "Find Products" },
            { id: "imported", label: "My Products" },
            { id: "orders", label: "Orders" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Find Products Tab */}
        {activeTab === "find" && (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search AutoDS products..."
                  className="bg-white/10 border-white/20 text-white pl-11"
                />
              </div>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Button type="submit" disabled={searching} className="bg-purple-600 hover:bg-purple-700">
                {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </Button>
            </form>

            <AnimatePresence>
              {products.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product, i) => (
                    <motion.div
                      key={product.autods_id || i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition"
                    >
                      {product.image_url && (
                        <img src={product.image_url} alt={product.title} className="w-full h-48 object-cover" />
                      )}
                      <div className="p-4">
                        <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">{product.title}</h3>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-gray-400 text-xs">Cost</p>
                            <p className="text-white font-bold">${product.supplier_price}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Suggested Retail</p>
                            <p className="text-green-400 font-bold">${product.suggested_retail_price}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Profit</p>
                            <p className="text-purple-400 font-bold">
                              ${Math.round((product.suggested_retail_price - product.supplier_price) * 100) / 100}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-white/10 text-gray-300 text-xs border-0">{product.shipping_time}</Badge>
                          <Badge className="bg-white/10 text-gray-300 text-xs border-0">{product.supplier}</Badge>
                        </div>
                        <Button
                          onClick={() => { setSelectedProduct(product); setRetailPrice(String(product.suggested_retail_price)); }}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Import to Marketplace
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>

            {!searching && products.length === 0 && searchQuery && (
              <div className="text-center py-16 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No products found. Try a different search term.</p>
              </div>
            )}

            {!searchQuery && !category && (
              <div className="text-center py-16 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium text-gray-400">Search AutoDS for products to import</p>
                <p className="text-sm mt-2">Access 500+ suppliers including AliExpress, Amazon, Walmart & more</p>
              </div>
            )}
          </div>
        )}

        {/* My Imported Products Tab */}
        {activeTab === "imported" && (
          <div>
            {importedProducts.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No dropship products imported yet. Go to "Find Products" to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {importedProducts.map(product => (
                  <div key={product.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt={product.title} className="w-full h-40 object-cover rounded-xl mb-3" />
                    )}
                    <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">{product.title}</h3>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Cost: <span className="text-white">${product.cost_price}</span></span>
                      <span className="text-gray-400">Price: <span className="text-green-400">${product.price}</span></span>
                    </div>
                    <Badge className={`${product.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'} border-0`}>
                      {product.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-3">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No dropship orders yet.</p>
              </div>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{order.product_name}</p>
                    <p className="text-gray-400 text-sm">Order #{order.id.slice(-8)} · ${order.total_amount}</p>
                    <Badge className={`mt-1 border-0 text-xs ${
                      order.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      order.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {order.status}
                    </Badge>
                  </div>
                  {order.status === 'pending' && (
                    <Button
                      onClick={() => fulfillMutation.mutate(order)}
                      disabled={fulfillMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Truck className="w-4 h-4" />
                      Fulfill
                    </Button>
                  )}
                  {order.autods_order_id && (
                    <p className="text-gray-500 text-xs">AutoDS: {order.autods_order_id}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-gray-900 rounded-3xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Import Product</h2>
            <p className="text-gray-300 text-sm mb-4 line-clamp-2">{selectedProduct.title}</p>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Your Retail Price (USD)</label>
                <Input
                  type="number"
                  value={retailPrice}
                  onChange={e => setRetailPrice(e.target.value)}
                  placeholder="Set your selling price"
                  className="bg-white/10 border-white/20 text-white"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Supplier cost: ${selectedProduct.supplier_price} · 
                  Profit: ${Math.round((parseFloat(retailPrice || 0) - selectedProduct.supplier_price) * 100) / 100}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSelectedProduct(null)} className="flex-1 border-white/20 text-white">
                  Cancel
                </Button>
                <Button
                  onClick={() => importMutation.mutate(selectedProduct)}
                  disabled={importMutation.isPending || !retailPrice}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {importMutation.isPending ? "Importing..." : "Import Now"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}