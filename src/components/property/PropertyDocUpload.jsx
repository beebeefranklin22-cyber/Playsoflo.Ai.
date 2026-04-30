import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle, Shield, X, FileText, Camera, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { verifyIdentityDocument } from "@/functions/verifyIdentityDocument";

const ID_TYPES = [
  { value: "drivers_license", label: "Driver's License", needsBack: true },
  { value: "passport", label: "Passport", needsBack: false },
  { value: "national_id", label: "National ID", needsBack: true },
  { value: "state_id", label: "State ID", needsBack: true },
];

export default function PropertyDocUpload({ bookingId, onComplete, onClose }) {
  const [idType, setIdType] = useState("drivers_license");
  const [uploading, setUploading] = useState({});
  const [uploaded, setUploaded] = useState({
    id_front_url: null,
    id_back_url: null,
    selfie_url: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const selectedType = ID_TYPES.find((t) => t.value === idType);

  const handleUpload = async (field, file) => {
    if (!file) return;
    setUploading((p) => ({ ...p, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploaded((p) => ({ ...p, [field]: file_url }));
      toast.success("File uploaded successfully");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading((p) => ({ ...p, [field]: false }));
    }
  };

  const handleSubmit = async () => {
    if (!uploaded.id_front_url) {
      toast.error("Please upload the front of your ID document.");
      return;
    }
    if (!rulesAccepted) {
      toast.error("Please accept the house rules to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      // Save docs first
      await base44.entities.PropertyBooking.update(bookingId, {
        id_type: idType,
        id_front_url: uploaded.id_front_url,
        id_back_url: uploaded.id_back_url || null,
        selfie_url: uploaded.selfie_url || null,
        doc_verification_status: "pending_review",
        status: "pending_approval",
        house_rules_accepted: true,
      });

      // Run AI verification
      setVerifying(true);
      toast.info("🔍 Running AI identity verification...");
      const { data } = await verifyIdentityDocument({
        booking_id: bookingId,
        booking_type: "property_booking",
        document_url: uploaded.id_front_url,
        document_back_url: uploaded.id_back_url || null,
        customer_name: user?.full_name || "",
      });
      setAiResult(data);
      setVerifying(false);

      if (data?.is_verified) {
        toast.success("✅ Identity automatically verified! Booking confirmed.");
      } else {
        toast.warning("🔍 Identity sent for manual review by the host.");
      }
      onComplete?.();
    } catch {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
      setVerifying(false);
    }
  };

  const UploadField = ({ field, label, required, hint }) => (
    <div className="space-y-2">
      <label className="text-white font-medium text-sm">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {hint && <p className="text-gray-400 text-xs">{hint}</p>}
      {uploaded[field] ? (
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span className="text-green-300 text-sm flex-1">Uploaded successfully</span>
          <button onClick={() => setUploaded((p) => ({ ...p, [field]: null }))} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition">
          {uploading[field] ? (
            <span className="text-gray-400 text-sm animate-pulse">Uploading...</span>
          ) : (
            <>
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 text-sm">Click to upload photo</span>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(field, e.target.files[0])} disabled={uploading[field]} />
        </label>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-7 h-7 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">Identity Verification</h2>
                <p className="text-emerald-100 text-sm">Required before your booking is confirmed</p>
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Privacy Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex gap-3">
            <FileText className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-300 text-sm">
              Your ID is encrypted and only shared with the host for identity verification. It is not stored beyond your stay.
            </p>
          </div>

          {/* ID Type Selection */}
          <div className="space-y-2">
            <label className="text-white font-medium text-sm">Select ID Type <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {ID_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setIdType(type.value)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition ${
                    idType === type.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                      : "border-white/20 bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Front of ID */}
          <UploadField
            field="id_front_url"
            label={idType === "passport" ? "Passport Photo Page" : `${selectedType?.label} (Front)`}
            required
            hint="Clear, well-lit photo — all text must be readable"
          />

          {/* Back of ID (if applicable) */}
          {selectedType?.needsBack && (
            <UploadField
              field="id_back_url"
              label={`${selectedType?.label} (Back)`}
              hint="Recommended for faster verification"
            />
          )}

          {/* Selfie */}
          <div className="space-y-2">
            <label className="text-white font-medium text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-gray-400" />
              Selfie with ID (Optional)
            </label>
            <p className="text-gray-400 text-xs">Holding your ID next to your face helps the host verify identity quickly</p>
            {uploaded.selfie_url ? (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-300 text-sm flex-1">Selfie uploaded</span>
                <button onClick={() => setUploaded((p) => ({ ...p, selfie_url: null }))} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition">
                {uploading.selfie_url ? (
                  <span className="text-gray-400 text-sm animate-pulse">Uploading...</span>
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400 text-sm">Take or upload selfie with ID</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleUpload("selfie_url", e.target.files[0])} />
              </label>
            )}
          </div>

          {/* House Rules Acceptance */}
          <div
            className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer"
            onClick={() => setRulesAccepted(!rulesAccepted)}
          >
            <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition ${rulesAccepted ? "bg-emerald-500 border-emerald-500" : "border-white/30"}`}>
              {rulesAccepted && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <p className="text-gray-300 text-sm">
              I agree to respect the property, follow house rules, and acknowledge that misuse may result in security deposit forfeiture.
            </p>
          </div>

          {/* AI Verification Status */}
          <AnimatePresence>
            {verifying && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <Brain className="w-5 h-5 text-purple-400 animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-purple-300 font-semibold text-sm">AI Verification in Progress</p>
                  <p className="text-purple-400 text-xs">Analyzing your identity document...</p>
                </div>
              </motion.div>
            )}
            {aiResult && !verifying && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border ${aiResult.is_verified ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className={`w-4 h-4 ${aiResult.is_verified ? "text-green-400" : "text-yellow-400"}`} />
                  <p className={`font-semibold text-sm ${aiResult.is_verified ? "text-green-300" : "text-yellow-300"}`}>
                    AI Result: {aiResult.is_verified ? "Auto-Verified ✅" : "Sent for Manual Review 🔍"}
                  </p>
                </div>
                <p className={`text-xs ${aiResult.is_verified ? "text-green-400" : "text-yellow-400"}`}>{aiResult.details?.verdict_reason}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleSubmit}
            disabled={submitting || verifying || !uploaded.id_front_url || !rulesAccepted}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-base"
          >
            {verifying ? (
              <span className="flex items-center gap-2"><Brain className="w-4 h-4 animate-pulse" /> AI Verifying...</span>
            ) : submitting ? "Submitting..." : "Submit Identity Documents"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}