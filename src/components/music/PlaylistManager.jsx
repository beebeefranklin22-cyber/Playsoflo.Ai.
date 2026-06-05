import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Trash2, Plus, Music, X, Play, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function PlaylistManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [expandedPlaylist, setExpandedPlaylist] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ["my-playlists", currentUser?.email],
    queryFn: () => base44.entities.Playlist.filter({ owner_email: currentUser.email }),
    enabled: !!currentUser?.email,
  });

  // Fetch all video details for expanded playlist
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["playlist-videos", expandedPlaylist?.id],
    queryFn: async () => {
      if (!expandedPlaylist?.video_ids?.length) return [];
      const all = await Promise.all(
        expandedPlaylist.video_ids.map(id =>
          base44.entities.StreamingContent.filter({ id }).then(r => r[0]).catch(() => null)
        )
      );
      return all.filter(Boolean);
    },
    enabled: !!expandedPlaylist?.id,
  });

  const createMutation = useMutation({
    mutationFn: (title) => base44.entities.Playlist.create({ title, owner_email: currentUser.email, video_ids: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-playlists"] });
      setNewTitle("");
      setShowCreateForm(false);
      toast.success("Playlist created!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Playlist.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-playlists"] });
      if (expandedPlaylist) setExpandedPlaylist(null);
      toast.success("Playlist deleted");
    },
  });

  const updateVideosMutation = useMutation({
    mutationFn: ({ playlistId, video_ids }) => base44.entities.Playlist.update(playlistId, { video_ids }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["my-playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlist-videos", vars.playlistId] });
      // Update local expanded playlist state so UI stays in sync
      setExpandedPlaylist(prev => prev ? { ...prev, video_ids: vars.video_ids } : prev);
    },
  });

  const handleDragEnd = (result) => {
    if (!result.destination || !expandedPlaylist) return;
    const ids = Array.from(expandedPlaylist.video_ids);
    const [removed] = ids.splice(result.source.index, 1);
    ids.splice(result.destination.index, 0, removed);
    setExpandedPlaylist(prev => ({ ...prev, video_ids: ids }));
    updateVideosMutation.mutate({ playlistId: expandedPlaylist.id, video_ids: ids });
  };

  const removeVideo = (videoId) => {
    if (!expandedPlaylist) return;
    const newIds = expandedPlaylist.video_ids.filter(id => id !== videoId);
    setExpandedPlaylist(prev => ({ ...prev, video_ids: newIds }));
    updateVideosMutation.mutate({ playlistId: expandedPlaylist.id, video_ids: newIds });
    toast.success("Removed from playlist");
  };

  const toggleExpand = (playlist) => {
    if (expandedPlaylist?.id === playlist.id) {
      setExpandedPlaylist(null);
    } else {
      setExpandedPlaylist(playlist);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Music className="w-5 h-5 text-purple-400" />
          My Playlists
        </h2>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-purple-600 hover:bg-purple-700 h-9"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Playlist
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 p-4 bg-white/5 rounded-xl border border-white/10">
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && newTitle.trim() && createMutation.mutate(newTitle.trim())}
                placeholder="Playlist name..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <Button
                onClick={() => newTitle.trim() && createMutation.mutate(newTitle.trim())}
                disabled={!newTitle.trim() || createMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 h-9"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
              <button onClick={() => setShowCreateForm(false)} className="p-2 hover:bg-white/10 rounded-lg transition">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlists */}
      {playlists.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No playlists yet. Create one to start organizing your music videos!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map(playlist => (
            <div key={playlist.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Playlist header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggleExpand(playlist)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{playlist.title}</p>
                    <p className="text-gray-400 text-xs">{playlist.video_ids?.length || 0} video{playlist.video_ids?.length !== 1 ? "s" : ""}</p>
                  </div>
                  {expandedPlaylist?.id === playlist.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${playlist.title}"?`)) deleteMutation.mutate(playlist.id);
                  }}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>

              {/* Expanded video list */}
              <AnimatePresence>
                {expandedPlaylist?.id === playlist.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/10 overflow-hidden"
                  >
                    {videosLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                      </div>
                    ) : expandedPlaylist.video_ids?.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-6">
                        No videos yet. Add music videos to this playlist from the Music Videos tab.
                      </p>
                    ) : (
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="playlist-videos">
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className="p-3 space-y-2"
                            >
                              {expandedPlaylist.video_ids.map((videoId, index) => {
                                const video = videos.find(v => v.id === videoId);
                                return (
                                  <Draggable key={videoId} draggableId={videoId} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition ${
                                          snapshot.isDragging ? "bg-purple-500/20 shadow-lg" : "bg-white/5 hover:bg-white/8"
                                        }`}
                                      >
                                        {/* Drag handle */}
                                        <div {...provided.dragHandleProps} className="touch-none">
                                          <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                        </div>

                                        {/* Thumbnail */}
                                        <div className="w-12 h-9 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                                          {video?.thumbnail_url ? (
                                            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                              <Play className="w-4 h-4 text-gray-600" />
                                            </div>
                                          )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-white text-sm font-medium truncate">
                                            {video?.title || `Video ${index + 1}`}
                                          </p>
                                          {video?.creator_username && (
                                            <p className="text-gray-500 text-xs truncate">@{video.creator_username}</p>
                                          )}
                                        </div>

                                        {/* Position badge */}
                                        <span className="text-gray-600 text-xs w-5 text-center flex-shrink-0">{index + 1}</span>

                                        {/* Remove */}
                                        <button
                                          onClick={() => removeVideo(videoId)}
                                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition flex-shrink-0"
                                        >
                                          <X className="w-3.5 h-3.5 text-red-400" />
                                        </button>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    )}
                    <p className="text-gray-600 text-xs text-center pb-3">
                      Drag to reorder
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}