import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, DollarSign, Package } from "lucide-react";
import { toast } from "sonner";

export default function DigitalProductsManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    digital_product_type: "preset",
    price_usd: 0,
    download_url: "",
    file_format: "",
    instant_download: true,
    license_type: "personal"
  });

  const { data: products = [] } = useQuery({
    queryKey: ['digital-products', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.CreatorProduct.filter({
        created_by: currentUser.email,
        type: 'digital_product'
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const createProductMutation = useMutation({
    mutationFn: (data) => base44.entities.CreatorProduct.create({
      ...data,
      type: 'digital_product'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-products'] });
      setShowCreate(false);
      setProductForm({
        title: "",
        description: "",
        digital_product_type: "preset",
        price_usd: 0,
        download_url: "",
        file_format: "",
        instant_download: true,
        license_type: "personal"
      });
      toast.success('Digital product created!');
    }
  });

  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProductForm({ ...productForm, download_url: file_url });
      toast.success('File uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  const licenseColors = {
    personal: 'bg-blue-500/20 text-blue-300',
    commercial: 'bg-green-500/20 text-green-300',
    extended: 'bg-purple-500/20 text-purple-300'
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Digital Products
          </CardTitle>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600"
          >
            + New Product
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showCreate && (
          <div className="mb-6 p-4 bg-white/10 rounded-xl border border-white/20 space-y-4">
            <Input
              placeholder="Product Title"
              value={productForm.title}
              onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />

            <Select
              value={productForm.digital_product_type}
              onValueChange={(v) => setProductForm({ ...productForm, digital_product_type: v })}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preset">Preset/Filter</SelectItem>
                <SelectItem value="template">Template</SelectItem>
                <SelectItem value="guide">Guide/Ebook</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="music">Music/Audio</SelectItem>
                <SelectItem value="photo_pack">Photo Pack</SelectItem>
                <SelectItem value="video_tutorial">Video Tutorial</SelectItem>
                <SelectItem value="plugin">Plugin/Software</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Description"
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Price (USD)"
                value={productForm.price_usd}
                onChange={(e) => setProductForm({ ...productForm, price_usd: Number(e.target.value) })}
                className="bg-white/10 border-white/20 text-white"
              />

              <Select
                value={productForm.license_type}
                onValueChange={(v) => setProductForm({ ...productForm, license_type: v })}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Use</SelectItem>
                  <SelectItem value="commercial">Commercial Use</SelectItem>
                  <SelectItem value="extended">Extended License</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('product-file-upload').click()}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                {productForm.download_url ? 'File Uploaded' : 'Upload File'}
              </Button>
              <Input
                id="product-file-upload"
                type="file"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                className="hidden"
              />
            </div>

            <Button
              onClick={() => createProductMutation.mutate(productForm)}
              disabled={!productForm.title || !productForm.download_url}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Create Product
            </Button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {products.map(product => (
            <div key={product.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-start justify-between mb-2">
                <Badge className="bg-indigo-500/20 text-indigo-300 capitalize">
                  {product.digital_product_type?.replace('_', ' ')}
                </Badge>
                <Badge className={licenseColors[product.license_type]}>
                  {product.license_type}
                </Badge>
              </div>
              <h3 className="text-white font-bold mb-1">{product.title}</h3>
              <p className="text-gray-400 text-sm mb-3">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-green-400 font-bold text-xl">${product.price_usd}</span>
                <Badge className="bg-blue-500/20 text-blue-300">
                  {product.sales_count || 0} sales
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}