import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Upload, Users, Scissors, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function DuetStitchModal({ isOpen, onClose, originalVideo, currentUser, mode = "duet" }) {
  const queryClient = useQueryClient();
  const [myVideoFile, setMyVideoFile] = useState(null);
  const [myVideoPreview, setMyVideoPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleMyVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMyVideoFile(file);
    setMyVideoPreview(URL.createObjectURL(file));
    toast.success('Your video loaded!');
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: myVideoFile });
      
      const videoPost = await base44.entities.VideoPost.create({
        creator_email: currentUser.email,
        creator_name: currentUser.full_name,
        video_url: file_url,
        caption,
        is_duet: mode === 'duet',
        is_stitch: mode === 'stitch',
        original_video_id: originalVideo.id,
        hashtags: originalVideo.hashtags || [],
        challenge_id: originalVideo.challenge_id,
        engagement_score: 0
      });

      return videoPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discover-videos'] });
      toast.success(`${mode === 'duet' ? 'Duet' : 'Stitch'} published! 🎉`);
      onClose();
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
      setUploading(false);
    }
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl overflow-y-auto p-6"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">
            {mode === 'duet' ? 'Create Duet' : 'Create Stitch'}
          </h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Original Video */}
          <div>
            <h3 className="text-white font-semibold mb-2">Original Video</h3>
            <div className="aspect-[9/16] bg-black rounded-2xl overflow-hidden">
              <video src={originalVideo.video_url} loop controls className="w-full h-full object-contain" />
            </div>
            <div className="mt-2 text-gray-400 text-sm">
              by @{originalVideo.creator_name}
            </div>
          </div>

          {/* Your Video */}
          <div>
            <h3 className="text-white font-semibold mb-2">Your Video</h3>
            {!myVideoPreview ? (
              <div className="aspect-[9/16] bg-white/5 border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center">
                <label className="cursor-pointer text-center">
                  <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <p className="text-white font-bold mb-2">Upload Your Video</p>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Choose File
                  </Button>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleMyVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="aspect-[9/16] bg-black rounded-2xl overflow-hidden">
                <video src={myVideoPreview} loop controls className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* Caption */}
        <div className="mb-6">
          <label className="text-white text-sm mb-2 block">Caption</label>
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={`Add your ${mode} caption...`}
            className="bg-white/10 border-white/20 text-white"
          />
        </div>

        {/* Publish */}
        <Button
          onClick={() => publishMutation.mutate()}
          disabled={!myVideoFile || uploading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg font-bold"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Publish {mode === 'duet' ? 'Duet' : 'Stitch'}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}