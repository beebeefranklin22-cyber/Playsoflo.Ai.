import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, X, Play, Image as ImageIcon, Heart, Pin, 
  Trash2, Loader2, Upload, MapPin, Grid, LayoutGrid
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function GallerySection({ userEmail, isOwnProfile, currentUser }) {
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid or masonry
  const [uploading, setUploading] = useState(false);
  const [newMedia, setNewMedia] = useState({
    media_url: "",
    media_type: "photo",
    caption: "",
    location: "",
    tags: []
  });

  const { data: galleryItems = [], isLoading } = useQuery({
    queryKey: ['gallery', userEmail],
    queryFn: () => base44.entities.UserGallery.filter({ user_email: userEmail }, '-created_date'),
    enabled: !!userEmail
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (!currentUser?.email) throw new Error("User not authenticated");
      return base44.entities.UserGallery.create({
        ...data,
        user_email: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery', userEmail] });
      setShowUploadModal(false);
      setNewMedia({ media_url: "", media_type: "photo", caption: "", location: "", tags: [] });
      toast.success('Added to gallery!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add to gallery');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UserGallery.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery', userEmail] });
      toast.success('Removed from gallery');
    }
  });

  const likeMutation = useMutation({
    mutationFn: async (item) => {
      if (!currentUser?.email) {
        toast.error("Please log in to like");
        return;
      }
      const likedBy = item.liked_by || [];
      const isLiked = likedBy.includes(currentUser.email);
      return base44.entities.UserGallery.update(item.id, {
        liked_by: isLiked 
          ? likedBy.filter(e => e !== currentUser.email)
          : [...likedBy, currentUser.email],
        likes_count: isLiked ? (item.likes_count || 1) - 1 : (item.likes_count || 0) + 1
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gallery', userEmail] })
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, is_pinned }) => 
      base44.entities.UserGallery.update(id, { is_pinned: !is_pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gallery', userEmail] })
  });

  const fileInputRef = React.useRef(null);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const mediaType = file.type.startsWith('video/') ? 'video' : 'photo';
      setNewMedia(prev => ({ ...prev, media_url: file_url, media_type: mediaType }));
      toast.success('Upload successful!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const pinnedItems = galleryItems.filter(item => item.is_pinned);
  const regularItems = galleryItems.filter(item => !item.is_pinned);
  const sortedItems = [...pinnedItems, ...regularItems];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Gallery</h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${viewMode === "grid" ? 'bg-purple-600' : 'hover:bg-white/10'}`}
            >
              <Grid className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => setViewMode("masonry")}
              className={`p-2 rounded ${viewMode === "masonry" ? 'bg-purple-600' : 'hover:bg-white/10'}`}
            >
              <LayoutGrid className="w-4 h-4 text-white" />
            </button>
          </div>
          {isOwnProfile && (
            <Button onClick={() => setShowUploadModal(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : galleryItems.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
          <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No photos or videos yet</p>
          {isOwnProfile && (
            <Button onClick={() => setShowUploadModal(true)} className="mt-4 bg-purple-600 hover:bg-purple-700">
              Upload Your First Media
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid grid-cols-3 md:grid-cols-4 gap-2"
          : "columns-2 md:columns-3 lg:columns-4 gap-2 space-y-2"
        }>
          {sortedItems.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedMedia(item)}
              className={`relative group cursor-pointer rounded-lg overflow-hidden ${
                viewMode === "grid" ? 'aspect-square' : 'break-inside-avoid mb-2'
              }`}
            >
              {item.media_type === 'video' ? (
                <>
                  <video src={item.media_url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-10 h-10 text-white/80" />
                  </div>
                </>
              ) : (
                <img src={item.media_url} className="w-full h-full object-cover" />
              )}

              {item.is_pinned && (
                <div className="absolute top-2 left-2">
                  <Pin className="w-4 h-4 text-purple-400 fill-purple-400" />
                </div>
              )}

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); likeMutation.mutate(item); }}
                  className="p-2 bg-white/20 rounded-full hover:bg-white/30"
                >
                  <Heart className={`w-5 h-5 ${
                    (item.liked_by || []).includes(currentUser?.email) 
                      ? 'text-pink-400 fill-pink-400' 
                      : 'text-white'
                  }`} />
                </button>
                {isOwnProfile && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); pinMutation.mutate({ id: item.id, is_pinned: item.is_pinned }); }}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/30"
                    >
                      <Pin className={`w-5 h-5 ${item.is_pinned ? 'text-purple-400 fill-purple-400' : 'text-white'}`} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(item.id); }}
                      className="p-2 bg-white/20 rounded-full hover:bg-red-500/50"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  </>
                )}
              </div>

              {item.likes_count > 0 && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
                  <Heart className="w-3 h-3 fill-white" />
                  {item.likes_count}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Add to Gallery</h3>
                <button onClick={() => setShowUploadModal(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center">
                 {newMedia.media_url ? (
                   <div className="relative">
                     {newMedia.media_type === 'video' ? (
                       <video src={newMedia.media_url} className="max-h-48 mx-auto rounded-lg" controls />
                     ) : (
                       <img src={newMedia.media_url} className="max-h-48 mx-auto rounded-lg object-cover" />
                     )}
                     <button 
                       onClick={() => setNewMedia(prev => ({ ...prev, media_url: "" }))}
                       className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
                     >
                       <X className="w-4 h-4 text-white" />
                     </button>
                   </div>
                 ) : (
                   <>
                     <input
                       ref={fileInputRef}
                       type="file"
                       className="hidden"
                       accept="image/*,video/*"
                       onChange={(e) => handleFileUpload(e.target.files?.[0])}
                     />
                     <Button
                       type="button"
                       onClick={() => fileInputRef.current?.click()}
                       disabled={uploading}
                       variant="outline"
                       className="bg-white/10 border-white/20 hover:bg-white/20"
                     >
                       {uploading ? (
                         <>
                           <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                           Uploading...
                         </>
                       ) : (
                         <>
                           <Upload className="w-4 h-4 mr-2" />
                           Upload Photo or Video
                         </>
                       )}
                     </Button>
                     <p className="text-gray-500 text-xs mt-3">or paste a URL below</p>
                     <input
                       type="text"
                       placeholder="https://..."
                       className="mt-2 w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                       onChange={(e) => {
                         const url = e.target.value.trim();
                         if (url) setNewMedia(prev => ({ ...prev, media_url: url, media_type: 'photo' }));
                       }}
                     />
                   </>
                 )}
                </div>

                <Input
                  value={newMedia.caption}
                  onChange={(e) => setNewMedia(prev => ({ ...prev, caption: e.target.value }))}
                  placeholder="Add a caption..."
                  className="bg-white/10 border-white/20 text-white"
                />

                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={newMedia.location}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Add location..."
                    className="pl-10 bg-white/10 border-white/20 text-white"
                  />
                </div>

                <Button
                  onClick={() => createMutation.mutate(newMedia)}
                  disabled={!newMedia.media_url || createMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to Gallery'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

      {/* Media Viewer */}
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95"
            onClick={() => setSelectedMedia(null)}
          >
            <button 
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 rounded-full z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl max-h-[90vh] w-full"
            >
              {selectedMedia.media_type === 'video' ? (
                <video src={selectedMedia.media_url} className="max-h-[80vh] mx-auto rounded-lg" controls autoPlay />
              ) : (
                <img src={selectedMedia.media_url} className="max-h-[80vh] mx-auto rounded-lg object-contain" />
              )}

              <div className="mt-4 text-center">
                {selectedMedia.caption && (
                  <p className="text-white mb-2">{selectedMedia.caption}</p>
                )}
                {selectedMedia.location && (
                  <p className="text-gray-400 text-sm flex items-center justify-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedMedia.location}
                  </p>
                )}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    onClick={() => likeMutation.mutate(selectedMedia)}
                    className="flex items-center gap-2 text-white hover:text-pink-400 transition"
                  >
                    <Heart className={`w-6 h-6 ${
                      (selectedMedia.liked_by || []).includes(currentUser?.email) 
                        ? 'text-pink-400 fill-pink-400' 
                        : ''
                    }`} />
                    {selectedMedia.likes_count || 0}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
    </div>
  );
}