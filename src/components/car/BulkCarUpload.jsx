import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Download, CheckCircle, AlertCircle, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function BulkCarUpload({ currentUser, onClose }) {
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
    const template = `make,model,year,category,color,transmission,fuel_type,seats,daily_rate,weekly_rate,monthly_rate,mileage,location,features,images,insurance_included,delivery_available
Tesla,Model 3,2023,luxury,White,Automatic,Electric,5,150,900,3000,15000,Miami FL,"autopilot,premium_audio,wifi","https://example.com/car1.jpg,https://example.com/car2.jpg",true,true
BMW,X5,2022,suv,Black,Automatic,Gasoline,7,200,1200,4000,25000,Miami FL,"leather,sunroof,gps",https://example.com/car3.jpg,true,false
Honda,Civic,2021,economy,Blue,Automatic,Gasoline,5,50,300,1000,30000,Miami FL,"bluetooth,backup_camera",https://example.com/car4.jpg,false,false`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'car_rental_template.csv';
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
      
      const cars = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',');
          const car = {};
          
          headers.forEach((header, idx) => {
            const value = values[idx]?.trim();
            if (value) {
              if (header === 'features' || header === 'images') {
                car[header] = value.split('|').map(v => v.trim());
              } else if (['year', 'seats', 'daily_rate', 'weekly_rate', 'monthly_rate', 'mileage'].includes(header)) {
                car[header] = parseFloat(value);
              } else if (header === 'insurance_included' || header === 'delivery_available') {
                car[header] = value.toLowerCase() === 'true';
              } else {
                car[header] = value;
              }
            }
          });

          car.is_available = true;
          car.status = 'active';

          if (car.make && car.model && car.year) {
            cars.push(car);
          } else {
            errors.push({ line: i + 1, error: 'Missing required fields' });
          }
        } catch (err) {
          errors.push({ line: i + 1, error: err.message });
        }
      }

      // Bulk create
      const created = [];
      for (const car of cars) {
        try {
          const result = await base44.entities.Asset.create(car);
          created.push(result);
        } catch (err) {
          errors.push({ car: `${car.make} ${car.model}`, error: err.message });
        }
      }

      setResults({ created: created.length, errors });
      queryClient.invalidateQueries(['fleet-cars']);
      
      if (created.length > 0) {
        toast.success(`✅ ${created.length} cars uploaded!`);
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
            <h3 className="text-2xl font-bold text-white">Bulk Car Upload</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-300 text-sm mb-3">
                🚗 Upload your entire fleet at once using a CSV file
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
                    {results.created} cars created successfully
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
                          {err.line ? `Line ${err.line}: ` : `${err.car}: `}
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
              {uploading ? 'Uploading...' : 'Upload Fleet'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}