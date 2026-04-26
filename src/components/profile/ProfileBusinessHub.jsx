import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus, Trash2, Edit2, Upload, Store, Package, UtensilsCrossed,
  Tag, DollarSign, Image as ImageIcon, Loader2, X, Star, Check,
  ShoppingBag, ChevronDown, RefreshCw, Percent, Camera
} from "lucide-react";
import { toast } from "sonner";
import InventoryProductList from "../inventory/InventoryProductList";
import InventoryBulkImport from "../inventory/InventoryBulkImport";

// ─── Menu Item Form ─────────────────────────────────────────────────────────
const MENU_CATEGORIES = ["Appetizers", "Mains", "Sides", "Desserts", "Drinks", "Specials", "Breakfast", "Lunch", "Dinner", "Kids Menu", "Combos", "Vegan"];

function MenuItemForm({ item, currentUser, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: item?.name || "",
    category: item?.category || "",
    description: item?.description || "",
    image_url: item?.image_url || "",
    base_price: item?.base_price?.toString() || "",
    sale_price: item?.sale_price?.toString() || "",
    is_on_sale: item?.is_on_sale || false,
    is_featured: item?.is_featured || false,
    tags: (item?.tags || []).join(", "),
    stock_quantity: item?.stock_quantity?.toString() || "",
    track_inventory: item?.track_inventory ?? false,
    notes: item?.notes || "",
    store_type: "restaurant",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    if (!form.name || !form.base_price) { toast.error("Name and price are required"); return; }
    setSaving(true);
    const data = {
      ...form,
      owner_email: currentUser.email,
      provider_email: currentUser.email,
      store_type: "restaurant",
      base_price: parseFloat(form.base_price) || 0,
      sale_price: parseFloat(form.sale_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      status: "active",
    };
    try {
      if (item?.id) {
        await base44.entities.InventoryProduct.update(item.id, data);
      } else {
        await base44.entities.InventoryProduct.create(data);
      }
      toast.success(item ? "Menu item updated!" : "Menu item added!");
      onSaved();
    } catch (e) { toast.error("Failed to save: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg bg-gray-900 rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">{item ? "Edit Menu Item" : "Add Menu Item"}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Image */}
          <div className="flex items-center gap-4">
            {form.image_url
              ? <img src={form.image_url} className="w-24 h-24 object-cover rounded-xl border border-white/10" alt="" />
              : <div className="w-24 h-24 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center"><UtensilsCrossed className="w-8 h-8 text-gray-600" /></div>
            }
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              <div className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm flex items-center gap-2 transition">
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Upload Photo"}
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Item Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Grilled Salmon" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white">
                <option value="">Select category</option>
                {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the dish, ingredients, allergens..." rows={3}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:border-orange-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input type="number" step="0.01" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                  placeholder="0.00" className="bg-white/10 border-white/20 text-white pl-7" />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Deal / Sale Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input type="number" step="0.01" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))}
                  placeholder="0.00" className="bg-white/10 border-white/20 text-white pl-7" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_on_sale} onChange={e => setForm(f => ({ ...f, is_on_sale: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
              <span className="text-white text-sm flex items-center gap-1"><Percent className="w-3.5 h-3.5 text-orange-400" /> On Sale / Deal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="w-4 h-4 accent-yellow-500" />
              <span className="text-white text-sm">⭐ Featured item</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.track_inventory} onChange={e => setForm(f => ({ ...f, track_inventory: e.target.checked }))} className="w-4 h-4 accent-green-500" />
              <span className="text-white text-sm">Track quantity</span>
            </label>
          </div>

          {form.track_inventory && (
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Available Qty</label>
              <Input type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                placeholder="0" className="bg-white/10 border-white/20 text-white" />
            </div>
          )}

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Tags (comma separated — dietary, allergens, etc.)</label>
            <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="vegan, gluten-free, spicy, popular" className="bg-white/10 border-white/20 text-white" />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Internal Notes</label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Prep notes, supplier, storage..." className="bg-white/10 border-white/20 text-white" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-white/5 border-white/20 text-white">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : item ? "Update Item" : "Add to Menu"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Storefront Product Form ─────────────────────────────────────────────────
const STOREFRONT_CATEGORIES = ["Clothing", "Accessories", "Electronics", "Beauty", "Art", "Home Decor", "Jewelry", "Prints", "Digital", "Other"];

function StorefrontProductForm({ item, currentUser, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: item?.name || "",
    category: item?.category || "",
    description: item?.description || "",
    image_url: item?.image_url || "",
    base_price: item?.base_price?.toString() || "",
    sale_price: item?.sale_price?.toString() || "",
    cost_price: item?.cost_price?.toString() || "",
    is_on_sale: item?.is_on_sale || false,
    is_featured: item?.is_featured || false,
    tags: (item?.tags || []).join(", "),
    stock_quantity: item?.stock_quantity?.toString() || "",
    low_stock_threshold: item?.low_stock_threshold?.toString() || "5",
    reorder_quantity: item?.reorder_quantity?.toString() || "20",
    track_inventory: item?.track_inventory ?? true,
    allow_backorder: item?.allow_backorder || false,
    sku: item?.sku || "",
    variants: item?.variants || [],
    notes: item?.notes || "",
    store_type: "retail",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVariant, setNewVariant] = useState({ name: "", sku: "", price_modifier: 0, stock: 0 });

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
    setForm(f => ({ ...f, variants: [...f.variants, { ...newVariant, id: Date.now().toString() }] }));
    setNewVariant({ name: "", sku: "", price_modifier: 0, stock: 0 });
  };

  const handleSave = async () => {
    if (!form.name || !form.base_price) { toast.error("Name and price are required"); return; }
    setSaving(true);
    const data = {
      ...form,
      owner_email: currentUser.email,
      provider_email: currentUser.email,
      store_type: "retail",
      base_price: parseFloat(form.base_price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      sale_price: parseFloat(form.sale_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      reorder_quantity: parseInt(form.reorder_quantity) || 20,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      status: "active",
    };
    try {
      if (item?.id) {
        await base44.entities.InventoryProduct.update(item.id, data);
      } else {
        await base44.entities.InventoryProduct.create(data);
      }
      toast.success(item ? "Product updated!" : "Product added to storefront!");
      onSaved();
    } catch (e) { toast.error("Failed to save: " + e.message); }
    finally { setSaving(false); }
  };

  const margin = form.base_price && form.cost_price && parseFloat(form.cost_price) > 0
    ? (((parseFloat(form.base_price) - parseFloat(form.cost_price)) / parseFloat(form.base_price)) * 100).toFixed(1)
    : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">{item ? "Edit Product" : "Add Storefront Product"}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Image */}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Product Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Custom Hoodie" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">SKU / Barcode</label>
              <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                placeholder="e.g. HDY-BLK-M" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white">
              <option value="">Select category</option>
              {STOREFRONT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Product details, materials, sizing..." rows={3}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500" />
          </div>

          {/* Pricing */}
          <div>
            <p className="text-white font-semibold mb-2">Pricing</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Selling Price *</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input type="number" step="0.01" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} placeholder="0.00" className="bg-white/10 border-white/20 text-white pl-7" /></div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Your Cost</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} placeholder="0.00" className="bg-white/10 border-white/20 text-white pl-7" /></div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Sale Price</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input type="number" step="0.01" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} placeholder="0.00" className="bg-white/10 border-white/20 text-white pl-7" /></div>
              </div>
            </div>
            {margin && <p className="text-green-400 text-xs mt-1">Margin: {margin}% (+${(parseFloat(form.base_price) - parseFloat(form.cost_price)).toFixed(2)} profit)</p>}
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_on_sale} onChange={e => setForm(f => ({ ...f, is_on_sale: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
                <span className="text-white text-sm">On Sale</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="w-4 h-4 accent-yellow-500" />
                <span className="text-white text-sm">⭐ Featured</span>
              </label>
            </div>
          </div>

          {/* Inventory */}
          <div>
            <p className="text-white font-semibold mb-2">Inventory</p>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={form.track_inventory} onChange={e => setForm(f => ({ ...f, track_inventory: e.target.checked }))} className="w-4 h-4 accent-green-500" />
              <span className="text-white text-sm">Track inventory</span>
            </label>
            {form.track_inventory && (
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-gray-400 text-xs mb-1 block">Stock Qty</label>
                  <Input type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} placeholder="0" className="bg-white/10 border-white/20 text-white" /></div>
                <div><label className="text-gray-400 text-xs mb-1 block">Low Stock Alert</label>
                  <Input type="number" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} placeholder="5" className="bg-white/10 border-white/20 text-white" /></div>
                <div><label className="text-gray-400 text-xs mb-1 block">Reorder Qty</label>
                  <Input type="number" value={form.reorder_quantity} onChange={e => setForm(f => ({ ...f, reorder_quantity: e.target.value }))} placeholder="20" className="bg-white/10 border-white/20 text-white" /></div>
              </div>
            )}
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={form.allow_backorder} onChange={e => setForm(f => ({ ...f, allow_backorder: e.target.checked }))} className="w-4 h-4" />
              <span className="text-white text-sm">Allow backorders</span>
            </label>
          </div>

          {/* Variants (Size, Color, etc.) */}
          <div>
            <p className="text-white font-semibold mb-2">Variants (Size, Color, Style…)</p>
            <div className="space-y-2 mb-3">
              {form.variants.map((v, i) => (
                <div key={v.id || i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                    <span className="text-white font-medium">{v.name}</span>
                    <span className="text-gray-400">SKU: {v.sku || "—"}</span>
                    <span className="text-green-400">Stock: {v.stock}</span>
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              <Input placeholder="Name (e.g. Red M)" value={newVariant.name} onChange={e => setNewVariant(v => ({ ...v, name: e.target.value }))} className="col-span-2 bg-white/10 border-white/20 text-white text-sm" />
              <Input placeholder="SKU" value={newVariant.sku} onChange={e => setNewVariant(v => ({ ...v, sku: e.target.value }))} className="bg-white/10 border-white/20 text-white text-sm" />
              <Input type="number" placeholder="Stock" value={newVariant.stock} onChange={e => setNewVariant(v => ({ ...v, stock: parseInt(e.target.value) || 0 }))} className="bg-white/10 border-white/20 text-white text-sm" />
              <Button onClick={addVariant} size="sm" className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4" /></Button>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Tags (comma separated)</label>
            <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="handmade, limited edition, summer" className="bg-white/10 border-white/20 text-white" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-white/5 border-white/20 text-white">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : item ? "Update Product" : "Add to Storefront"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Menu Section ─────────────────────────────────────────────────────────────
function MenuSection({ currentUser }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterCat, setFilterCat] = useState("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["menu-items", currentUser?.email],
    queryFn: () => base44.entities.InventoryProduct.filter({ owner_email: currentUser.email, store_type: "restaurant" }),
    enabled: !!currentUser,
  });

  const cats = [...new Set(items.map(i => i.category).filter(Boolean))];
  const filtered = filterCat === "all" ? items : items.filter(i => i.category === filterCat);

  const handleDelete = async (id) => {
    if (!confirm("Delete this menu item?")) return;
    await base44.entities.InventoryProduct.delete(id);
    qc.invalidateQueries(["menu-items"]);
    toast.success("Deleted");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-bold text-lg">Restaurant Menu</h3>
          <span className="text-gray-500 text-sm">{items.length} items</span>
        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Menu Item
        </Button>
      </div>

      {cats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setFilterCat("all")} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${filterCat === "all" ? "bg-orange-500 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>All</button>
          {cats.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${filterCat === c ? "bg-orange-500 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>{c}</button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
          <UtensilsCrossed className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No menu items yet</p>
          <p className="text-gray-600 text-sm mb-6">Add your dishes with prices, photos, and deals</p>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add First Item
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/30 transition">
              {item.image_url
                ? <img src={item.image_url} alt={item.name} className="w-full h-40 object-cover" />
                : <div className="w-full h-40 bg-white/5 flex items-center justify-center"><UtensilsCrossed className="w-12 h-12 text-gray-600" /></div>
              }
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-white font-semibold">{item.name}</p>
                    {item.category && <p className="text-gray-500 text-xs">{item.category}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-bold">${item.base_price?.toFixed(2)}</p>
                    {item.is_on_sale && item.sale_price > 0 && (
                      <p className="text-orange-400 text-xs">Deal: ${item.sale_price?.toFixed(2)}</p>
                    )}
                  </div>
                </div>
                {item.description && <p className="text-gray-400 text-xs mb-2 line-clamp-2">{item.description}</p>}
                <div className="flex items-center gap-2 mb-3">
                  {item.is_featured && <span className="text-yellow-400 text-xs">⭐ Featured</span>}
                  {item.is_on_sale && <Badge className="bg-orange-500/20 text-orange-400 text-xs">Deal</Badge>}
                  {item.track_inventory && <span className="text-gray-500 text-xs">Qty: {item.stock_quantity}</span>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setEditItem(item); setShowForm(true); }} className="flex-1 text-blue-400 hover:bg-blue-500/10">
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <MenuItemForm
            item={editItem}
            currentUser={currentUser}
            onClose={() => { setShowForm(false); setEditItem(null); }}
            onSaved={() => { setShowForm(false); setEditItem(null); qc.invalidateQueries(["menu-items"]); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Storefront Section ───────────────────────────────────────────────────────
function StorefrontSection({ currentUser }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showBulk, setShowBulk] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["storefront-products", currentUser?.email],
    queryFn: () => base44.entities.InventoryProduct.filter({ owner_email: currentUser.email, store_type: "retail" }),
    enabled: !!currentUser,
  });

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await base44.entities.InventoryProduct.delete(id);
    qc.invalidateQueries(["storefront-products"]);
    toast.success("Deleted");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-bold text-lg">Digital Storefront</h3>
          <span className="text-gray-500 text-sm">{products.length} products</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulk(true)} className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
            <Upload className="w-4 h-4 mr-2" /> Bulk Import
          </Button>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
          <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No products yet</p>
          <p className="text-gray-600 text-sm mb-6">Upload products with pictures, prices, colors, sizes, and stock quantities</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setShowBulk(true)} variant="outline" className="border-purple-500/50 text-purple-300">
              <Upload className="w-4 h-4 mr-2" /> Bulk Import
            </Button>
            <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add First Product
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition">
              {p.image_url
                ? <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover" />
                : <div className="w-full h-40 bg-white/5 flex items-center justify-center"><ShoppingBag className="w-12 h-12 text-gray-600" /></div>
              }
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-white font-semibold">{p.name}</p>
                    {p.category && <p className="text-gray-500 text-xs">{p.category}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-bold">${p.base_price?.toFixed(2)}</p>
                    {p.is_on_sale && p.sale_price > 0 && <p className="text-orange-400 text-xs">Sale: ${p.sale_price?.toFixed(2)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {p.is_featured && <span className="text-yellow-400 text-xs">⭐</span>}
                  {p.is_on_sale && <Badge className="bg-orange-500/20 text-orange-400 text-xs">On Sale</Badge>}
                  {p.track_inventory && (
                    <span className={`text-xs ${p.stock_quantity === 0 ? "text-red-400" : p.stock_quantity <= (p.low_stock_threshold || 5) ? "text-yellow-400" : "text-green-400"}`}>
                      {p.stock_quantity === 0 ? "Out of stock" : `${p.stock_quantity} in stock`}
                    </span>
                  )}
                </div>
                {p.variants?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {p.variants.slice(0, 3).map((v, i) => (
                      <span key={i} className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{v.name}</span>
                    ))}
                    {p.variants.length > 3 && <span className="text-xs text-gray-500">+{p.variants.length - 3} more</span>}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setEditItem(p); setShowForm(true); }} className="flex-1 text-blue-400 hover:bg-blue-500/10">
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <StorefrontProductForm
            item={editItem}
            currentUser={currentUser}
            onClose={() => { setShowForm(false); setEditItem(null); }}
            onSaved={() => { setShowForm(false); setEditItem(null); qc.invalidateQueries(["storefront-products"]); }}
          />
        )}
      </AnimatePresence>

      {showBulk && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setShowBulk(false)}
        >
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="w-full max-w-3xl bg-gray-900 rounded-3xl p-6 my-8 relative"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { setShowBulk(false); qc.invalidateQueries(["storefront-products"]); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
            <InventoryBulkImport currentUser={currentUser} />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Store Identity Section ───────────────────────────────────────────────────
function StoreIdentityForm({ currentUser, storeType }) {
  const key = storeType === "restaurant" ? "restaurant_profile" : "storefront_profile";
  const existing = currentUser?.[key] || {};
  const [form, setForm] = useState({
    name: existing.name || "",
    bio: existing.bio || "",
    cover_url: existing.cover_url || "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, cover_url: file_url }));
      toast.success("Cover uploaded!");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Store name is required"); return; }
    setSaving(true);
    try {
      await base44.auth.updateMe({ [key]: form });
      toast.success("Store info saved!");
    } catch (e) { toast.error("Failed: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
      {/* Cover photo */}
      <div className="relative h-32">
        {form.cover_url
          ? <img src={form.cover_url} className="w-full h-full object-cover" alt="cover" />
          : <div className="w-full h-full bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-white/30" />
            </div>
        }
        <label className="absolute bottom-2 right-2 cursor-pointer bg-black/60 hover:bg-black/80 px-3 py-1.5 rounded-full text-white text-xs flex items-center gap-1 transition">
          <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Uploading..." : "Change Cover"}
        </label>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-gray-400 text-xs mb-1 block">{storeType === "restaurant" ? "Restaurant" : "Store"} Name *</label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder={storeType === "restaurant" ? "e.g. My Kitchen" : "e.g. My Boutique"}
            className="bg-white/10 border-white/20 text-white" />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Short Description</label>
          <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            placeholder={storeType === "restaurant" ? "Cuisine type, hours, vibe..." : "What you sell, your brand story..."}
            rows={2} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500" />
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
          {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Saving...</> : "Save Store Info"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main ProfileBusinessHub Component ────────────────────────────────────────
export default function ProfileBusinessHub({ currentUser }) {
  const [activeSection, setActiveSection] = useState("menu");

  const sections = [
    { id: "menu", label: "Restaurant Menu", icon: UtensilsCrossed, color: "from-orange-500 to-red-500" },
    { id: "storefront", label: "Digital Storefront", icon: ShoppingBag, color: "from-purple-500 to-pink-500" },
    { id: "inventory", label: "Inventory Manager", icon: Package, color: "from-blue-500 to-cyan-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Section Picker */}
      <div className="grid grid-cols-3 gap-3">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${activeSection === s.id ? "border-white/30 bg-white/10 scale-[1.02]" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xs font-medium text-center ${activeSection === s.id ? "text-white" : "text-gray-400"}`}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Active Section */}
      {activeSection === "menu" && (
        <>
          <StoreIdentityForm currentUser={currentUser} storeType="restaurant" />
          <MenuSection currentUser={currentUser} />
        </>
      )}
      {activeSection === "storefront" && (
        <>
          <StoreIdentityForm currentUser={currentUser} storeType="retail" />
          <StorefrontSection currentUser={currentUser} />
        </>
      )}
      {activeSection === "inventory" && <InventoryProductList currentUser={currentUser} />}
    </div>
  );
}