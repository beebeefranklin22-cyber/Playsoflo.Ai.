import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Star, Plus, X, Play, Grid, Loader2, Pencil, Check, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Each highlight album: { id, name, items: [{ id, type, thumbnail, caption }] }

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ProfileHighlights({ profileUser, isOwnProfile, posts = [], reels = [] }) {
  const [showAlbumPicker, setShowAlbumPicker] = useState(null); // albumId or "new"
  const [newAlbumName, setNewAlbumName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(null); // albumId being renamed
  const [editNameValue, setEditNameValue] = useState("");

  const highlights = profileUser?.highlights_v2 || [];

  const saveHighlights = async (updated) => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ highlights_v2: updated });
      toast.success("Highlights updated!");
    } catch {
      toast.error("Failed to update highlights");
    } finally {
      setSaving(false);
    }
  };

  const createAlbum = () => {
    const name = newAlbumName.trim() || "Highlights";
    const album = { id: generateId(), name, items: [] };
    const updated = [...highlights, album];
    saveHighlights(updated);
    setNewAlbumName("");
    setShowAlbumPicker(album.id);
  };

  const deleteAlbum = (albumId) => {
    saveHighlights(highlights.filter(a => a.id !== albumId));
  };

  const renameAlbum = (albumId) => {
    if (!editNameValue.trim()) return;
    const updated = highlights.map(a =>
      a.id === albumId ? { ...a, name: editNameValue.trim() } : a
    );
    saveHighlights(updated);
    setEditingName(null);
  };

  const toggleItemInAlbum = (albumId, item, type) => {
    const album = highlights.find(a => a.id === albumId);
    if (!album) return;
    const exists = album.items.find(i => i.id === item.id);
    let newItems;
    if (exists) {
      newItems = album.items.filter(i => i.id !== item.id);
    } else {
      const thumb = type === "reel" ? item.thumbnail_url : item.image_url;
      newItems = [...album.items, { id: item.id, type, thumbnail: thumb, caption: item.caption || (type === "reel" ? "Reel" : "Post") }];
    }
    const updated = highlights.map(a => a.id === albumId ? { ...a, items: newItems } : a);
    saveHighlights(updated);
  };

  const allPickable = [
    ...posts.filter(p => p.image_url || p.media_url).map(p => ({ ...p, _type: "post" })),
    ...reels.map(r => ({ ...r, _type: "reel" })),
  ];

  const activeAlbum = showAlbumPicker ? highlights.find(a => a.id === showAlbumPicker) : null;

  if (highlights.length === 0 && !isOwnProfile) return null;

  return (
    <div className="px-4 py-3 border-t border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">
          <Star className="w-4 h-4 text-yellow-400" /> Highlights
        </h3>
        {isOwnProfile && (
          <button
            onClick={() => setShowAlbumPicker("new")}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        )}
      </div>

      {/* Albums Row */}
      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
        {highlights.map(album => {
          const cover = album.items?.[0]?.thumbnail;
          return (
            <div key={album.id} className="flex-shrink-0 flex flex-col items-center gap-1 group relative">
              {/* Album Circle */}
              <button
                onClick={() => isOwnProfile && setShowAlbumPicker(album.id)}
                className="relative w-[68px] h-[68px] rounded-full overflow-hidden border-2 border-purple-500/60 hover:border-purple-400 transition bg-white/10"
              >
                {cover ? (
                  <img src={cover} className="w-full h-full object-cover" alt={album.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                {/* item count badge */}
                {album.items.length > 1 && (
                  <div className="absolute bottom-0 right-0 bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {album.items.length}
                  </div>
                )}
              </button>

              {/* Name (editable) */}
              {editingName === album.id ? (
                <div className="flex items-center gap-1 w-[72px]">
                  <input
                    autoFocus
                    value={editNameValue}
                    onChange={e => setEditNameValue(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && renameAlbum(album.id)}
                    className="w-full text-[10px] bg-white/10 border border-white/20 rounded px-1 text-white outline-none"
                  />
                  <button onClick={() => renameAlbum(album.id)}>
                    <Check className="w-3 h-3 text-green-400" />
                  </button>
                </div>
              ) : (
                <p
                  className="text-gray-300 text-[11px] text-center truncate w-[72px] cursor-pointer"
                  onClick={() => {
                    if (isOwnProfile) {
                      setEditingName(album.id);
                      setEditNameValue(album.name);
                    }
                  }}
                >
                  {album.name}
                </p>
              )}

              {/* Delete button (own profile) */}
              {isOwnProfile && (
                <button
                  onClick={() => deleteAlbum(album.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex transition"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          );
        })}

        {/* Create new placeholder */}
        {isOwnProfile && (
          <button
            onClick={() => setShowAlbumPicker("new")}
            className="flex-shrink-0 flex flex-col items-center gap-1"
          >
            <div className="w-[68px] h-[68px] rounded-full border-2 border-dashed border-purple-500/40 flex items-center justify-center hover:border-purple-500/70 transition bg-white/5">
              <Plus className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-gray-500 text-[11px]">New</p>
          </button>
        )}
      </div>

      {/* Picker / Create Modal */}
      <AnimatePresence>
        {showAlbumPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowAlbumPicker(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-gray-900 rounded-t-3xl border border-white/10 flex flex-col"
              style={{ maxHeight: "85vh" }}
            >
              {/* Modal Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10">
                <h3 className="text-white font-bold">
                  {showAlbumPicker === "new" ? "Create Highlight Album" : `Edit "${activeAlbum?.name}"`}
                </h3>
                <div className="flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
                  <button onClick={() => setShowAlbumPicker(null)}>
                    <X className="w-5 h-5 text-gray-400 hover:text-white" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5" style={{ WebkitOverflowScrolling: "touch" }}>
                {/* New album creation */}
                {showAlbumPicker === "new" ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-2">Album Name</p>
                      <input
                        autoFocus
                        value={newAlbumName}
                        onChange={e => setNewAlbumName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && createAlbum()}
                        placeholder="e.g. Travel, Work, Favorites..."
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      onClick={createAlbum}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition"
                    >
                      Create Album
                    </button>
                  </div>
                ) : (
                  /* Select items for existing album */
                  <>
                    <p className="text-gray-400 text-sm mb-3">
                      Tap to add or remove — {activeAlbum?.items?.length || 0} item{activeAlbum?.items?.length !== 1 ? "s" : ""}
                    </p>
                    {allPickable.length === 0 ? (
                      <p className="text-gray-400 text-center py-12">No posts or reels to add yet.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {allPickable.map(item => {
                          const inAlbum = activeAlbum?.items?.find(i => i.id === item.id);
                          const thumb = item._type === "reel" ? item.thumbnail_url : item.image_url;
                          return (
                            <button
                              key={item.id}
                              onClick={() => toggleItemInAlbum(activeAlbum.id, item, item._type)}
                              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                                inAlbum ? "border-purple-400" : "border-transparent hover:border-white/30"
                              }`}
                            >
                              {thumb ? (
                                <img src={thumb} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                  {item._type === "reel" ? <Play className="w-6 h-6 text-gray-500" /> : <Grid className="w-6 h-6 text-gray-500" />}
                                </div>
                              )}
                              {inAlbum && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                              {item._type === "reel" && (
                                <div className="absolute bottom-1 left-1 bg-black/60 rounded-full p-0.5">
                                  <Play className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
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