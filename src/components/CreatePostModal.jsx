import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, Loader2, MapPin, Music, Sparkles, AtSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import MediaUploader from "./MediaUploader";

export default function CreatePostModal({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    image_url: "",
    caption: "",
    location: "",
    music_playing: "",
    vibe: "",
    is_experience: false,
    experience_type: ""
  });

  const vibes = ["energetic", "chill", "luxury", "adventure", "romantic", "party"];
  const experienceTypes = ["yacht", "exotic_car", "wine_tasting", "nightlife", "adventure", "dining", "wellness"];

  const createPostMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.SocialPost.create({
        ...data,
        likes_count: 0,
        comments_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast.success('Post created!');
      onClose();
      setFormData({
        image_url: "",
        caption: "",
        location: "",
        music_playing: "",
        vibe: "",
        is_experience: false,
        experience_type: ""
      });
    },
    onError: (error) => {
      toast.error('Failed to create post: ' + error.message);
    }
  });

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
      toast.success('Upload successful!');
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.image_url) {
      toast.error('Please upload an image or video');
      return;
    }
    if (!formData.caption) {
      toast.error('Please add a caption');
      return;
    }
    createPostMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: "100%", scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto border border-white/20"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Create Post</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {currentUser?.full_name?.[0]}
            </div>
            <div>
              <p className="text-white font-semibold">{currentUser?.full_name}</p>
              <p className="text-gray-400 text-xs flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                {currentUser?.username || currentUser?.email?.split('@')[0]}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <MediaUploader
              value={formData.image_url}
              onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
              type="both"
              label="Post Media"
              previewClassName="h-64"
            />

            {/* Caption */}
            <Textarea
              value={formData.caption}
              onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
              placeholder="Write a caption..."
              className="bg-white/5 border-white/20 text-white placeholder-gray-400 min-h-24"
            />

            {/* Location */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Add location"
                className="pl-12 bg-white/5 border-white/20 text-white placeholder-gray-400"
              />
            </div>

            {/* Music */}
            <div className="relative">
              <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
              <Input
                value={formData.music_playing}
                onChange={(e) => setFormData(prev => ({ ...prev, music_playing: e.target.value }))}
                placeholder="Add music (e.g., Artist - Song)"
                className="pl-12 bg-white/5 border-white/20 text-white placeholder-gray-400"
              />
            </div>

            {/* Vibe Selection */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Select Vibe</label>
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

            {/* Experience Toggle */}
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
              <input
                type="checkbox"
                checked={formData.is_experience}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  is_experience: e.target.checked,
                  experience_type: e.target.checked ? prev.experience_type : ""
                }))}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <label className="text-white font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Mark as Experience
                </label>
                <p className="text-gray-400 text-xs">Share a special moment or activity</p>
              </div>
            </div>

            {/* Experience Type */}
            {formData.is_experience && (
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Experience Type</label>
                <div className="flex flex-wrap gap-2">
                  {experienceTypes.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, experience_type: type }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                        formData.experience_type === type
                          ? 'bg-yellow-600 text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {type.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={createPostMutation.isPending || !formData.image_url || !formData.caption}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 text-lg"
            >
              {createPostMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                'Share Post'
              )}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}