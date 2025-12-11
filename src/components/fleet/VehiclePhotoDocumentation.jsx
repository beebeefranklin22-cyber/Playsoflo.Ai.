import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Camera, X, Upload, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function VehiclePhotoDocumentation({ open, onClose, rental, stage, onComplete }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const requiredAngles = [
    { id: "front", label: "Front View", icon: "🚗" },
    { id: "back", label: "Back View", icon: "🚙" },
    { id: "left", label: "Left Side", icon: "🚕" },
    { id: "right", label: "Right Side", icon: "🚖" },
    { id: "interior", label: "Interior", icon: "🪑" },
    { id: "dashboard", label: "Dashboard/Mileage", icon: "⚡" }
  ];

  const handlePhotoUpload = async (file, angle) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setPhotos(prev => [...prev, {
        angle: angle.id,
        label: angle.label,
        url: file_url,
        timestamp: new Date().toISOString()
      }]);

      toast.success(`${angle.label} photo uploaded`);
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const analyzePhotos = async () => {
    setUploading(true);
    try {
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these vehicle photos for a ${stage === 'pre' ? 'PRE-RENTAL' : 'POST-RENTAL'} inspection.

Photos: ${photos.length} uploaded
Stage: ${stage === 'pre' ? 'Before rental starts' : 'After rental completed'}

Provide detailed analysis:
1. Overall vehicle condition (1-10)
2. Any visible damage, scratches, dents
3. Interior cleanliness and condition
4. Dashboard/mileage reading (if visible)
5. Comparison notes if this is post-rental
6. Recommendations

Return JSON:
{
  "condition_score": 8,
  "damages_detected": ["Minor scratch on front bumper"],
  "cleanliness": "Good",
  "mileage": "45,230 miles",
  "recommendations": "Vehicle is in good condition",
  "pre_post_comparison": "If post-rental, note any changes",
  "dispute_risk": "Low/Medium/High"
}`,
        file_urls: photos.map(p => p.url),
        response_json_schema: {
          type: "object",
          properties: {
            condition_score: { type: "number" },
            damages_detected: { type: "array", items: { type: "string" } },
            cleanliness: { type: "string" },
            mileage: { type: "string" },
            recommendations: { type: "string" },
            pre_post_comparison: { type: "string" },
            dispute_risk: { type: "string" }
          }
        }
      });

      setAiAnalysis(analysis);
      toast.success("AI analysis complete!");
    } catch (error) {
      toast.error("Failed to analyze photos");
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    if (photos.length < 4) {
      toast.error("Please upload at least 4 photos");
      return;
    }

    if (!aiAnalysis) {
      toast.error("Please run AI analysis first");
      return;
    }

    // Save documentation
    await base44.entities.CarRental.update(rental.id, {
      [`${stage}_rental_photos`]: photos,
      [`${stage}_rental_inspection`]: {
        ...aiAnalysis,
        completed_at: new Date().toISOString()
      }
    });

    toast.success("Documentation saved!");
    onComplete({ photos, analysis: aiAnalysis });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Camera className="w-6 h-6 text-blue-400" />
              {stage === 'pre' ? 'Pre-Rental' : 'Post-Rental'} Vehicle Inspection
            </DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-400 text-sm">
            Document vehicle condition {stage === 'pre' ? 'before' : 'after'} rental
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-300 text-sm">
              📸 <strong>Required:</strong> Take clear photos from all angles. AI will analyze for damage, 
              cleanliness, and condition. This protects both parties in case of disputes.
            </p>
          </div>

          {/* Photo Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {requiredAngles.map(angle => {
              const photo = photos.find(p => p.angle === angle.id);
              return (
                <div key={angle.id} className="relative">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    {photo ? (
                      <>
                        <img src={photo.url} alt={angle.label} className="w-full h-40 object-cover rounded-lg mb-2" />
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          {angle.label}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-full h-40 bg-white/5 rounded-lg flex items-center justify-center mb-2">
                          <span className="text-4xl">{angle.icon}</span>
                        </div>
                        <input
                          id={`upload-${angle.id}`}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handlePhotoUpload(e.target.files?.[0], angle)}
                          className="hidden"
                        />
                        <Button
                          onClick={() => document.getElementById(`upload-${angle.id}`).click()}
                          disabled={uploading}
                          variant="outline"
                          className="w-full bg-white/5 border-white/20"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {angle.label}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {photos.length >= 4 && !aiAnalysis && (
            <Button
              onClick={analyzePhotos}
              disabled={uploading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Run AI Analysis
            </Button>
          )}

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                🤖 AI Analysis Results
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Condition Score</p>
                  <p className="text-white text-3xl font-bold">{aiAnalysis.condition_score}/10</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Dispute Risk</p>
                  <p className={`text-2xl font-bold ${
                    aiAnalysis.dispute_risk === 'Low' ? 'text-green-400' :
                    aiAnalysis.dispute_risk === 'Medium' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {aiAnalysis.dispute_risk}
                  </p>
                </div>
              </div>

              {aiAnalysis.damages_detected?.length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-2">⚠️ Damages Detected:</p>
                  <ul className="space-y-1">
                    {aiAnalysis.damages_detected.map((damage, idx) => (
                      <li key={idx} className="text-yellow-400 text-sm">• {damage}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <p className="text-gray-400">Cleanliness: <span className="text-white font-semibold">{aiAnalysis.cleanliness}</span></p>
                {aiAnalysis.mileage && (
                  <p className="text-gray-400">Mileage: <span className="text-white font-semibold">{aiAnalysis.mileage}</span></p>
                )}
                <p className="text-gray-300 mt-3">{aiAnalysis.recommendations}</p>
                {aiAnalysis.pre_post_comparison && stage === 'post' && (
                  <p className="text-blue-300 mt-3">📊 {aiAnalysis.pre_post_comparison}</p>
                )}
              </div>
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
              onClick={handleComplete}
              disabled={photos.length < 4 || !aiAnalysis}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Inspection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}