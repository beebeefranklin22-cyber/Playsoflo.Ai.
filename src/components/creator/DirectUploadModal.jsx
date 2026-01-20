import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, Video, Image, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function DirectUploadModal({ isOpen, onClose, currentUser, onSuccess }) {
  const queryClient = useQueryClient();
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    category: "entertainment",
    type: "movie",
    tags: [],
    is_monetized: false,
    price_usd: 0,
    rental_price_usd: 0
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ video: 0, thumbnail: 0 });
  const [uploading, setUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      setUploading(true);
      
      // Upload video file
      let video_url = null;
      if (videoFile) {
        toast.info("Uploading video...");
        const videoUpload = await base44.integrations.Core.UploadFile({
          file: videoFile
        });
        video_url = videoUpload.file_url;
        setUploadProgress(p => ({ ...p, video: 100 }));
      }

      // Upload thumbnail (can be image or video)
      let thumbnail_url = null;
      if (thumbnailFile) {
        toast.info("Uploading thumbnail...");
        const thumbUpload = await base44.integrations.Core.UploadFile({
          file: thumbnailFile
        });
        thumbnail_url = thumbUpload.file_url;
        setUploadProgress(p => ({ ...p, thumbnail: 100 }));
      }

      // Create streaming content
      const content = await base44.entities.StreamingContent.create({
        title: data.title,
        description: data.description,
        type: data.type,
        category: data.category,
        video_url,
        thumbnail_url,
        tags: data.tags,
        is_live: false,
        is_monetized: data.is_monetized,
        price_usd: parseFloat(data.price_usd) || 0,
        rental_price_usd: parseFloat(data.rental_price_usd) || 0,
        status: "published",
        creator_email: currentUser.email,
        creator_username: currentUser.username || currentUser.full_name
      });

      return content;
    },
    onSuccess: (content) => {
      queryClient.invalidateQueries({ queryKey: ['my-vod-content'] });
      toast.success("Content uploaded successfully!");
      setUploading(false);
      onSuccess?.(content);
      onClose();
      
      // Reset form
      setUploadData({
        title: "",
        description: "",
        category: "entertainment",
        type: "movie",
        tags: [],
        is_monetized: false,
        price_usd: 0,
        rental_price_usd: 0
      });
      setVideoFile(null);
      setThumbnailFile(null);
      setUploadProgress({ video: 0, thumbnail: 0 });
    },
    onError: (error) => {
      setUploading(false);
      toast.error("Upload failed: " + error.message);
    }
  });

  const handleSubmit = () => {
    if (!uploadData.title) {
      toast.error("Please enter a title");
      return;
    }
    
    if (!videoFile && !thumbnailFile) {
      toast.error("Please select at least a video or thumbnail");
      return;
    }

    uploadMutation.mutate(uploadData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-3xl bg-gradient-to-br from-gray-900 to-purple-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">Upload Content</h2>
            <p className="text-gray-400 mt-1">Upload your videos directly from your device</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Video Upload */}
          <div className="border-2 border-dashed border-white/20 rounded-2xl p-6 bg-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Video className="w-6 h-6 text-blue-400" />
              <h3 className="text-white font-semibold text-lg">Video File</h3>
            </div>
            
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setVideoFile(file);
                  toast.success(`Video selected: ${file.name}`);
                }
              }}
              className="bg-white/10 border-white/20 text-white mb-3"
            />
            
            {videoFile && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{videoFile.name}</span>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-gray-400 text-sm">
                  Size: {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
                {uploadProgress.video > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${uploadProgress.video}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thumbnail Upload */}
          <div className="border-2 border-dashed border-white/20 rounded-2xl p-6 bg-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Image className="w-6 h-6 text-purple-400" />
              <h3 className="text-white font-semibold text-lg">Thumbnail (Image or Video)</h3>
            </div>
            
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setThumbnailFile(file);
                  toast.success(`Thumbnail selected: ${file.name}`);
                }
              }}
              className="bg-white/10 border-white/20 text-white mb-3"
            />
            
            {thumbnailFile && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{thumbnailFile.name}</span>
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-gray-400 text-sm">
                  Size: {(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
                {thumbnailFile.type.startsWith('image/') && (
                  <img 
                    src={URL.createObjectURL(thumbnailFile)} 
                    alt="Preview" 
                    className="mt-3 w-full h-40 object-cover rounded-lg"
                  />
                )}
                {thumbnailFile.type.startsWith('video/') && (
                  <video 
                    src={URL.createObjectURL(thumbnailFile)} 
                    className="mt-3 w-full h-40 object-cover rounded-lg"
                    muted
                    loop
                    autoPlay
                  />
                )}
                {uploadProgress.thumbnail > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${uploadProgress.thumbnail}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content Details */}
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Title*</label>
              <Input
                value={uploadData.title}
                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                placeholder="Enter video title"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Description</label>
              <Textarea
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                placeholder="Describe your content..."
                className="bg-white/10 border-white/20 text-white"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Type</label>
                <Select 
                  value={uploadData.type} 
                  onValueChange={(v) => setUploadData({ ...uploadData, type: v })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="gaming_stream">Gaming</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Category</label>
                <Select 
                  value={uploadData.category} 
                  onValueChange={(v) => setUploadData({ ...uploadData, category: v })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Monetization */}
            <div className="border-t border-white/10 pt-4">
              <label className="flex items-center gap-2 text-white cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={uploadData.is_monetized}
                  onChange={(e) => setUploadData({ ...uploadData, is_monetized: e.target.checked })}
                  className="w-5 h-5 rounded accent-purple-500"
                />
                Enable monetization
              </label>

              {uploadData.is_monetized && (
                <div className="grid grid-cols-2 gap-4 pl-7">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Purchase Price (USD)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={uploadData.price_usd}
                      onChange={(e) => setUploadData({ ...uploadData, price_usd: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Rental Price (USD)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={uploadData.rental_price_usd}
                      onChange={(e) => setUploadData({ ...uploadData, rental_price_usd: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={uploading || !uploadData.title}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 text-lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Content
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              disabled={uploading}
              variant="outline"
              className="bg-white/5 border-white/20 hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}