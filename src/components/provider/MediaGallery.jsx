import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Play, Image as ImageIcon, Video, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function MediaGallery({ media = [], onAddMedia, isOwner = false }) {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onAddMedia({ url: file_url, type, caption: '' });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const images = media.filter(m => m.type === 'image');
  const videos = media.filter(m => m.type === 'video');

  return (
    <div className="space-y-4">
      {/* Upload Controls (Owner Only) */}
      {isOwner && (
        <div className="flex gap-2">
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'image')}
              className="hidden"
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full bg-white/5 border-white/20 text-white"
              disabled={uploading}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Add Photos
            </Button>
          </label>
          <label className="flex-1">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleFileUpload(e, 'video')}
              className="hidden"
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full bg-white/5 border-white/20 text-white"
              disabled={uploading}
            >
              <Video className="w-4 h-4 mr-2" />
              Add Videos
            </Button>
          </label>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => setSelectedMedia(item)}
          >
            <img
              src={item.url}
              alt={item.caption || 'Gallery image'}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
          </motion.div>
        ))}
        {videos.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => setSelectedMedia(item)}
          >
            <video
              src={item.url}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Play className="w-12 h-12 text-white" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedMedia(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white"
              onClick={() => setSelectedMedia(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              {selectedMedia.type === 'image' ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.caption}
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className="w-full h-auto rounded-lg"
                />
              )}
              {selectedMedia.caption && (
                <p className="text-white text-center mt-4">{selectedMedia.caption}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}