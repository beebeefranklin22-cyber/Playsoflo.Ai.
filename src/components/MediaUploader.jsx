import React, { useState } from "react";
import { Upload, Link, X, Image, Video, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function MediaUploader({ 
  value, 
  onChange, 
  type = "image", // "image", "video", or "both"
  label = "Media",
  className = "",
  previewClassName = "",
  allowUrl = true
}) {
  const [uploadMode, setUploadMode] = useState("file"); // "file" or "url"
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file) => {
    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success('✅ Upload successful!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('❌ Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput("");
      toast.success('✅ URL added!');
    }
  };

  const acceptTypes = type === "image" 
    ? "image/*" 
    : type === "video" 
    ? "video/*" 
    : "image/*,video/*";

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-gray-300">{label}</label>
      
      {/* Preview */}
      <AnimatePresence>
        {value && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative rounded-xl overflow-hidden ${previewClassName || 'h-48'}`}
          >
            {/\.(mp4|webm|ogg|mov)(\?|$)/i.test(value) || value.includes('video/') ? (
              <video src={value} className="w-full h-full object-cover" controls playsInline preload="metadata" />
            ) : (
              <img src={value} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
            )}
            <button
              onClick={() => onChange("")}
              className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Options */}
      {!value && (
        <div className="space-y-3">
          {/* Mode Selector */}
          {allowUrl && (
            <div className="flex gap-2">
              <button
                onClick={() => setUploadMode("file")}
                className={`flex-1 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition ${
                  uploadMode === "file"
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                onClick={() => setUploadMode("url")}
                className={`flex-1 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition ${
                  uploadMode === "url"
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                <Link className="w-4 h-4" />
                Use URL
              </button>
            </div>
          )}

          {/* File Upload */}
          {uploadMode === "file" && (
            <label className="block">
              <input
                type="file"
                accept={acceptTypes}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={uploading}
                className="hidden"
              />
              <div className={`border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-white/5 transition ${
                uploading ? 'opacity-50 pointer-events-none' : ''
              }`}>
                {uploading ? (
                  <Loader2 className="w-10 h-10 text-purple-400 mx-auto mb-3 animate-spin" />
                ) : type === "video" ? (
                  <Video className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                ) : (
                  <Image className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                )}
                <p className="text-gray-300 font-medium mb-1">
                  {uploading ? 'Uploading...' : `Click to upload ${type === "both" ? "media" : type}`}
                </p>
                <p className="text-gray-500 text-sm">
                  {type === "image" && "PNG, JPG, GIF up to 10MB"}
                  {type === "video" && "MP4, MOV up to 100MB"}
                  {type === "both" && "Images or videos"}
                </p>
              </div>
            </label>
          )}

          {/* URL Input */}
          {uploadMode === "url" && allowUrl && (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste media URL here..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}