import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, MapPin, Music, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import MediaUploader from "../MediaUploader";

export default function EditPostModal({ isOpen, onClose, post }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    image_url: post?.image_url || "",
    caption: post?.caption || "",
    location: post?.location || "",
    music_playing: post?.music_playing || "",
    vibe: post?.vibe || ""
  });

  const vibes = ["energetic", "chill", "luxury", "adventure", "romantic", "party"];

  const updatePostMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.SocialPost.update(post.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast.success('Post updated!');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.caption) {
      toast.error('Please add a caption');
      return;
    }
    updatePostMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 max-h-[90vh] overflow-y-auto border border-white/20"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Edit Post</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <MediaUploader
              value={formData.image_url}
              onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
              type="both"
              label="Post Media"
              previewClassName="h-64"
            />

            <Textarea
              value={formData.caption}
              onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
              placeholder="Write a caption..."
              className="bg-white/5 border-white/20 text-white placeholder-gray-400 min-h-24"
            />

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Add location"
                className="w-full pl-12 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="relative">
              <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
              <input
                value={formData.music_playing}
                onChange={(e) => setFormData(prev => ({ ...prev, music_playing: e.target.value }))}
                placeholder="Add music (e.g., Artist - Song)"
                className="w-full pl-12 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-2 block">Vibe</label>
              <div className="flex flex-wrap gap-2">
                {vibes.map(vibe => (
                  <button
                    key={vibe}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, vibe: prev.vibe === vibe ? "" : vibe }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      formData.vibe === vibe
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={updatePostMutation.isPending || !formData.caption}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 text-lg"
            >
              {updatePostMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Post'
              )}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}