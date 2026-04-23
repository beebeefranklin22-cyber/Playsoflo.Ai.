import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle, AlertTriangle, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const CSV_TEMPLATE = `name,sku,category,description,base_price,cost_price,stock_quantity,low_stock_threshold,reorder_quantity,supplier_name,supplier_contact,tags
Blue Denim Jeans,JNS-001,Clothing,Classic slim fit jeans,49.99,18.00,50,10,30,Denim Co,supplier@example.com,"denim,jeans,sale"
Red T-Shirt,TSH-002,Clothing,100% cotton tee,19.99,6.00,100,15,50,Cotton World,info@cotton.com,"shirt,cotton"
Organic Apples,APL-003,Produce,Fresh organic apples per lb,3.99,1.50,200,30,100,Fresh Farm,farm@fresh.com,"organic,fruit"`;

export default function InventoryBulkImport({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ success: 0, failed: 0 });

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    return lines.slice(1).map((line, i) => {
      // Handle quoted fields with commas
      const cols = [];
      let cur = "", inQ = false;
      for (let ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      cols.push(cur.trim());
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = cols[idx] || ""; });
      return { ...obj, _row: i + 2 };
    });
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        const errs = [];
        parsed.forEach(r => {
          if (!r.name) errs.push(`Row ${r._row}: Missing product name`);
          if (!r.base_price || isNaN(parseFloat(r.base_price))) errs.push(`Row ${r._row}: Invalid price`);
        });
        setRows(parsed);
        setErrors(errs);
        setDone(false);
      } catch {
        toast.error("Failed to parse CSV. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of rows) {
      try {
        await base44.entities.InventoryProduct.create({
          owner_email: currentUser.email,
          name: row.name,
          sku: row.sku || "",
          category: row.category || "",
          description: row.description || "",
          base_price: parseFloat(row.base_price) || 0,
          cost_price: parseFloat(row.cost_price) || 0,
          stock_quantity: parseInt(row.stock_quantity) || 0,
          low_stock_threshold: parseInt(row.low_stock_threshold) || 5,
          reorder_quantity: parseInt(row.reorder_quantity) || 20,
          supplier_name: row.supplier_name || "",
          supplier_contact: row.supplier_contact || "",
          tags: row.tags ? row.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
          status: "active",
          track_inventory: true,
          store_type: "general",
          variants: [],
        });
        success++;
      } catch {
        failed++;
      }
    }
    setStats({ success, failed });
    setDone(true);
    setImporting(false);
    if (success > 0) toast.success(`${success} products imported!`);
    if (failed > 0) toast.error(`${failed} products failed to import.`);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "inventory_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-white font-semibold text-lg mb-2">Bulk Import Products</h3>
        <p className="text-gray-400 text-sm mb-6">Upload a CSV file to add many products at once. Perfect for large catalogs, clothing lines, grocery inventory, etc.</p>

        {/* Step 1 */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">1</div>
          <div className="flex-1">
            <p className="text-white font-medium mb-2">Download the template</p>
            <p className="text-gray-400 text-sm mb-3">Fill it in with your product data in Excel, Google Sheets, or any spreadsheet app.</p>
            <Button onClick={downloadTemplate} variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Download className="w-4 h-4 mr-2" /> Download CSV Template
            </Button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">2</div>
          <div className="flex-1">
            <p className="text-white font-medium mb-2">Upload your filled CSV</p>
            <label className="cursor-pointer block">
              <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
              <div className="border-2 border-dashed border-white/20 hover:border-purple-500/60 rounded-xl p-8 text-center transition">
                <Upload className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                <p className="text-white font-medium">Click to upload CSV</p>
                <p className="text-gray-500 text-sm">or drag and drop your file here</p>
              </div>
            </label>
          </div>
        </div>

        {/* Preview */}
        <AnimatePresence>
          {rows.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                  <p className="text-red-400 font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {errors.length} issue{errors.length !== 1 ? "s" : ""} found</p>
                  {errors.map((e, i) => <p key={i} className="text-red-300 text-sm">{e}</p>)}
                </div>
              )}

              {/* Preview Table */}
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-4">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <p className="text-white font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-purple-400" /> {rows.length} products ready to import</p>
                  <button onClick={() => { setRows([]); setErrors([]); setDone(false); }} className="text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {rows.slice(0, 10).map((r, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-2 border-b border-white/5 last:border-0 text-sm">
                      <span className="text-gray-500 w-6">{i + 1}</span>
                      <span className="text-white flex-1 truncate">{r.name}</span>
                      <span className="text-gray-400">{r.sku || "—"}</span>
                      <span className="text-purple-400">${r.base_price}</span>
                      <span className="text-green-400">{r.stock_quantity} units</span>
                    </div>
                  ))}
                  {rows.length > 10 && <p className="text-gray-500 text-sm px-4 py-2">...and {rows.length - 10} more</p>}
                </div>
              </div>

              {/* Import Button */}
              {!done ? (
                <Button onClick={handleImport} disabled={importing || errors.length > 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold h-12">
                  {importing ? `Importing... (this may take a moment)` : `Import ${rows.length} Products`}
                </Button>
              ) : (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-white font-semibold">{stats.success} products imported successfully!</p>
                  {stats.failed > 0 && <p className="text-red-400 text-sm">{stats.failed} failed</p>}
                  <Button onClick={() => { setRows([]); setErrors([]); setDone(false); }} variant="outline"
                    className="mt-3 border-white/20 text-white hover:bg-white/10">Import Another File</Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Format Guide */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <p className="text-white font-semibold mb-3">CSV Column Reference</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {[
            ["name *", "Product name (required)"],
            ["sku", "Barcode or SKU code"],
            ["category", "e.g. Clothing, Produce"],
            ["description", "Short product description"],
            ["base_price *", "Selling price (required)"],
            ["cost_price", "Your cost / wholesale price"],
            ["stock_quantity", "Starting stock count"],
            ["low_stock_threshold", "Alert when below this qty"],
            ["reorder_quantity", "Suggested reorder amount"],
            ["supplier_name", "Supplier or vendor name"],
            ["supplier_contact", "Phone or email"],
            ["tags", "Comma-separated tags"],
          ].map(([col, desc]) => (
            <div key={col} className="flex gap-2">
              <code className="text-purple-400 text-xs bg-purple-500/10 px-2 py-0.5 rounded">{col}</code>
              <span className="text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}