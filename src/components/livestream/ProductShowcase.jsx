import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, X, Plus, ExternalLink, DollarSign, Package, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import QuickPaymentModal from "./QuickPaymentModal";

export default function ProductShowcase({ streamId, isCreator, currentUser, creatorEmail }) {
  const queryClient = useQueryClient();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [products, setProducts] = useState([]);
  const [featuredProduct, setFeaturedProduct] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    image_url: "",
    link: "",
    description: ""
  });

  // Real-time subscription for products
  useEffect(() => {
    if (!streamId) return;
    
    // Initial fetch
    const fetchProducts = async () => {
      const p = await base44.entities.CreatorProduct.filter({ 
        stream_id: streamId,
        is_active: true
      });
      setProducts(p);
      
      // Set featured product if any
      const featured = p.find(prod => prod.is_featured);
      if (featured) setFeaturedProduct(featured);
    };
    fetchProducts();

    // Subscribe to real-time updates
    const unsubscribe = base44.entities.CreatorProduct.subscribe((event) => {
      if (event.data?.stream_id === streamId) {
        if (event.type === 'create') {
          setProducts(prev => [...prev, event.data]);
        } else if (event.type === 'update') {
          setProducts(prev => prev.map(p => p.id === event.id ? event.data : p));
          if (event.data?.is_featured) {
            setFeaturedProduct(event.data);
          }
        } else if (event.type === 'delete') {
          setProducts(prev => prev.filter(p => p.id !== event.id));
        }
      }
    });

    return () => unsubscribe();
  }, [streamId]);

  const addProductMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.CreatorProduct.create({
        ...data,
        stream_id: streamId,
        creator_email: currentUser.email,
        is_active: true,
        is_featured: false,
        clicks: 0,
        purchases: 0
      });
    },
    onSuccess: () => {
      setShowAddProduct(false);
      setProductForm({ name: "", price: "", image_url: "", link: "", description: "" });
      toast.success('Product added!');
    }
  });

  const featureProductMutation = useMutation({
    mutationFn: async (productId) => {
      // Unfeature all other products first
      await Promise.all(
        products.map(p => 
          base44.entities.CreatorProduct.update(p.id, { is_featured: false })
        )
      );
      
      // Feature the selected product
      return await base44.entities.CreatorProduct.update(productId, { 
        is_featured: true 
      });
    },
    onSuccess: () => {
      toast.success('Product featured on stream!');
    }
  });

  const removeProductMutation = useMutation({
    mutationFn: (productId) => 
      base44.entities.CreatorProduct.update(productId, { is_active: false }),
    onSuccess: () => {
      toast.success('Product removed');
    }
  });

  const trackClickMutation = useMutation({
    mutationFn: async (productId) => {
      const product = products.find(p => p.id === productId);
      await base44.entities.CreatorProduct.update(productId, {
        clicks: (product.clicks || 0) + 1
      });
    }
  });

  const handleUploadImage = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setProductForm({ ...productForm, image_url: file_url });
    toast.success('Image uploaded!');
  };

  return (
    <div className="space-y-4">
      {/* Creator Controls */}
      {isCreator && (
        <div className="space-y-2">
          <Button
            onClick={() => setShowAddProduct(!showAddProduct)}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product to Showcase
          </Button>

          {/* Add Product Form */}
          <AnimatePresence>
            {showAddProduct && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4 space-y-3">
                    <Input
                      placeholder="Product Name"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Input
                      type="number"
                      placeholder="Price (USD)"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Input
                      placeholder="Product Link"
                      value={productForm.link}
                      onChange={(e) => setProductForm({ ...productForm, link: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Input
                      placeholder="Short Description"
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    
                    <div className="space-y-2">
                      {productForm.image_url && (
                        <img src={productForm.image_url} className="w-full h-32 object-cover rounded-lg" alt="Product" />
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => document.getElementById('product-image-upload').click()}
                          variant="outline"
                          className="flex-1 border-white/20"
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Upload Image
                        </Button>
                        <input
                          id="product-image-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUploadImage(e.target.files?.[0])}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => addProductMutation.mutate(productForm)}
                        disabled={!productForm.name || !productForm.price || addProductMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Add Product
                      </Button>
                      <Button
                        onClick={() => setShowAddProduct(false)}
                        variant="outline"
                        className="border-white/20"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Featured Product Display - Large */}
      <AnimatePresence>
        {featuredProduct && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative"
          >
            <Card className="bg-gradient-to-br from-green-500/20 to-blue-500/20 border-green-500/40 border-2 overflow-hidden">
              <CardContent className="p-0">
                {featuredProduct.image_url && (
                  <img 
                    src={featuredProduct.image_url} 
                    alt={featuredProduct.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-xl mb-1">{featuredProduct.name}</h3>
                      {featuredProduct.description && (
                        <p className="text-gray-300 text-sm mb-2">{featuredProduct.description}</p>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-green-400 text-2xl font-bold">
                          ${featuredProduct.price}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{featuredProduct.clicks || 0} clicks</span>
                          <span>•</span>
                          <span>{featuredProduct.purchases || 0} purchases</span>
                        </div>
                      </div>
                    </div>
                    {isCreator && (
                      <Button
                        onClick={() => featureProductMutation.mutate(null)}
                        size="sm"
                        variant="ghost"
                        className="text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        trackClickMutation.mutate(featuredProduct.id);
                        setSelectedProduct(featuredProduct);
                        setShowPaymentModal(true);
                      }}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Buy Now
                    </Button>
                    {featuredProduct.link && (
                      <Button
                        onClick={() => {
                          trackClickMutation.mutate(featuredProduct.id);
                          window.open(featuredProduct.link, '_blank');
                        }}
                        variant="outline"
                        className="border-white/20"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product List */}
      {isCreator && products.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-white font-semibold text-sm">Your Products ({products.length})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {products.map((product) => (
              <Card key={product.id} className="bg-white/5 border-white/10">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {product.image_url && (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h5 className="text-white font-semibold text-sm truncate">{product.name}</h5>
                      <p className="text-green-400 font-bold">${product.price}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{product.clicks || 0} clicks</span>
                        <span>•</span>
                        <span>{product.purchases || 0} sales</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!product.is_featured && (
                        <Button
                          onClick={() => featureProductMutation.mutate(product.id)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-xs"
                        >
                          Feature
                        </Button>
                      )}
                      {product.is_featured && (
                        <span className="text-yellow-400 text-xs font-bold">FEATURED</span>
                      )}
                      <Button
                        onClick={() => removeProductMutation.mutate(product.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Viewer - All Products Grid */}
      {!isCreator && products.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" />
            Shop This Stream
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <Card key={product.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer">
                <CardContent className="p-3">
                  {product.image_url && (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                  )}
                  <h5 className="text-white font-semibold text-sm mb-1 truncate">{product.name}</h5>
                  <p className="text-green-400 font-bold mb-2">${product.price}</p>
                  <Button
                    onClick={() => {
                      trackClickMutation.mutate(product.id);
                      setSelectedProduct(product);
                      setShowPaymentModal(true);
                    }}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    Buy
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedProduct && (
        <QuickPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedProduct(null);
          }}
          type="product"
          amount={parseFloat(selectedProduct.price)}
          creatorEmail={creatorEmail}
          streamId={streamId}
          productData={selectedProduct}
          currentUser={currentUser}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['creator-products'] });
          }}
        />
      )}
    </div>
  );
}