import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, AlertTriangle, TrendingUp, DollarSign, Eye,
  Plus, Edit2, Trash2, Upload, Search, Filter, BarChart3,
  ShoppingCart, Star, Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ProductManagementDashboard({ currentUser }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    stock_quantity: "",
    category: "other",
    image_url: "",
    is_featured: false
  });

  // Fetch products with real-time updates
  const { data: products = [] } = useQuery({
    queryKey: ['my-products', currentUser?.email],
    queryFn: async () => {
      const items = await base44.entities.MarketplaceItem.filter({
        seller_email: currentUser.email
      });
      return items.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!currentUser,
    refetchInterval: 3000 // Real-time sync every 3s
  });

  // Fetch stock alerts
  const { data: stockAlerts = [] } = useQuery({
    queryKey: ['stock-alerts', currentUser?.email],
    queryFn: () => base44.entities.StockAlert.filter({
      owner_email: currentUser.email,
      is_resolved: false
    }),
    enabled: !!currentUser,
    refetchInterval: 5000
  });

  // Subscribe to real-time updates
  React.useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = base44.entities.MarketplaceItem.subscribe((event) => {
      if (event.data.seller_email === currentUser.email) {
        queryClient.invalidateQueries(['my-products']);
        
        // Check stock levels and create alerts
        if (event.type === 'update' && event.data.stock_quantity <= 5) {
          checkStockLevel(event.data);
        }
      }
    });
    
    return unsubscribe;
  }, [currentUser]);

  const checkStockLevel = async (product) => {
    const existingAlert = stockAlerts.find(a => a.item_id === product.id && !a.is_resolved);
    
    if (!existingAlert && product.stock_quantity <= 5) {
      await base44.entities.StockAlert.create({
        item_id: product.id,
        item_name: product.name,
        owner_email: currentUser.email,
        current_stock: product.stock_quantity,
        threshold: 5,
        alert_type: product.stock_quantity === 0 ? "out_of_stock" : "low_stock"
      });
      
      await base44.entities.Notification.create({
        recipient_email: currentUser.email,
        type: "system_alert",
        title: product.stock_quantity === 0 ? "Out of Stock!" : "Low Stock Alert",
        message: `${product.name} is ${product.stock_quantity === 0 ? 'out of stock' : `running low (${product.stock_quantity} left)`}`,
        reference_type: "order",
        reference_id: product.id
      });
      
      queryClient.invalidateQueries(['stock-alerts']);
      toast.error(`${product.name} stock is low!`);
    }
  };

  const createProductMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.MarketplaceItem.create({
        ...data,
        seller_email: currentUser.email,
        seller_name: currentUser.full_name || currentUser.email,
        status: "available"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-products']);
      setShowAddProduct(false);
      resetForm();
      toast.success("Product added!");
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MarketplaceItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-products']);
      setEditingProduct(null);
      resetForm();
      toast.success("Product updated!");
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketplaceItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-products']);
      toast.success("Product deleted!");
    }
  });

  const resolveAlertMutation = useMutation({
    mutationFn: (alertId) => base44.entities.StockAlert.update(alertId, {
      is_resolved: true,
      resolved_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['stock-alerts']);
      toast.success("Alert resolved");
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info("Uploading image...");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProductForm(prev => ({ ...prev, image_url: file_url }));
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Upload failed");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...productForm,
      price: parseFloat(productForm.price),
      stock_quantity: parseInt(productForm.stock_quantity)
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const resetForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      stock_quantity: "",
      category: "other",
      image_url: "",
      is_featured: false
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.stock_quantity <= 5 && p.stock_quantity > 0).length,
    outOfStock: products.filter(p => p.stock_quantity === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0)
  };

  return (
    <div className="space-y-6">
      {/* Stock Alerts Banner */}
      {stockAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/50 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-2">Stock Alerts ({stockAlerts.length})</h3>
              <div className="space-y-2">
                {stockAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between bg-black/20 rounded-lg p-2">
                    <div>
                      <p className="text-white text-sm font-medium">{alert.item_name}</p>
                      <p className="text-red-300 text-xs">
                        {alert.alert_type === "out_of_stock" ? "Out of stock!" : `Only ${alert.current_stock} left`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => resolveAlertMutation.mutate(alert.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-gray-400 text-sm">Total Products</p>
                <p className="text-white text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-gray-400 text-sm">Low Stock</p>
                <p className="text-white text-2xl font-bold">{stats.lowStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-600/20 to-pink-600/20 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-gray-400 text-sm">Out of Stock</p>
                <p className="text-white text-2xl font-bold">{stats.outOfStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-gray-400 text-sm">Inventory Value</p>
                <p className="text-white text-2xl font-bold">${stats.totalValue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white"
          />
        </div>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
        >
          <option value="all">All Categories</option>
          <option value="food">Food</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="other">Other</option>
        </select>

        <Button
          onClick={() => {
            resetForm();
            setShowAddProduct(true);
          }}
          className="bg-gradient-to-r from-purple-600 to-pink-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Product Form Modal */}
      <AnimatePresence>
        {(showAddProduct || editingProduct) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => {
              setShowAddProduct(false);
              setEditingProduct(null);
              resetForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-white text-sm mb-2 block">Product Image</label>
                  <div className="flex items-center gap-4">
                    {productForm.image_url && (
                      <img src={productForm.image_url} className="w-24 h-24 object-cover rounded-lg" />
                    )}
                    <Button
                      type="button"
                      onClick={() => document.getElementById('product-image-upload').click()}
                      variant="outline"
                      className="bg-white/5"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                    <input
                      id="product-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <Input
                  placeholder="Product Name"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />

                <Input
                  placeholder="Description"
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price ($)"
                    value={productForm.price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                    required
                    className="bg-white/10 border-white/20 text-white"
                  />

                  <Input
                    type="number"
                    placeholder="Stock Quantity"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    required
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="food">Food & Beverage</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="other">Other</option>
                </select>

                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.is_featured}
                    onChange={(e) => setProductForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>Feature this product</span>
                </label>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddProduct(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="flex-1 bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    {editingProduct ? "Update" : "Add"} Product
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-white/5 border-white/10 hover:border-purple-500/50 transition group">
              <CardContent className="p-4">
                <div className="relative mb-3">
                  <img
                    src={product.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300"}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  {product.is_featured && (
                    <Badge className="absolute top-2 right-2 bg-yellow-500">
                      <Star className="w-3 h-3" />
                    </Badge>
                  )}
                  {product.stock_quantity === 0 && (
                    <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                      <Badge className="bg-red-500">Out of Stock</Badge>
                    </div>
                  )}
                  {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                    <Badge className="absolute top-2 left-2 bg-yellow-500">
                      Low Stock
                    </Badge>
                  )}
                </div>

                <h3 className="text-white font-semibold mb-1 truncate">{product.name}</h3>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-purple-400 font-bold text-xl">${product.price}</span>
                  <span className="text-gray-400 text-sm">Stock: {product.stock_quantity}</span>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingProduct(product);
                      setProductForm({
                        name: product.name,
                        description: product.description || "",
                        price: product.price.toString(),
                        stock_quantity: product.stock_quantity.toString(),
                        category: product.category || "other",
                        image_url: product.image_url || "",
                        is_featured: product.is_featured || false
                      });
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this product?")) {
                        deleteProductMutation.mutate(product.id);
                      }
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No products found</p>
        </div>
      )}
    </div>
  );
}