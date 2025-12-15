import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Download, CheckCircle, AlertCircle, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function BulkPropertyUpload({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
    } else {
      toast.error('Please upload a CSV file');
    }
  };

  const downloadTemplate = () => {
    const template = `title,property_type,listing_type,description,price_per_night,price_per_month,sale_price,bedrooms,bathrooms,square_feet,location,address,amenities,images,minimum_stay
Luxury Beach Villa,villa,short_term,Beautiful oceanfront property,450,,,,5,3,3500,Miami Beach FL,123 Ocean Drive,"pool,gym,wifi,parking","https://example.com/img1.jpg,https://example.com/img2.jpg",2
Downtown Condo,condo,for_rent,,,,2500,2,2,1200,Miami FL,456 Downtown St,"gym,parking,wifi",https://example.com/img3.jpg,
Office Space,commercial,for_sale,,,500000,,,,5000,Miami FL,789 Business Blvd,"parking,elevator",https://example.com/img4.jpg,`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'property_template.csv';
    a.click();
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      
      const properties = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',');
          const property = {};
          
          headers.forEach((header, idx) => {
            const value = values[idx]?.trim();
            if (value) {
              if (header === 'amenities' || header === 'images') {
                property[header] = value.split('|').map(v => v.trim());
              } else if (['price_per_night', 'price_per_month', 'sale_price', 'bedrooms', 'bathrooms', 'square_feet', 'minimum_stay'].includes(header)) {
                property[header] = value ? parseFloat(value) : undefined;
              } else {
                property[header] = value;
              }
            }
          });

          if (property.title && property.property_type && property.listing_type) {
            properties.push(property);
          } else {
            errors.push({ line: i + 1, error: 'Missing required fields' });
          }
        } catch (err) {
          errors.push({ line: i + 1, error: err.message });
        }
      }

      // Bulk create
      const created = [];
      for (const prop of properties) {
        try {
          const result = await base44.entities.Property.create(prop);
          created.push(result);
        } catch (err) {
          errors.push({ property: prop.title, error: err.message });
        }
      }

      setResults({ created: created.length, errors });
      queryClient.invalidateQueries(['properties']);
      
      if (created.length > 0) {
        toast.success(`✅ ${created.length} properties uploaded!`);
      }
      if (errors.length > 0) {
        toast.error(`⚠️ ${errors.length} errors occurred`);
      }
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <Card className="w-full max-w-2xl bg-gray-900 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Bulk Property Upload</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-300 text-sm mb-3">
                📝 Upload multiple properties at once using a CSV file
              </p>
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white font-semibold mb-2">
                  {file ? file.name : 'Click to upload CSV'}
                </p>
                <p className="text-gray-400 text-sm">CSV files only</p>
              </label>
            </div>

            {results && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-semibold">
                    {results.created} properties created successfully
                  </span>
                </div>
                {results.errors.length > 0 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-semibold">
                        {results.errors.length} errors
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {results.errors.map((err, idx) => (
                        <p key={idx} className="text-red-300 text-sm">
                          {err.line ? `Line ${err.line}: ` : `${err.property}: `}
                          {err.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg"
            >
              {uploading ? 'Uploading...' : 'Upload Properties'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}