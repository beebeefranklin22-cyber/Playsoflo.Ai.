import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Upload, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ProfilePictureGate({ user, onComplete }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show local preview immediately
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedUrl(file_url);
    } catch {
      toast.error("Upload failed. Please try again.");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!uploadedUrl) return;
    setSaving(true);
    try {
      await base44.auth.updateMe({ profile_picture: uploadedUrl });
      onComplete();
    } catch {
      toast.error("Failed to save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Camera className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Add a Profile Photo</h1>
        <p className="text-gray-400 text-sm mb-8">
          Welcome, {user?.full_name?.split(" ")[0] || "there"}! A profile photo helps others recognize you in the community.
        </p>

        {/* Avatar preview */}
        <div className="relative mx-auto w-32 h-32 mb-6">
          <div className="w-32 h-32 rounded-full border-4 border-purple-500/50 overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-4xl font-bold">
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
            ) : (
              (user?.full_name?.[0] || "U").toUpperCase()
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          {uploadedUrl && !uploading && (
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-900">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Upload button */}
        <label className="cursor-pointer block mb-4">
          <input
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <div className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition">
            <Upload className="w-5 h-5" />
            {previewUrl ? "Change Photo" : "Choose Photo"}
          </div>
        </label>

        <Button
          onClick={handleSave}
          disabled={!uploadedUrl || saving || uploading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-semibold py-3 rounded-xl"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue to App"
          )}
        </Button>


      </motion.div>
    </div>
  );
}