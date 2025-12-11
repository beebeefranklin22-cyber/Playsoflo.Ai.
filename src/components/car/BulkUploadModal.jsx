import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function BulkUploadModal({ open, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      // Upload CSV file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from CSV using AI
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              year: { type: "string" },
              make: { type: "string" },
              model: { type: "string" },
              color: { type: "string" },
              daily_rate: { type: "number" },
              description: { type: "string" },
              image_url: { type: "string" },
              seats: { type: "string" },
              transmission: { type: "string" },
              fuel_type: { type: "string" }
            }
          }
        }
      });

      if (extraction.status === "error") {
        toast.error(extraction.details || "Failed to process file");
        setLoading(false);
        return;
      }

      // Bulk create vehicles
      const vehicles = extraction.output.map(item => ({
        title: `${item.year} ${item.make} ${item.model}`,
        description: item.description || `${item.year} ${item.make} ${item.model}`,
        price: item.daily_rate,
        image_url: item.image_url || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800",
        category: "automotive",
        availability: "available",
        car_year: item.year,
        car_make: item.make,
        car_model: item.model,
        car_color: item.color,
        seats: item.seats || "5",
        transmission: item.transmission || "automatic",
        fuel_type: item.fuel_type || "gasoline",
        verified_provider: true
      }));

      await base44.entities.MarketplaceItem.bulkCreate(vehicles);

      setResults({
        success: vehicles.length,
        total: vehicles.length
      });

      toast.success(`Successfully added ${vehicles.length} vehicles!`);
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error("Failed to process bulk upload");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `year,make,model,color,daily_rate,description,image_url,seats,transmission,fuel_type
2024,Ferrari,488 Spider,Red,750,Luxury exotic sports car,https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800,2,manual,gasoline
2023,Lamborghini,Huracan,Yellow,850,High-performance supercar,https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800,2,automatic,gasoline`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fleet_template.csv';
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-green-400" />
              Bulk Upload Vehicles
            </DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-2">📋 How it works:</h3>
            <ol className="text-gray-300 text-sm space-y-1 ml-4 list-decimal">
              <li>Download the CSV template</li>
              <li>Fill in your vehicle information</li>
              <li>Upload the completed CSV file</li>
              <li>AI will process and add all vehicles</li>
            </ol>
          </div>

          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="w-full bg-white/5 border-white/20"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Upload CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0])}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
            />
            {file && (
              <p className="text-green-400 text-sm mt-2">
                ✓ {file.name} selected
              </p>
            )}
          </div>

          {results && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Upload Complete!</span>
              </div>
              <p className="text-gray-300 text-sm">
                Successfully added {results.success} out of {results.total} vehicles
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/5 border-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFileUpload}
              disabled={!file || loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? "Processing..." : <><Upload className="w-4 h-4 mr-2" />Upload & Process</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}