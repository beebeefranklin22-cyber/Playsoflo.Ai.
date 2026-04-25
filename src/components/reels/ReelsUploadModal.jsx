import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Upload, Loader2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ReelsUploadModal({ currentUser, onClose, onSuccess }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [audioName, setAudioName] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handlePublish = async () => {
    if (!videoFile) { toast.error("Please select a video"); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: videoFile });
      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
      await base44.entities.Reel.create({
        creator_email: currentUser.email,
        creator_name: currentUser.full_name || currentUser.email,
        creator_photo: currentUser.profile_picture || "",
        video_url: file_url,
        caption,
        audio_name: audioName,
        tags: tagList,
        is_public: true,
      });
      toast.success("Reel published!");
      onSuccess?.();
      onClose();
    } catch (e) {
      toast.error("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">New Reel</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Video Upload */}
        <div
          className="relative aspect-[9/16] max-h-64 rounded-2xl overflow-hidden bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer mb-4"
          onClick={() => document.getElementById("reel-video-input").click()}
        >
          {videoPreview ? (
            <video src={videoPreview} className="w-full h-full object-cover" controls />
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-500 mb-2" />
              <p className="text-gray-400 text-sm font-medium">Tap to select video</p>
              <p className="text-gray-600 text-xs mt-1">MP4, MOV, WebM</p>
            </>
          )}
          <input id="reel-video-input" type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
        </div>

        <div className="space-y-3">
          <div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              rows={2}
              className="bg-white/8 border-white/15 text-white resize-none"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
          </div>
          <div className="relative">
            <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={audioName}
              onChange={(e) => setAudioName(e.target.value)}
              placeholder="Audio / music name (optional)"
              className="pl-10 bg-white/8 border-white/15 text-white"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
          </div>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags: music, dance, vibe (comma separated)"
            className="bg-white/8 border-white/15 text-white"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
        </div>

        <Button
          onClick={handlePublish}
          disabled={uploading || !videoFile}
          className="w-full mt-5 h-12 bg-gradient-to-r from-purple-600 to-pink-600 font-bold"
        >
          {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : "Publish Reel"}
        </Button>
      </motion.div>
    </div>
  );
}