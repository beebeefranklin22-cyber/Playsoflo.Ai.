import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Upload, X, DollarSign, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ExclusivePostModal({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [postData, setPostData] = useState({
    caption: "",
    image_url: "",
    price_usd: 5,
    is_exclusive: true,
    exclusive_tier: "all" // all, tier1, tier2, tier3
  });
  const [uploading, setUploading] = useState(false);

  const createExclusiveMutation = useMutation({
    mutationFn: async (data) => {
      // Create the exclusive post
      const post = await base44.entities.SocialPost.create({
        ...data,
        likes_count: 0,
        comments_count: 0
      });
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['social-posts']);
      toast.success("Exclusive post created!");
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to create post: " + error.message);
    }
  });

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPostData(prev => ({ ...prev, image_url: file_url }));
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!postData.caption && !postData.image_url) {
      toast.error("Add content or an image");
      return;
    }

    createExclusiveMutation.mutate(postData);
  };

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
          className="w-full max-w-2xl bg-gradient-to-br from-purple-900/90 to-pink-900/90 rounded-3xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Create Exclusive Post</h3>
                <p className="text-gray-300 text-sm">Monetize your premium content</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Content
              </label>
              <Textarea
                value={postData.caption}
                onChange={(e) => setPostData({ ...postData, caption: e.target.value })}
                placeholder="Share something exclusive..."
                className="bg-white/10 border-white/20 text-white min-h-[120px]"
              />
            </div>

            {postData.image_url && (
              <div className="relative">
                <img src={postData.image_url} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
                <button
                  onClick={() => setPostData({ ...postData, image_url: "" })}
                  className="absolute top-2 right-2 p-2 bg-red-500 rounded-full hover:bg-red-600 transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <input
                id="exclusive-image-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files?.[0])}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => document.getElementById('exclusive-image-upload').click()}
                disabled={uploading}
                variant="outline"
                className="flex-1 bg-blue-500/20 border-blue-500/30"
              >
                {uploading ? "Uploading..." : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Add Image
                  </>
                )}
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Price (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="number"
                    min="1"
                    value={postData.price_usd}
                    onChange={(e) => setPostData({ ...postData, price_usd: Number(e.target.value) })}
                    className="pl-10 bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Access Tier
                </label>
                <select
                  value={postData.exclusive_tier}
                  onChange={(e) => setPostData({ ...postData, exclusive_tier: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="all">All Subscribers</option>
                  <option value="tier1">Tier 1+</option>
                  <option value="tier2">Tier 2+</option>
                  <option value="tier3">Tier 3 Only</option>
                </select>
              </div>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-white font-semibold">Exclusive Content</span>
              </div>
              <p className="text-gray-300 text-sm">
                Only subscribers and one-time purchasers can view this content. 
                You'll earn {postData.price_usd > 0 ? `$${postData.price_usd}` : 'per view'} from each purchase.
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={createExclusiveMutation.isPending || (!postData.caption && !postData.image_url)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-6 text-lg font-bold"
            >
              {createExclusiveMutation.isPending ? "Creating..." : "Publish Exclusive Post"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}