import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingBag, Download, DollarSign, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function DigitalGoodsStore({ currentUser, viewMode = "manage" }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    product_name: "",
    description: "",
    product_type: "other",
    price: 0,
    image_url: "",
    download_url: "",
    preview_url: "",
    tags: [],
    license_type: "personal"
  });

  const { data: products = [] } = useQuery({
    queryKey: ['digital-products', viewMode === "manage" ? currentUser?.email : null],
    queryFn: () => base44.entities.DigitalProduct.filter(
      viewMode === "manage" ? { creator_email: currentUser.email } : { is_available: true }
    ),
    enabled: !!currentUser
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DigitalProduct.create({ ...data, creator_email: currentUser.email }),
    onSuccess: () => {
      queryClient.invalidateQueries(['digital-products']);
      toast.success('Product added!');
      setShowModal(false);
      setForm({
        product_name: "",
        description: "",
        product_type: "other",
        price: 0,
        image_url: "",
        download_url: "",
        preview_url: "",
        tags: [],
        license_type: "personal"
      });
    }
  });

  const handleFileUpload = async (file, type) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === 'image') {
        setForm({...form, image_url: file_url});
      } else if (type === 'download') {
        setForm({...form, download_url: file_url});
      } else if (type === 'preview') {
        setForm({...form, preview_url: file_url});
      }
      toast.success('File uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const purchaseMutation = useMutation({
    mutationFn: async (product) => {
      const payment = await base44.integrations.Core.ProcessPayment({
        amount: product.price,
        recipient_email: product.creator_email,
        description: `Purchase: ${product.product_name}`
      });
      
      await base44.entities.DigitalProduct.update(product.id, {
        total_sales: (product.total_sales || 0) + 1,
        revenue: (product.revenue || 0) + product.price
      });

      return { payment, download_url: product.download_url };
    },
    onSuccess: (data) => {
      toast.success('Purchase successful! Downloading...');
      window.open(data.download_url, '_blank');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">
          {viewMode === "manage" ? "My Digital Products" : "Digital Store"}
        </h2>
        {viewMode === "manage" && (
          <Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {products.map(product => (
          <Card key={product.id} className="bg-white/5 border-white/10 overflow-hidden">
            <div className="relative h-48 bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
              {product.image_url ? (
                <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ShoppingBag className="w-16 h-16 text-white/40" />
                </div>
              )}
              <Badge className="absolute top-3 right-3 bg-emerald-500 text-white">
                ${product.price}
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="text-white font-bold mb-2">{product.product_name}</h3>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                  {product.product_type}
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                  {product.license_type}
                </Badge>
              </div>

              {viewMode === "manage" ? (
                <div className="text-gray-400 text-sm">
                  {product.total_sales || 0} sales • ${product.revenue || 0} revenue
                </div>
              ) : (
                <Button 
                  onClick={() => purchaseMutation.mutate(product)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Purchase & Download
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Add Digital Product</h3>

              <div className="space-y-4">
                <Input
                  placeholder="Product Name"
                  value={form.product_name}
                  onChange={(e) => setForm({...form, product_name: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Product Type</label>
                    <select
                      value={form.product_type}
                      onChange={(e) => setForm({...form, product_type: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="ebook">E-Book</option>
                      <option value="course">Course</option>
                      <option value="template">Template</option>
                      <option value="preset">Preset</option>
                      <option value="music">Music</option>
                      <option value="art">Art</option>
                      <option value="video">Video</option>
                      <option value="software">Software</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Price ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({...form, price: Number(e.target.value)})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files?.[0], 'image')}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('image-upload').click()}
                    disabled={uploading}
                    variant="outline"
                    className="w-full"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Image
                  </Button>
                  {form.image_url && <p className="text-green-400 text-sm mt-2">✓ Image uploaded</p>}
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Download File *</label>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e.target.files?.[0], 'download')}
                    className="hidden"
                    id="download-upload"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('download-upload').click()}
                    disabled={uploading}
                    variant="outline"
                    className="w-full"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload File
                  </Button>
                  {form.download_url && <p className="text-green-400 text-sm mt-2">✓ File uploaded</p>}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createMutation.mutate(form)} 
                    disabled={!form.product_name || !form.download_url || !form.price}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Add Product
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}