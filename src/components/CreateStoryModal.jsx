import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, Loader2, Sparkles, Music, Search, Type, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CreateStoryModal({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // upload, text, gif
  const [formData, setFormData] = useState({
    media_url: "",
    media_type: "image",
    caption: "",
    location: "",
    music: ""
  });
  const [gifSearch, setGifSearch] = useState("");
  const [textStoryBg, setTextStoryBg] = useState("gradient-1");

  // Fetch music for stories
  const { data: musicTracks = [] } = useQuery({
    queryKey: ['youtube-music-search', formData.music],
    queryFn: async () => {
      if (!formData.music || formData.music.length < 3) return [];
      try {
        const { data } = await base44.functions.invoke('fetchYouTubeMusic', {
          query: formData.music,
          limit: 5
        });
        return data.tracks || [];
      } catch {
        return [];
      }
    },
    enabled: formData.music.length >= 3,
    staleTime: 30000
  });

  const createStoryMutation = useMutation({
    mutationFn: async (data) => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      return await base44.entities.Story.create({
        ...data,
        expires_at: expiresAt.toISOString(),
        views: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story shared! 🎉');
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to share story');
    }
  });

  const resetForm = () => {
    setFormData({
      media_url: "",
      media_type: "image",
      caption: "",
      location: "",
      music: ""
    });
    setActiveTab('upload');
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const mediaType = file.type.startsWith('video') ? 'video' : 'image';
      setFormData(prev => ({ ...prev, media_url: file_url, media_type: mediaType }));
      toast.success('Media uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleTextStory = async () => {
    if (!formData.caption) {
      toast.error('Please add some text');
      return;
    }

    // Generate text story image using AI
    try {
      setUploading(true);
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `Create a beautiful story background with the text: "${formData.caption}". 
        Style: ${textStoryBg}, modern, vibrant, Instagram story format (1080x1920), 
        typography-focused, eye-catching gradient background`,
      });
      setFormData(prev => ({ ...prev, media_url: url, media_type: 'image' }));
      setActiveTab('upload');
    } catch (error) {
      toast.error('Failed to create text story');
    } finally {
      setUploading(false);
    }
  };

  const textBgStyles = [
    { id: 'gradient-1', label: 'Sunset', class: 'bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600' },
    { id: 'gradient-2', label: 'Ocean', class: 'bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400' },
    { id: 'gradient-3', label: 'Forest', class: 'bg-gradient-to-br from-green-600 via-emerald-500 to-lime-400' },
    { id: 'gradient-4', label: 'Fire', class: 'bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400' },
    { id: 'gradient-5', label: 'Night', class: 'bg-gradient-to-br from-purple-900 via-blue-900 to-black' },
    { id: 'gradient-6', label: 'Royal', class: 'bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.media_url && !formData.caption) {
      toast.error('Please add media or text');
      return;
    }
    createStoryMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-3xl overflow-hidden border border-purple-500/30 shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  Create Story
                </h2>
                <p className="text-purple-100 text-sm">Share with your followers for 24h</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  activeTab === 'upload'
                    ? 'bg-white text-purple-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <ImageIcon className="w-4 h-4 inline mr-2" />
                Upload
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  activeTab === 'text'
                    ? 'bg-white text-purple-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Type className="w-4 h-4 inline mr-2" />
                Text
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                {formData.media_url ? (
                  <div className="relative rounded-2xl overflow-hidden">
                    {formData.media_type === 'video' ? (
                      <video src={formData.media_url} className="w-full max-h-96 object-cover" controls />
                    ) : (
                      <img src={formData.media_url} className="w-full max-h-96 object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, media_url: "" }))}
                      className="absolute top-3 right-3 p-2 bg-red-500 rounded-full hover:bg-red-600 shadow-lg"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-purple-500/30 rounded-2xl p-12 text-center bg-purple-500/5 hover:bg-purple-500/10 transition">
                    <input
                      type="file"
                      id="story-upload"
                      className="hidden"
                      accept="image/*,video/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    />
                    <label htmlFor="story-upload" className="cursor-pointer">
                      {uploading ? (
                        <Loader2 className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
                      ) : (
                        <>
                          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Upload className="w-10 h-10 text-white" />
                          </div>
                          <p className="text-white font-bold text-lg mb-2">Upload Photo or Video</p>
                          <p className="text-gray-400 text-sm">Your story will be visible for 24 hours</p>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Text Story Tab */}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <div>
                  <label className="text-white font-semibold mb-2 block">Your Message</label>
                  <textarea
                    value={formData.caption}
                    onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                    placeholder="What's on your mind?"
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white text-lg placeholder-gray-400 min-h-32 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    maxLength={200}
                  />
                  <p className="text-gray-400 text-xs mt-1">{formData.caption.length}/200</p>
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Background Style</label>
                  <div className="grid grid-cols-3 gap-3">
                    {textBgStyles.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setTextStoryBg(style.id)}
                        className={`h-20 rounded-xl ${style.class} transition-all ${
                          textStoryBg === style.id ? 'ring-4 ring-white scale-105' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <span className="text-white text-xs font-bold">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleTextStory}
                  disabled={!formData.caption || uploading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Text Story
                </Button>
              </div>
            )}

            {/* Caption (Always visible) */}
            <div>
              <label className="text-white font-semibold mb-2 block flex items-center gap-2">
                <Type className="w-4 h-4" />
                Caption (Optional)
              </label>
              <Input
                value={formData.caption}
                onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                placeholder="Add a caption..."
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                maxLength={150}
              />
            </div>

            {/* Music Search */}
            <div>
              <label className="text-white font-semibold mb-2 block flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-400" />
                Add Music
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={formData.music}
                  onChange={(e) => setFormData(prev => ({ ...prev, music: e.target.value }))}
                  placeholder="Search for a song..."
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
              
              {musicTracks.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {musicTracks.map((track, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, music: `${track.artist} - ${track.title}` }))}
                      className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg transition"
                    >
                      <p className="text-white text-sm font-semibold truncate">{track.title}</p>
                      <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={createStoryMutation.isPending || (!formData.media_url && !formData.caption)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 text-lg shadow-lg"
            >
              {createStoryMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Share Story
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}