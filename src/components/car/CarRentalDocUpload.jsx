import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle, AlertCircle, FileText, Shield, X, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { verifyIdentityDocument } from "@/functions/verifyIdentityDocument";

export default function CarRentalDocUpload({ rentalId, onComplete, onClose }) {
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [uploading, setUploading] = useState({});
  const [uploaded, setUploaded] = useState({
    drivers_license_url: null,
    drivers_license_back_url: null,
    insurance_card_url: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleUpload = async (field, file) => {
    if (!file) return;
    setUploading((p) => ({ ...p, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploaded((p) => ({ ...p, [field]: file_url }));
      toast.success("File uploaded successfully");
    } catch (err) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading((p) => ({ ...p, [field]: false }));
    }
  };

  const handleSubmit = async () => {
    if (!uploaded.drivers_license_url) {
      toast.error("Please upload your driver's license (front) to continue.");
      return;
    }
    if (!licenseExpiry) {
      toast.error("Please enter your license expiry date.");
      return;
    }
    setSubmitting(true);
    try {
      // Save docs first
      const user = await base44.auth.me();
      await base44.entities.CarRental.update(rentalId, {
        drivers_license_url: uploaded.drivers_license_url,
        drivers_license_back_url: uploaded.drivers_license_back_url || null,
        insurance_card_url: uploaded.insurance_card_url || null,
        license_expiry_date: licenseExpiry,
        license_number: licenseNumber ? `****${licenseNumber.slice(-4)}` : null,
        doc_verification_status: "pending_review",
        status: "pending_approval",
      });

      // Run AI verification
      setVerifying(true);
      toast.info("🔍 Running AI document verification...");
      const { data } = await verifyIdentityDocument({
        booking_id: rentalId,
        booking_type: "car_rental",
        document_url: uploaded.drivers_license_url,
        document_back_url: uploaded.drivers_license_back_url || null,
        customer_name: user?.full_name || "",
      });
      setAiResult(data);
      setVerifying(false);

      if (data?.is_verified) {
        toast.success("✅ Documents automatically verified! Booking approved.");
      } else {
        toast.warning("🔍 Documents sent for manual review by the provider.");
      }
      onComplete?.();
    } catch (err) {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
      setVerifying(false);
    }
  };

  const UploadField = ({ field, label, required, hint }) => (
    <div className="space-y-2">
      <label className="text-white font-medium text-sm flex items-center gap-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {hint && <p className="text-gray-400 text-xs">{hint}</p>}
      {uploaded[field] ? (
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span className="text-green-300 text-sm flex-1">Uploaded successfully</span>
          <button
            onClick={() => setUploaded((p) => ({ ...p, [field]: null }))}
            className="text-gray-400 hover:text-white transition"
          >
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
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload(field, e.target.files[0])}
            disabled={uploading[field]}
          />
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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-7 h-7 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">Document Verification</h2>
                <p className="text-blue-100 text-sm">Required before your rental is approved</p>
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
          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex gap-3">
            <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-300 text-sm">
              Your documents are encrypted and only shared with the rental provider. They will not be stored beyond 90 days.
            </p>
          </div>

          {/* Driver's License Front */}
          <UploadField
            field="drivers_license_url"
            label="Driver's License (Front)"
            required
            hint="Clear photo showing your name, photo, and expiry date"
          />

          {/* Driver's License Back */}
          <UploadField
            field="drivers_license_back_url"
            label="Driver's License (Back)"
            hint="Recommended — shows license restrictions and barcode"
          />

          {/* Insurance Card */}
          <UploadField
            field="insurance_card_url"
            label="Insurance Card"
            hint="Optional but may speed up approval and waive platform insurance fee"
          />

          {/* License Expiry */}
          <div className="space-y-2">
            <label className="text-white font-medium text-sm">
              License Expiry Date <span className="text-red-400">*</span>
            </label>
            <Input
              type="date"
              value={licenseExpiry}
              onChange={(e) => setLicenseExpiry(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="bg-white/10 border-white/20 text-white"
            />
            {licenseExpiry && new Date(licenseExpiry) < new Date() && (
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4" />
                Your license appears to be expired. Rental may be denied.
              </div>
            )}
          </div>

          {/* License Number (last 4 only) */}
          <div className="space-y-2">
            <label className="text-white font-medium text-sm">License Number (last 4 digits)</label>
            <Input
              type="text"
              maxLength={4}
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 4821"
              className="bg-white/10 border-white/20 text-white"
            />
            <p className="text-gray-500 text-xs">We only store the last 4 digits for verification matching.</p>
          </div>

          {/* AI Verification Status */}
          <AnimatePresence>
            {verifying && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <Brain className="w-5 h-5 text-purple-400 animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-purple-300 font-semibold text-sm">AI Verification in Progress</p>
                  <p className="text-purple-400 text-xs">Analyzing your document for authenticity and expiry...</p>
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
            disabled={submitting || verifying || !uploaded.drivers_license_url || !licenseExpiry}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-4 text-base"
          >
            {verifying ? (
              <span className="flex items-center gap-2"><Brain className="w-4 h-4 animate-pulse" /> AI Verifying...</span>
            ) : submitting ? "Submitting..." : "Submit Documents for Review"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}