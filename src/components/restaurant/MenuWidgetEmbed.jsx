import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Code, Copy, ExternalLink, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function MenuWidgetEmbed({ restaurant, onClose }) {
  const [copied, setCopied] = useState(false);
  const [csvData, setCsvData] = useState('');
  
  const widgetCode = `<iframe 
  src="${window.location.origin}${'/widget/menu/' + restaurant.id}" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: 2px solid #e5e7eb; border-radius: 12px;"
></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    toast.success('Widget code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCSVImport = async () => {
    if (!csvData.trim()) {
      toast.error('Please paste CSV data');
      return;
    }

    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const items = lines.slice(1).map(line => {
        const values = line.split(',');
        const item = {};
        headers.forEach((header, idx) => {
          const value = values[idx]?.trim();
          if (header === 'price' || header === 'calories') {
            item[header] = parseFloat(value) || 0;
          } else if (header === 'is_available') {
            item[header] = value?.toLowerCase() === 'true';
          } else {
            item[header] = value || '';
          }
        });
        item.restaurant_id = restaurant.id;
        return item;
      });

      toast.success(`Ready to import ${items.length} items!`);
      // You can add bulk create here
    } catch (error) {
      toast.error('Invalid CSV format');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-orange-900/90 to-red-900/90 backdrop-blur-xl rounded-3xl border-2 border-orange-500/50 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-orange-900/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Code className="w-8 h-8 text-orange-400" />
            <h2 className="text-3xl font-black text-white">Menu Widget & Import</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Embed Code */}
          <div>
            <h3 className="text-xl font-bold text-white mb-3">Embed Your Menu</h3>
            <p className="text-gray-300 mb-4 text-sm">Copy this code and paste it into your website to display your menu:</p>
            
            <div className="bg-black/40 rounded-xl p-4 mb-3 border border-white/20">
              <pre className="text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap">{widgetCode}</pre>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopy} className="flex-1 bg-orange-600 hover:bg-orange-700">
                {copied ? <Check className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </Button>
              <Button 
                onClick={() => window.open(`/widget/menu/${restaurant.id}`, '_blank')}
                variant="outline"
                className="bg-white/10 border-white/20"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Preview
              </Button>
            </div>
          </div>

          {/* CSV Import */}
          <div className="border-t border-white/20 pt-6">
            <h3 className="text-xl font-bold text-white mb-3">Quick Menu Import (CSV)</h3>
            <p className="text-gray-300 mb-4 text-sm">Paste CSV data with columns: name, description, price, category, is_available</p>
            
            <Textarea
              placeholder="name,description,price,category,is_available
Burger,Classic beef burger,12.99,mains,true
Fries,Crispy golden fries,4.99,sides,true"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              className="bg-black/40 border-white/20 text-white font-mono text-sm h-48"
            />

            <Button onClick={handleCSVImport} className="w-full mt-3 bg-green-600 hover:bg-green-700">
              Import Menu Items
            </Button>
          </div>

          {/* Direct Link */}
          <div className="border-t border-white/20 pt-6">
            <h3 className="text-xl font-bold text-white mb-3">Direct Menu Link</h3>
            <p className="text-gray-300 mb-4 text-sm">Share this link with customers to view your menu directly:</p>
            
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/menu/${restaurant.id}`}
                className="bg-black/40 border-white/20 text-white"
              />
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/menu/${restaurant.id}`);
                  toast.success('Link copied!');
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Copy className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}