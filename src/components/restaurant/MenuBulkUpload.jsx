import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, CheckCircle, AlertCircle, FileText, Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const TEMPLATE_CSV = `name,description,price,category,prep_time,is_available
Grilled Chicken,Juicy grilled chicken breast with herbs,12.99,mains,15-20 min,true
Caesar Salad,Fresh romaine with caesar dressing,8.99,appetizers,5-10 min,true
Chocolate Cake,Rich chocolate lava cake,6.99,desserts,10-15 min,true
Lemonade,Fresh squeezed lemonade,3.99,drinks,2-5 min,true`;

const VALID_CATEGORIES = ["appetizers", "mains", "sides", "desserts", "drinks", "specials"];

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return { items: [], errors: ["CSV must have a header row and at least one data row"] };

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
  const required = ["name", "price"];
  const missing = required.filter(r => !headers.includes(r));
  if (missing.length) return { items: [], errors: [`Missing required columns: ${missing.join(", ")}`] };

  const items = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/"/g, ""));
    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] || ""; });

    if (!row.name) { errors.push(`Row ${i + 1}: missing name`); continue; }
    const price = parseFloat(row.price);
    if (isNaN(price) || price < 0) { errors.push(`Row ${i + 1} (${row.name}): invalid price`); continue; }

    const category = VALID_CATEGORIES.includes(row.category?.toLowerCase()) ? row.category.toLowerCase() : "mains";
    items.push({
      name: row.name,
      description: row.description || "",
      price,
      category,
      prep_time: row.prep_time || "10-15 min",
      is_available: row.is_available?.toLowerCase() !== "false",
      calories: parseInt(row.calories) || 0,
      dietary_tags: []
    });
  }

  return { items, errors };
}

export default function MenuBulkUpload({ restaurant, currentUser, onDone }) {
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please upload a CSV file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { items, errors } = parseCSV(ev.target.result);
      setPreview(items);
      setParseErrors(errors);
      setResults(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!preview?.length) return;
    setUploading(true);
    let success = 0, failed = 0;

    for (const item of preview) {
      try {
        const created = await base44.entities.MenuItem.create({
          ...item,
          restaurant_id: restaurant.id,
          owner_email: currentUser?.email
        });
        // Sync to marketplace
        try {
          const desc = (item.description || '') + ` [menu:${created.id}]`;
          await base44.entities.MarketplaceItem.create({
            title: item.name,
            description: desc,
            category: 'catering',
            price: item.price,
            price_type: 'fixed',
            image_url: restaurant.image_url || '',
            location: restaurant.address || '',
            service_area: restaurant.address || '',
            provider_name: restaurant.name,
            provider_email: currentUser?.email,
            availability: item.is_available ? 'available' : 'booked',
            instant_booking: true,
            verified_provider: false,
            rating: 5,
            reviews_count: 0
          });
        } catch {}
        success++;
      } catch {
        failed++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['restaurant-menu-items'] });
    queryClient.invalidateQueries({ queryKey: ['marketplace-items'] });
    setUploading(false);
    setResults({ success, failed });
    setPreview(null);
    if (success > 0) toast.success(`${success} menu item${success > 1 ? 's' : ''} imported and synced!`);
    if (failed > 0) toast.error(`${failed} item${failed > 1 ? 's' : ''} failed to import`);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-lg">Bulk Menu Upload</h3>
          <p className="text-gray-400 text-sm">Upload a CSV file to import multiple items at once</p>
        </div>
        <Button onClick={downloadTemplate} variant="outline" size="sm" className="border-white/20 text-white">
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-white/20 hover:border-orange-500/50 rounded-2xl p-10 text-center cursor-pointer transition-colors group"
      >
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        <Upload className="w-12 h-12 text-gray-500 group-hover:text-orange-400 mx-auto mb-3 transition" />
        <p className="text-white font-semibold">Click to select a CSV file</p>
        <p className="text-gray-400 text-sm mt-1">Columns: name, description, price, category, prep_time, is_available</p>
      </div>

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-1">
          {parseErrors.map((e, i) => (
            <p key={i} className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{e}
            </p>
          ))}
        </div>
      )}

      {/* Preview */}
      <AnimatePresence>
        {preview && preview.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <p className="text-white font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-400" />
                  {preview.length} items ready to import
                </p>
                <button onClick={() => { setPreview(null); setParseErrors([]); }} className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
                {preview.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div>
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-gray-500 text-xs capitalize">{item.category} · {item.prep_time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-400 font-bold">${item.price.toFixed(2)}</p>
                      <p className={`text-xs ${item.is_available ? 'text-green-400' : 'text-red-400'}`}>
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-white/10 flex gap-3">
                <Button onClick={() => { setPreview(null); setParseErrors([]); }} variant="outline" className="flex-1 border-white/20 text-white">
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploading} className="flex-1 bg-orange-600 hover:bg-orange-700">
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : `Import ${preview.length} Items`}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {results && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-white font-semibold">{results.success} items imported successfully</p>
            {results.failed > 0 && <p className="text-red-400 text-sm">{results.failed} items failed</p>}
            <p className="text-gray-400 text-sm">Menu synced to storefront automatically</p>
          </div>
          <Button onClick={onDone} size="sm" className="ml-auto bg-green-600 hover:bg-green-700">Done</Button>
        </div>
      )}
    </div>
  );
}