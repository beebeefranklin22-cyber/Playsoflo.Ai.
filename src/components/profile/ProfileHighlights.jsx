import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Star, Plus, X, Play, Grid, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ProfileHighlights({ profileUser, isOwnProfile, posts = [], reels = [] }) {
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const highlights = profileUser?.highlights || [];

  const saveMutation = useMutation({
    mutationFn: (newHighlights) => base44.auth.updateMe({ highlights: newHighlights }),
    onSuccess: () => {
      queryClient.invalidateQueries(["profile-user"]);
      toast.success("Highlights updated!");
      setShowPicker(false);
    },
  });

  const removeHighlight = (id) => {
    const updated = highlights.filter((h) => h.id !== id);
    saveMutation.mutate(updated);
  };

  const addHighlight = (item, type) => {
    if (highlights.find((h) => h.id === item.id)) {
      toast.info("Already highlighted");
      return;
    }
    if (highlights.length >= 6) {
      toast.info("Max 6 highlights");
      return;
    }
    const newHighlight = {
      id: item.id,
      type,
      thumbnail: type === "reel" ? item.thumbnail_url : item.image_url,
      caption: type === "reel" ? (item.caption || "Reel") : (item.caption || "Post"),
    };
    saveMutation.mutate([...highlights, newHighlight]);
  };

  const allPickable = [
    ...posts.filter((p) => p.image_url).map((p) => ({ ...p, _type: "post" })),
    ...reels.map((r) => ({ ...r, _type: "reel" })),
  ];

  if (highlights.length === 0 && !isOwnProfile) return null;

  return (
    <div className="px-4 py-3 border-t border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">
          <Star className="w-4 h-4 text-yellow-400" /> Highlights
        </h3>
        {isOwnProfile && (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
        {highlights.map((h) => (
          <div key={h.id} className="relative flex-shrink-0 group">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/10 border-2 border-purple-500/50">
              {h.thumbnail ? (
                <img src={h.thumbnail} className="w-full h-full object-cover" alt={h.caption} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {h.type === "reel" ? <Play className="w-6 h-6 text-gray-400" /> : <Grid className="w-6 h-6 text-gray-400" />}
                </div>
              )}
              {h.type === "reel" && (
                <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-0.5">
                  <Play className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <p className="text-gray-400 text-[10px] text-center mt-1 truncate w-20">{h.caption}</p>
            {isOwnProfile && (
              <button
                onClick={() => removeHighlight(h.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        ))}

        {isOwnProfile && highlights.length === 0 && (
          <button
            onClick={() => setShowPicker(true)}
            className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-purple-500/40 flex flex-col items-center justify-center gap-1 hover:border-purple-500/70 transition"
          >
            <Plus className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 text-[10px]">Pin</span>
          </button>
        )}
      </div>

      {/* Picker Modal */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPicker(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gray-900 rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Pin to Highlights</h3>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
                <button onClick={() => setShowPicker(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              {allPickable.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No posts or reels to pin yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {allPickable.map((item) => {
                    const isHighlighted = highlights.find((h) => h.id === item.id);
                    const thumb = item._type === "reel" ? item.thumbnail_url : item.image_url;
                    return (
                      <button
                        key={item.id}
                        onClick={() => addHighlight(item, item._type)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                          isHighlighted ? "border-yellow-400" : "border-transparent hover:border-purple-400"
                        }`}
                      >
                        {thumb ? (
                          <img src={thumb} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            {item._type === "reel" ? <Play className="w-6 h-6 text-gray-500" /> : <Grid className="w-6 h-6 text-gray-500" />}
                          </div>
                        )}
                        {isHighlighted && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                            <Star className="w-3 h-3 text-gray-900" />
                          </div>
                        )}
                        {item._type === "reel" && (
                          <div className="absolute bottom-1 left-1 bg-black/60 rounded-full px-1 py-0.5">
                            <Play className="w-2.5 h-2.5 text-white inline" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}