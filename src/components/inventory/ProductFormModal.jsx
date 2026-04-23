import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

const STORE_CATEGORIES = {
  restaurant: ["Appetizers", "Mains", "Sides", "Desserts", "Drinks", "Specials"],
  retail: ["Electronics", "Home & Garden", "Sports", "Toys", "Books", "Office"],
  clothing: ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories", "Underwear"],
  grocery: ["Produce", "Dairy", "Meat & Seafood", "Bakery", "Frozen", "Snacks", "Beverages", "Pantry"],
  convenience: ["Snacks", "Beverages", "Personal Care", "Household", "Tobacco", "Lottery"],
  electronics: ["Phones", "Computers", "Audio", "TV & Video", "Cameras", "Accessories"],
  beauty: ["Skincare", "Haircare", "Makeup", "Fragrance", "Nails", "Tools"],
  general: ["Category 1", "Category 2", "Category 3", "Other"],
};

const emptyForm = {
  name: "", sku: "", category: "", subcategory: "", description: "", image_url: "",
  base_price: "", cost_price: "", sale_price: "", is_on_sale: false,
  stock_quantity: "", low_stock_threshold: "5", reorder_quantity: "20",
  supplier_name: "", supplier_contact: "", track_inventory: true,
  allow_backorder: false, is_featured: false, notes: "", tags: "",
  variants: [], store_type: "general"
};

export default function ProductFormModal({ product, preFillSku, currentUser, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVariant, setNewVariant] = useState({ name: "", sku: "", price_modifier: 0, stock: 0, low_stock_threshold: 5 });

  useEffect(() => {
    if (product) {
      setForm({
        ...emptyForm,
        ...product,
        tags: (product.tags || []).join(", "),
        base_price: product.base_price?.toString() || "",
        cost_price: product.cost_price?.toString() || "",
        sale_price: product.sale_price?.toString() || "",
        stock_quantity: product.stock_quantity?.toString() || "",
        low_stock_threshold: product.low_stock_threshold?.toString() || "5",
        reorder_quantity: product.reorder_quantity?.toString() || "20",
        variants: product.variants || [],
      });
    } else if (preFillSku) {
      setForm({ ...emptyForm, sku: preFillSku });
    }
  }, [product, preFillSku]);

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, image_url: file_url }));
      toast.success("Image uploaded!");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const addVariant = () => {
    if (!newVariant.name) return;
    const v = { ...newVariant, id: Date.now().toString() };
    setForm(f => ({ ...f, variants: [...f.variants, v] }));
    setNewVariant({ name: "", sku: "", price_modifier: 0, stock: 0, low_stock_threshold: 5 });
  };

  const removeVariant = (id) => setForm(f => ({ ...f, variants: f.variants.filter(v => v.id !== id) }));

  const handleSave = async () => {
    if (!form.name || !form.base_price) { toast.error("Name and price are required"); return; }
    setSaving(true);
    const data = {
      ...form,
      owner_email: currentUser.email,
      base_price: parseFloat(form.base_price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      sale_price: parseFloat(form.sale_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      reorder_quantity: parseInt(form.reorder_quantity) || 20,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };
    try {
      if (product?.id) {
        await base44.entities.InventoryProduct.update(product.id, data);
      } else {
        await base44.entities.InventoryProduct.create(data);
      }
      toast.success(product ? "Product updated!" : "Product added!");
      onSaved();
    } catch (e) { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const cats = STORE_CATEGORIES[form.store_type] || STORE_CATEGORIES.general;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">{product ? "Edit Product" : "Add New Product"}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Image */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Product Image</label>
            <div className="flex items-center gap-4">
              {form.image_url
                ? <img src={form.image_url} className="w-24 h-24 object-cover rounded-xl border border-white/10" alt="" />
                : <div className="w-24 h-24 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center"><Package className="w-8 h-8 text-gray-600" /></div>
              }
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                <div className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm flex items-center gap-2 transition">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Photo"}
                </div>
              </label>
            </div>
          </div>

          {/* Store Type */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Store Type</label>
            <select value={form.store_type} onChange={e => setForm(f => ({ ...f, store_type: e.target.value, category: "" }))}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white">
              {["restaurant","retail","clothing","grocery","convenience","electronics","beauty","general"].map(t =>
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              )}
            </select>
          </div>

          {/* Name & SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Product Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Blue Denim Jeans" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">SKU / Barcode</label>
              <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                placeholder="e.g. JNS-001" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white">
                <option value="">Select category</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Subcategory</label>
              <Input value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                placeholder="Optional" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Product details..." rows={3}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500" />
          </div>

          {/* Pricing */}
          <div>
            <p className="text-white font-semibold mb-3">Pricing</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Selling Price *</label>
                <Input type="number" step="0.01" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                  placeholder="$0.00" className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Your Cost</label>
                <Input type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))}
                  placeholder="$0.00" className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Sale Price</label>
                <Input type="number" step="0.01" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))}
                  placeholder="$0.00" className="bg-white/10 border-white/20 text-white" />
              </div>
            </div>
            {form.base_price && form.cost_price && parseFloat(form.cost_price) > 0 && (
              <p className="text-green-400 text-xs mt-1">
                Margin: {(((parseFloat(form.base_price) - parseFloat(form.cost_price)) / parseFloat(form.base_price)) * 100).toFixed(1)}%
                &nbsp;(+${(parseFloat(form.base_price) - parseFloat(form.cost_price)).toFixed(2)} profit)
              </p>
            )}
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={form.is_on_sale} onChange={e => setForm(f => ({ ...f, is_on_sale: e.target.checked }))} className="w-4 h-4" />
              <span className="text-white text-sm">Mark as On Sale</span>
            </label>
          </div>

          {/* Inventory */}
          <div>
            <p className="text-white font-semibold mb-3">Inventory</p>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={form.track_inventory} onChange={e => setForm(f => ({ ...f, track_inventory: e.target.checked }))} className="w-4 h-4" />
              <span className="text-white text-sm">Track inventory for this product</span>
            </label>
            {form.track_inventory && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Stock Qty</label>
                  <Input type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                    placeholder="0" className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Low Stock Alert</label>
                  <Input type="number" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))}
                    placeholder="5" className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Reorder Qty</label>
                  <Input type="number" value={form.reorder_quantity} onChange={e => setForm(f => ({ ...f, reorder_quantity: e.target.value }))}
                    placeholder="20" className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={form.allow_backorder} onChange={e => setForm(f => ({ ...f, allow_backorder: e.target.checked }))} className="w-4 h-4" />
              <span className="text-white text-sm">Allow backorders (sell when out of stock)</span>
            </label>
          </div>

          {/* Variants */}
          <div>
            <p className="text-white font-semibold mb-3">Variants (Size, Color, Flavor, etc.)</p>
            <div className="space-y-2 mb-3">
              {form.variants.map(v => (
                <div key={v.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                    <span className="text-white font-medium">{v.name}</span>
                    <span className="text-gray-400">SKU: {v.sku || "—"}</span>
                    <span className="text-green-400">Stock: {v.stock}</span>
                  </div>
                  <button onClick={() => removeVariant(v.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              <Input placeholder="Name (e.g. XL Red)" value={newVariant.name} onChange={e => setNewVariant(v => ({ ...v, name: e.target.value }))}
                className="col-span-2 bg-white/10 border-white/20 text-white text-sm" />
              <Input placeholder="SKU" value={newVariant.sku} onChange={e => setNewVariant(v => ({ ...v, sku: e.target.value }))}
                className="bg-white/10 border-white/20 text-white text-sm" />
              <Input type="number" placeholder="Stock" value={newVariant.stock} onChange={e => setNewVariant(v => ({ ...v, stock: parseInt(e.target.value) || 0 }))}
                className="bg-white/10 border-white/20 text-white text-sm" />
              <Button onClick={addVariant} size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Supplier */}
          <div>
            <p className="text-white font-semibold mb-3">Supplier (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <Input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}
                placeholder="Supplier name" className="bg-white/10 border-white/20 text-white" />
              <Input value={form.supplier_contact} onChange={e => setForm(f => ({ ...f, supplier_contact: e.target.value }))}
                placeholder="Phone or email" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          {/* Tags & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Tags (comma separated)</label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="organic, summer, sale" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Internal Notes</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Storage location, etc." className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          {/* Feature toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="w-4 h-4" />
            <span className="text-white text-sm">⭐ Feature this product (show at top)</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-white/5 border-white/20 text-white">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold">
              {saving ? "Saving..." : product ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}