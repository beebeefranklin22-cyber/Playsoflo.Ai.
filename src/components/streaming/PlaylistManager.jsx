import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, ListVideo, Check, Trash2, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PlaylistManager({ vodId, userEmail, onClose }) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: playlists = [] } = useQuery({
    queryKey: ["playlists", userEmail],
    queryFn: () => base44.entities.Playlist.filter({ owner_email: userEmail }),
    enabled: !!userEmail
  });

  const createMutation = useMutation({
    mutationFn: (title) =>
      base44.entities.Playlist.create({
        title,
        owner_email: userEmail,
        video_ids: vodId ? [vodId] : [],
        is_public: false
      }),
    onSuccess: () => {
      setNewTitle("");
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ["playlists", userEmail] });
      toast.success("Playlist created!");
    }
  });

  const toggleVideoMutation = useMutation({
    mutationFn: ({ playlist, add }) => {
      const current = playlist.video_ids || [];
      const updated = add
        ? [...new Set([...current, vodId])]
        : current.filter((id) => id !== vodId);
      return base44.entities.Playlist.update(playlist.id, { video_ids: updated });
    },
    onSuccess: (_, { add }) => {
      queryClient.invalidateQueries({ queryKey: ["playlists", userEmail] });
      toast.success(add ? "Added to playlist!" : "Removed from playlist");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Playlist.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists", userEmail] });
      toast.success("Playlist deleted");
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-bold text-lg">Save to Playlist</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Playlist list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {playlists.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-6">No playlists yet. Create one below!</p>
          )}
          {playlists.map((playlist) => {
            const inPlaylist = (playlist.video_ids || []).includes(vodId);
            return (
              <div
                key={playlist.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group"
              >
                <button
                  onClick={() => toggleVideoMutation.mutate({ playlist, add: !inPlaylist })}
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                    inPlaylist ? "bg-purple-600 border-purple-600" : "border-gray-500 hover:border-purple-400"
                  }`}
                >
                  {inPlaylist && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{playlist.title}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                    {playlist.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {(playlist.video_ids || []).length} videos
                  </p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(playlist.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg transition text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Create new playlist */}
        <div className="p-4 border-t border-white/10">
          {creating ? (
            <div className="flex gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Playlist name..."
                className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400"
                onKeyDown={(e) => e.key === "Enter" && newTitle.trim() && createMutation.mutate(newTitle.trim())}
                autoFocus
              />
              <Button
                onClick={() => newTitle.trim() && createMutation.mutate(newTitle.trim())}
                disabled={!newTitle.trim() || createMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Create
              </Button>
              <Button variant="ghost" onClick={() => setCreating(false)} className="text-gray-400">
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setCreating(true)}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 gap-2"
            >
              <Plus className="w-4 h-4" />
              New Playlist
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}