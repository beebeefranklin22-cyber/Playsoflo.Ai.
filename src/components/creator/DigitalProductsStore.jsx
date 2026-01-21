import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Edit, Trash2, Download, DollarSign, Eye, FileText, Image as ImageIcon, Code } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function DigitalProductsStore({ currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    product_name: "",
    product_type: "preset",
    description: "",
    price: "",
    preview_images: [],
    download_url: "",
    file_size: "",
    compatible_software: "",
    tags: []
  });

  const { data: products = [] } = useQuery({
    queryKey: ['digital-products', currentUser.email],
    queryFn: async () => {
      return await base44.entities.DigitalProduct.filter({
        creator_email: currentUser.email
      });
    }
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['product-purchases', currentUser.email],
    queryFn: async () => {
      return await base44.entities.ContentPurchase.filter({
        seller_email: currentUser.email,
        content_type: 'digital_product'
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.DigitalProduct.create({
        ...data,
        creator_email: currentUser.email,
        creator_name: currentUser.full_name,
        sales_count: 0,
        rating: 5.0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['digital-products']);
      setShowModal(false);
      resetForm();
      toast.success("Product created!");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.DigitalProduct.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['digital-products']);
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      toast.success("Product updated!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.DigitalProduct.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['digital-products']);
      toast.success("Product deleted!");
    }
  });

  const resetForm = () => {
    setFormData({
      product_name: "",
      product_type: "preset",
      description: "",
      price: "",
      preview_images: [],
      download_url: "",
      file_size: "",
      compatible_software: "",
      tags: []
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setFormData({...formData, download_url: data.file_url, file_size: (file.size / 1024 / 1024).toFixed(2) + " MB"});
      toast.success("File uploaded!");
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setFormData({...formData, preview_images: [...formData.preview_images, data.file_url]});
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      product_name: product.product_name,
      product_type: product.product_type,
      description: product.description || "",
      price: product.price.toString(),
      preview_images: product.preview_images || [],
      download_url: product.download_url || "",
      file_size: product.file_size || "",
      compatible_software: product.compatible_software || "",
      tags: product.tags || []
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: parseFloat(formData.price)
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const productTypeIcons = {
    preset: Code,
    template: FileText,
    ebook: FileText,
    course: Package,
    asset: ImageIcon
  };

  const getProductSales = (productId) => {
    return purchases.filter(p => p.content_id === productId).length;
  };

  const getProductRevenue = (product) => {
    const sales = getProductSales(product.id);
    return (sales * product.price).toFixed(2);
  };

  const totalRevenue = products.reduce((sum, p) => {
    return sum + parseFloat(getProductRevenue(p));
  }, 0);

  const totalSales = products.reduce((sum, p) => {
    return sum + getProductSales(p.id);
  }, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Digital Products Store</h2>
          <div className="flex items-center gap-4 mt-2">
            <div className="text-sm text-gray-400">
              <span className="text-green-400 font-bold">${totalRevenue.toFixed(2)}</span> revenue
            </div>
            <div className="text-sm text-gray-400">
              <span className="text-blue-400 font-bold">{totalSales}</span> sales
            </div>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingProduct(null);
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-cyan-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Products Yet</h3>
            <p className="text-gray-400 mb-6">Start selling presets, templates, or digital content</p>
            <Button onClick={() => setShowModal(true)} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Add First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => {
            const Icon = productTypeIcons[product.product_type] || Package;
            const sales = getProductSales(product.id);
            const revenue = getProductRevenue(product);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all group">
                  {product.preview_images?.[0] && (
                    <div className="relative h-48 overflow-hidden rounded-t-xl">
                      <img
                        src={product.preview_images[0]}
                        alt={product.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-black/70 text-white">
                          {product.product_type}
                        </Badge>
                      </div>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold truncate">{product.product_name}</h3>
                        <p className="text-2xl font-bold text-green-400">${product.price}</p>
                      </div>
                    </div>

                    {product.description && (
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white/10 rounded-lg p-2">
                        <div className="text-gray-400 text-xs mb-1">Sales</div>
                        <div className="text-white font-bold">{sales}</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <div className="text-gray-400 text-xs mb-1">Revenue</div>
                        <div className="text-green-400 font-bold">${revenue}</div>
                      </div>
                    </div>

                    {/* Meta */}
                    {product.file_size && (
                      <div className="text-xs text-gray-500 mb-3">
                        {product.file_size} • {product.compatible_software}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="flex-1 bg-white/5 border-white/10 text-white"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${product.product_name}?`)) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                        className="bg-red-500/10 border-red-500/30 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl">
                {editingProduct ? "Edit Product" : "Add Digital Product"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Product Name</label>
                  <Input
                    value={formData.product_name}
                    onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                    placeholder="e.g., Lightroom Presets Pack"
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="29.99"
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Product Type</label>
                <Select value={formData.product_type} onValueChange={(val) => setFormData({...formData, product_type: val})}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preset">Preset / Filter Pack</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="ebook">E-Book / Guide</SelectItem>
                    <SelectItem value="course">Course / Tutorial</SelectItem>
                    <SelectItem value="asset">Digital Asset</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe what's included..."
                  className="bg-white/5 border-white/10 text-white h-24"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Compatible Software</label>
                  <Input
                    value={formData.compatible_software}
                    onChange={(e) => setFormData({...formData, compatible_software: e.target.value})}
                    placeholder="e.g., Lightroom, Photoshop"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">File Size</label>
                  <Input
                    value={formData.file_size}
                    onChange={(e) => setFormData({...formData, file_size: e.target.value})}
                    placeholder="Auto-filled on upload"
                    className="bg-white/5 border-white/10 text-white"
                    disabled
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Upload Product File</label>
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  className="bg-white/5 border-white/10 text-white"
                  disabled={uploading}
                />
                {formData.download_url && (
                  <p className="text-green-400 text-xs mt-1">✓ File uploaded</p>
                )}
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Preview Images</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="bg-white/5 border-white/10 text-white mb-2"
                  disabled={uploading}
                />
                {formData.preview_images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {formData.preview_images.map((img, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                        <img src={img} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            preview_images: formData.preview_images.filter((_, idx) => idx !== i)
                          })}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending || uploading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  {uploading ? "Uploading..." : editingProduct ? "Update Product" : "Add Product"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}