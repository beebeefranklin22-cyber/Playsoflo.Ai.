import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Camera, X, Upload, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function VehiclePhotoDocumentation({ open, onClose, rental, stage, onComplete }) {
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);

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

  const handleVideoUpload = async (file) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setVideos(prev => [...prev, {
        url: file_url,
        timestamp: new Date().toISOString()
      }]);

      toast.success("Video walkaround uploaded");
    } catch (error) {
      toast.error("Failed to upload video");
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
Videos: ${videos.length} walkarounds
Stage: ${stage === 'pre' ? 'Before rental starts' : 'After rental completed'}

Provide detailed analysis:
1. Overall vehicle condition (1-10)
2. Any visible damage, scratches, dents, with specific locations
3. Interior cleanliness and condition
4. Dashboard/mileage reading (if visible)
5. Exterior condition (paint, body, glass)
6. Tire condition
7. Recommendations

Return JSON:
{
  "condition_score": 8,
  "damages_detected": [
    {"location": "Front bumper", "severity": "Minor", "description": "Small scratch"}
  ],
  "cleanliness": "Good",
  "mileage": "45,230 miles",
  "exterior_condition": "Excellent",
  "interior_condition": "Good",
  "tire_condition": "Good tread depth",
  "recommendations": "Vehicle is in good condition",
  "confidence_score": 95,
  "dispute_risk": "Low"
}`,
        file_urls: [...photos.map(p => p.url), ...videos.map(v => v.url)],
        response_json_schema: {
          type: "object",
          properties: {
            condition_score: { type: "number" },
            damages_detected: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  location: { type: "string" },
                  severity: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            cleanliness: { type: "string" },
            mileage: { type: "string" },
            exterior_condition: { type: "string" },
            interior_condition: { type: "string" },
            tire_condition: { type: "string" },
            recommendations: { type: "string" },
            confidence_score: { type: "number" },
            dispute_risk: { type: "string" }
          }
        }
      });

      setAiAnalysis(analysis);

      // If post-rental, compare with pre-rental photos
      if (stage === 'post' && rental.pre_rental_photos && rental.pre_rental_photos.length > 0) {
        try {
          await comparePhotos(rental.pre_rental_photos, photos);
        } catch (compareError) {
          console.error("Comparison error:", compareError);
          toast.error("Photo comparison failed, but analysis completed");
        }
      }

      toast.success("AI analysis complete!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze photos: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const comparePhotos = async (prePhotos, postPhotos) => {
    setComparing(true);
    try {
      const comparison = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI damage detection expert. Compare PRE-RENTAL vs POST-RENTAL photos of the same vehicle.

PRE-RENTAL PHOTOS (${prePhotos.length}):
${JSON.stringify(prePhotos.map(p => ({ angle: p.angle, label: p.label })))}

POST-RENTAL PHOTOS (${postPhotos.length}):
${JSON.stringify(postPhotos.map(p => ({ angle: p.angle, label: p.label })))}

TASK: Identify NEW damages or changes that occurred during the rental period.

Compare matching angles and provide:
1. Discrepancies found (new scratches, dents, stains)
2. Severity of each discrepancy (Minor/Moderate/Major)
3. Estimated repair cost for each
4. Overall comparison confidence score (0-100)
5. Recommendation (Accept return / Investigate further / Charge damage fee)

Return JSON:
{
  "discrepancies": [
    {
      "angle": "front",
      "description": "New scratch on front bumper left side",
      "severity": "Minor",
      "estimated_cost": 150,
      "confidence": 92
    }
  ],
  "new_damages_count": 1,
  "total_estimated_cost": 150,
  "overall_confidence": 88,
  "recommendation": "Minor damage detected - suggest $150 deduction from deposit",
  "comparison_summary": "Vehicle returned in similar condition with minor front bumper damage",
  "visual_highlights": ["Front bumper area shows new impact"]
}`,
        file_urls: [...prePhotos.map(p => p.url), ...postPhotos.map(p => p.url)],
        response_json_schema: {
          type: "object",
          properties: {
            discrepancies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  angle: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string" },
                  estimated_cost: { type: "number" },
                  confidence: { type: "number" }
                }
              }
            },
            new_damages_count: { type: "number" },
            total_estimated_cost: { type: "number" },
            overall_confidence: { type: "number" },
            recommendation: { type: "string" },
            comparison_summary: { type: "string" },
            visual_highlights: { type: "array", items: { type: "string" } }
          }
        }
      });

      setComparison(comparison);
      toast.success("Photo comparison complete!");
    } catch (error) {
      console.error("Comparison error:", error);
      toast.error("Failed to compare photos");
    } finally {
      setComparing(false);
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

    try {
      // Save documentation
      await base44.entities.CarRental.update(rental.id, {
        [`${stage}_rental_photos`]: photos,
        [`${stage}_rental_videos`]: videos,
        [`${stage}_rental_inspection`]: {
          ...aiAnalysis,
          completed_at: new Date().toISOString()
        },
        ...(comparison && {
          photo_comparison: comparison,
          new_damages_detected: comparison.new_damages_count > 0
        })
      });

      toast.success("Documentation saved!");
      onComplete({ photos, videos, analysis: aiAnalysis, comparison });
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save documentation: " + (error.message || "Unknown error"));
    }
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

          {/* Video Walkaround */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              🎥 Video Walkaround (Optional)
            </h3>
            <p className="text-gray-400 text-sm mb-3">
              Record a 360° video walkaround for comprehensive documentation
            </p>
            {videos.length > 0 ? (
              <div className="space-y-2">
                {videos.map((video, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white text-sm">Video {idx + 1} uploaded</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={(e) => handleVideoUpload(e.target.files?.[0])}
                  className="hidden"
                />
                <Button
                  onClick={() => document.getElementById('video-upload').click()}
                  disabled={uploading}
                  variant="outline"
                  className="w-full bg-white/5 border-white/20"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Video Walkaround
                </Button>
              </>
            )}
          </div>

          {photos.length >= 4 && !aiAnalysis && (
            <Button
              onClick={analyzePhotos}
              disabled={uploading || comparing}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {comparing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
              {comparing ? "Analyzing & Comparing..." : "Run AI Analysis"}
            </Button>
          )}

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                🤖 AI Analysis Results
              </h3>
              
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Condition Score</p>
                  <p className="text-white text-3xl font-bold">{aiAnalysis.condition_score}/10</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Confidence</p>
                  <p className="text-blue-400 text-3xl font-bold">{aiAnalysis.confidence_score}%</p>
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
                  <div className="space-y-2">
                    {aiAnalysis.damages_detected.map((damage, idx) => (
                      <div key={idx} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-white font-semibold">{damage.location || damage}</p>
                            <p className="text-gray-400 text-sm">{damage.description || damage}</p>
                          </div>
                          {damage.severity && (
                            <Badge className={
                              damage.severity === 'Major' ? 'bg-red-500 text-white' :
                              damage.severity === 'Moderate' ? 'bg-orange-500 text-white' :
                              'bg-yellow-500/30 text-yellow-300'
                            }>
                              {damage.severity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-400 mb-1">Interior</p>
                  <p className="text-white font-semibold">{aiAnalysis.interior_condition || aiAnalysis.cleanliness}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-400 mb-1">Exterior</p>
                  <p className="text-white font-semibold">{aiAnalysis.exterior_condition || 'Good'}</p>
                </div>
                {aiAnalysis.mileage && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 mb-1">Mileage</p>
                    <p className="text-white font-semibold">{aiAnalysis.mileage}</p>
                  </div>
                )}
                {aiAnalysis.tire_condition && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 mb-1">Tires</p>
                    <p className="text-white font-semibold">{aiAnalysis.tire_condition}</p>
                  </div>
                )}
              </div>
              
              <p className="text-gray-300 text-sm bg-white/5 rounded-lg p-3">{aiAnalysis.recommendations}</p>
            </div>
          )}

          {/* Pre/Post Comparison Results */}
          {comparison && stage === 'post' && (
            <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                🔍 Pre vs Post Rental Comparison
                <Badge className={
                  comparison.overall_confidence >= 80 ? 'bg-green-500 text-white' :
                  comparison.overall_confidence >= 60 ? 'bg-yellow-500 text-white' :
                  'bg-red-500 text-white'
                }>
                  {comparison.overall_confidence}% Confidence
                </Badge>
              </h3>

              {comparison.new_damages_count > 0 ? (
                <>
                  <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 mb-4">
                    <p className="text-red-300 font-bold mb-2">
                      ⚠️ {comparison.new_damages_count} New Damage{comparison.new_damages_count > 1 ? 's' : ''} Detected
                    </p>
                    <p className="text-white text-2xl font-bold">
                      Estimated Cost: ${comparison.total_estimated_cost}
                    </p>
                  </div>

                  <div className="space-y-3 mb-4">
                    {comparison.discrepancies.map((disc, idx) => (
                      <div key={idx} className="bg-white/10 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-white font-semibold">{disc.angle?.toUpperCase()}</p>
                            <p className="text-gray-300 text-sm">{disc.description}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={
                              disc.severity === 'Major' ? 'bg-red-500 text-white' :
                              disc.severity === 'Moderate' ? 'bg-orange-500 text-white' :
                              'bg-yellow-500 text-white'
                            }>
                              {disc.severity}
                            </Badge>
                            <p className="text-red-400 font-bold mt-1">${disc.estimated_cost}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Detection Confidence</span>
                          <span className="text-blue-400 font-semibold">{disc.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {comparison.visual_highlights?.length > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
                      <p className="text-orange-300 text-sm font-semibold mb-2">📸 Visual Highlights:</p>
                      <ul className="space-y-1">
                        {comparison.visual_highlights.map((highlight, idx) => (
                          <li key={idx} className="text-orange-200 text-sm">• {highlight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-blue-300 text-sm font-semibold mb-2">AI Recommendation:</p>
                    <p className="text-white">{comparison.recommendation}</p>
                  </div>
                </>
              ) : (
                <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-300 font-bold text-center mb-2">
                    ✅ No New Damages Detected
                  </p>
                  <p className="text-gray-300 text-sm text-center">{comparison.comparison_summary}</p>
                </div>
              )}
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
              disabled={photos.length < 4 || !aiAnalysis || comparing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {comparing ? "Comparing..." : "Complete Inspection"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}