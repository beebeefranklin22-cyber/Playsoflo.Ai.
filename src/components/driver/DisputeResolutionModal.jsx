import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { 
  AlertTriangle, X, Send, FileText, Camera, 
  CheckCircle, Loader2, Brain, Download, Share2 
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function DisputeResolutionModal({ open, onClose, ride }) {
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleEvidenceUpload = async (file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEvidence(prev => [...prev, file_url]);
      toast.success("Evidence uploaded");
    } catch (error) {
      toast.error("Failed to upload evidence");
    }
  };

  const analyzeDispute = async () => {
    if (!description.trim()) {
      toast.error("Please describe the dispute");
      return;
    }

    setAnalyzing(true);
    try {
      const currentUser = await base44.auth.me();
      
      // Get driver's rating and history
      const driverRatings = await base44.entities.Rating.filter({
        rated_email: currentUser.email
      });
      const avgRating = driverRatings.length > 0 
        ? (driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length).toFixed(1)
        : "N/A";

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI dispute resolution specialist for a rideshare platform.

RIDE DETAILS:
- Pickup: ${ride.pickup_address}
- Dropoff: ${ride.dropoff_address}
- Distance: ${ride.estimated_distance_miles || ride.actual_distance} miles
- Fare: $${ride.fare_breakdown?.total_fare}
- Date: ${new Date(ride.created_date).toLocaleDateString()}
- Status: ${ride.status}
- Cancellation: ${ride.cancellation_reason || "None"}

DRIVER PROFILE:
- Average rating: ${avgRating}/5.0
- Total ratings: ${driverRatings.length}
- Cancellation reason by: ${ride.cancelled_by || "N/A"}

DISPUTE DESCRIPTION:
${description}

EVIDENCE:
${evidence.length} files attached

Analyze this dispute and provide:
1. Case strength assessment (strong/moderate/weak)
2. Key evidence points supporting the driver
3. Recommended resolution approach
4. Professional argument statement
5. Estimated resolution time
6. Suggested next steps

Return JSON with structure for dispute resolution.`,
        response_json_schema: {
          type: "object",
          properties: {
            case_strength: { type: "string" },
            strength_score: { type: "number" },
            supporting_evidence: { 
              type: "array", 
              items: { type: "string" } 
            },
            weak_points: { 
              type: "array", 
              items: { type: "string" } 
            },
            recommended_resolution: { type: "string" },
            professional_statement: { type: "string" },
            estimated_resolution_days: { type: "number" },
            next_steps: { 
              type: "array", 
              items: { type: "string" } 
            },
            escalation_recommended: { type: "boolean" },
            compensation_estimate: { type: "string" }
          }
        }
      });

      setAiAnalysis(analysis);
      toast.success("AI analysis complete");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze dispute");
    } finally {
      setAnalyzing(false);
    }
  };

  const submitDispute = async () => {
    if (!aiAnalysis) {
      toast.error("Please run AI analysis first");
      return;
    }

    setSubmitting(true);
    try {
      const currentUser = await base44.auth.me();

      // Create dispute record
      const dispute = await base44.entities.Dispute.create({
        reference_type: "ride",
        reference_id: ride.id,
        disputer_email: currentUser.email,
        disputer_type: "driver",
        respondent_email: ride.created_by,
        description: description,
        evidence_urls: evidence,
        ai_analysis: aiAnalysis,
        status: "pending",
        severity: aiAnalysis.case_strength === "strong" ? "high" : "medium"
      });

      // Notify platform/customer
      await base44.entities.Notification.create({
        recipient_email: ride.created_by,
        type: "dispute_filed",
        title: "Dispute Filed",
        message: `A dispute has been filed regarding your ride. Case #${dispute.id}`,
        reference_type: "dispute",
        reference_id: dispute.id
      });

      toast.success("Dispute submitted successfully");
      onClose();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit dispute");
    } finally {
      setSubmitting(false);
    }
  };

  const exportDispute = () => {
    const exportData = {
      ride_id: ride.id,
      dispute_description: description,
      ai_analysis: aiAnalysis,
      evidence_files: evidence,
      created_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispute-${ride.id}-${Date.now()}.json`;
    a.click();
    toast.success("Dispute data exported");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
              AI Dispute Resolution
            </DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-400 text-sm">
            AI-powered analysis to help resolve ride disputes
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Ride Summary */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">Ride Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Route:</span>
                <span className="text-white text-right">{ride.pickup_address} → {ride.dropoff_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fare:</span>
                <span className="text-white">${ride.fare_breakdown?.total_fare}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date:</span>
                <span className="text-white">{new Date(ride.created_date).toLocaleDateString()}</span>
              </div>
              {ride.cancellation_reason && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Cancellation:</span>
                  <span className="text-orange-400">{ride.cancellation_reason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dispute Description */}
          <div>
            <label className="text-white font-medium mb-2 block">
              Describe the Issue
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what happened and why you're filing a dispute..."
              className="bg-white/10 border-white/20 text-white min-h-32"
            />
          </div>

          {/* Evidence Upload */}
          <div>
            <label className="text-white font-medium mb-2 block">
              Upload Evidence (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-white/20 rounded-xl p-4 hover:border-purple-500/50 transition text-center">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Click to upload photos/videos</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={(e) => handleEvidenceUpload(e.target.files[0])}
                  multiple
                />
              </label>
            </div>
            {evidence.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {evidence.map((url, idx) => (
                  <Badge key={idx} className="bg-green-500/20 text-green-300">
                    <FileText className="w-3 h-3 mr-1" />
                    Evidence {idx + 1}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* AI Analysis Button */}
          <Button
            onClick={analyzeDispute}
            disabled={analyzing || !description.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Analyze Dispute with AI
              </>
            )}
          </Button>

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Case Strength */}
              <div className={`rounded-xl p-4 border ${
                aiAnalysis.case_strength === 'strong' 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : aiAnalysis.case_strength === 'moderate'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Case Strength Assessment</h3>
                  <Badge className={
                    aiAnalysis.case_strength === 'strong' 
                      ? 'bg-green-500 text-white' 
                      : aiAnalysis.case_strength === 'moderate'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-red-500 text-white'
                  }>
                    {aiAnalysis.case_strength} ({aiAnalysis.strength_score}%)
                  </Badge>
                </div>
                <p className="text-gray-300 text-sm">{aiAnalysis.recommended_resolution}</p>
              </div>

              {/* Supporting Evidence */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Supporting Evidence
                </h3>
                <ul className="space-y-2">
                  {aiAnalysis.supporting_evidence?.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weak Points */}
              {aiAnalysis.weak_points?.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <h3 className="text-orange-300 font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Points to Address
                  </h3>
                  <ul className="space-y-2">
                    {aiAnalysis.weak_points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-orange-200">
                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Professional Statement */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h3 className="text-blue-300 font-semibold mb-3">AI-Generated Statement</h3>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">
                  {aiAnalysis.professional_statement}
                </p>
              </div>

              {/* Next Steps */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">Recommended Next Steps</h3>
                <ol className="space-y-2">
                  {aiAnalysis.next_steps?.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-300 text-xs flex-shrink-0">
                        {idx + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Compensation Estimate */}
              {aiAnalysis.compensation_estimate && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <h3 className="text-green-300 font-semibold mb-2">Expected Compensation</h3>
                  <p className="text-white text-lg font-bold">{aiAnalysis.compensation_estimate}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Resolution time: ~{aiAnalysis.estimated_resolution_days} days
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={exportDispute}
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                {aiAnalysis.escalation_recommended && (
                  <Button
                    variant="outline"
                    className="flex-1 bg-orange-500/10 border-orange-500/30 text-orange-300"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Escalate Externally
                  </Button>
                )}
                <Button
                  onClick={submitDispute}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Dispute
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}