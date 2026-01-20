import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Radio, Loader2, Image } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GoLiveNowModal({ isOpen, onClose, currentUser }) {
  const navigate = useNavigate();
  const [liveData, setLiveData] = useState({
    title: "",
    description: "",
    category: "entertainment",
    thumbnail_file: null
  });
  const [uploading, setUploading] = useState(false);

  const goLiveMutation = useMutation({
    mutationFn: async (data) => {
      setUploading(true);
      
      // Upload thumbnail if provided
      let thumbnail_url = null;
      if (data.thumbnail_file) {
        toast.info("Uploading thumbnail...");
        const thumbUpload = await base44.integrations.Core.UploadFile({
          file: data.thumbnail_file
        });
        thumbnail_url = thumbUpload.file_url;
      }

      // Generate unique channel name
      const channelName = `livestream_${Date.now()}_${currentUser.id.substring(0, 8)}`;
      
      // Create livestream
      const stream = await base44.entities.StreamingContent.create({
        title: data.title,
        type: 'live_event',
        category: data.category,
        description: data.description,
        thumbnail_url,
        is_live: true,
        rating: 0,
        requires_subscription: false,
        betting_available: false,
        agora_channel_name: channelName,
        creator_email: currentUser.email,
        creator_username: currentUser.username || currentUser.full_name,
        status: "published"
      });

      return stream;
    },
    onSuccess: (stream) => {
      toast.success("Going live!");
      setUploading(false);
      navigate(createPageUrl("LivestreamViewer") + `?id=${stream.id}&broadcaster=true`);
      onClose();
    },
    onError: (error) => {
      setUploading(false);
      toast.error("Failed to go live: " + error.message);
    }
  });

  const handleGoLive = () => {
    if (!liveData.title) {
      toast.error("Please enter a title");
      return;
    }

    goLiveMutation.mutate(liveData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-gradient-to-br from-red-900 to-pink-900 rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Radio className="w-8 h-8 text-red-400 animate-pulse" />
              Go Live Now
            </h2>
            <p className="text-gray-300 mt-1">Start broadcasting instantly</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm mb-2 block">Stream Title*</label>
            <Input
              value={liveData.title}
              onChange={(e) => setLiveData({ ...liveData, title: e.target.value })}
              placeholder="What's your stream about?"
              className="bg-white/10 border-white/20 text-white placeholder-gray-400"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm mb-2 block">Description</label>
            <Textarea
              value={liveData.description}
              onChange={(e) => setLiveData({ ...liveData, description: e.target.value })}
              placeholder="Tell viewers what to expect..."
              className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              rows={3}
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm mb-2 block">Category</label>
            <Select 
              value={liveData.category} 
              onValueChange={(v) => setLiveData({ ...liveData, category: v })}
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

          <div>
            <label className="text-gray-300 text-sm mb-2 block flex items-center gap-2">
              <Image className="w-4 h-4" />
              Thumbnail (Optional)
            </label>
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setLiveData({ ...liveData, thumbnail_file: file });
                  toast.success("Thumbnail selected!");
                }
              }}
              className="bg-white/10 border-white/20 text-white"
            />
            {liveData.thumbnail_file && (
              <div className="mt-2">
                <p className="text-green-400 text-xs">
                  ✓ {liveData.thumbnail_file.name}
                </p>
                {liveData.thumbnail_file.type.startsWith('image/') && (
                  <img 
                    src={URL.createObjectURL(liveData.thumbnail_file)} 
                    alt="Preview" 
                    className="mt-2 w-full h-32 object-cover rounded-lg"
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleGoLive}
              disabled={uploading || !liveData.title}
              className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-6 text-lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Radio className="w-5 h-5 mr-2" />
                  Go Live Now
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