import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, Loader2, Sparkles, Music, Search, Type, Image as ImageIcon, Palette, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CreateStoryModal({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('media');
  const [formData, setFormData] = useState({
    media_url: "",
    media_type: "image",
    caption: "",
    music: "",
    visibility: "followers"
  });
  const [musicSearchQuery, setMusicSearchQuery] = useState("");
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [textBg, setTextBg] = useState("sunset");

  const { data: musicResults = [] } = useQuery({
    queryKey: ['music-search', musicSearchQuery],
    queryFn: async () => {
      if (musicSearchQuery.length < 2) return [];
      const { data } = await base44.functions.invoke('fetchYouTubeMusic', {
        query: musicSearchQuery,
        limit: 8
      });
      return data.tracks || [];
    },
    enabled: musicSearchQuery.length >= 2,
    staleTime: 30000
  });

  const createStoryMutation = useMutation({
    mutationFn: async (data) => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      return await base44.entities.Story.create({
        ...data,
        creator_profile_picture: currentUser.profile_picture || currentUser.profile_photo,
        creator_name: currentUser.full_name || currentUser.username,
        expires_at: expiresAt.toISOString(),
        views: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('✨ Story shared with your followers!');
      // Reset form so user can upload another story immediately — do NOT close
      resetForm();
      toast.info('Upload another story or close when done.', { duration: 3000 });
    }
  });

  const resetForm = () => {
    setFormData({
      media_url: "",
      media_type: "image",
      caption: "",
      music: "",
      visibility: "followers"
    });
    setMusicSearchQuery("");
    setGifSearchQuery("");
    setActiveTab('media');
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File too large. Max 100MB');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const mediaType = file.type.startsWith('video') ? 'video' : 'image';
      setFormData(prev => ({ ...prev, media_url: file_url, media_type: mediaType }));
      toast.success('📸 Media uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAudioUpload = async (file) => {
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Audio file too large. Max 10MB');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, music: file.name }));
      toast.success('🎵 Audio added!');
    } catch (error) {
      toast.error('Audio upload failed');
    } finally {
      setUploading(false);
    }
  };

  const bgGradients = [
    { id: 'sunset', class: 'from-orange-500 via-pink-500 to-purple-600', label: '🌅' },
    { id: 'ocean', class: 'from-blue-600 via-cyan-400 to-teal-300', label: '🌊' },
    { id: 'fire', class: 'from-red-600 via-orange-500 to-yellow-400', label: '🔥' },
    { id: 'forest', class: 'from-green-600 via-emerald-500 to-lime-400', label: '🌲' },
    { id: 'royal', class: 'from-purple-600 via-pink-600 to-rose-500', label: '👑' },
    { id: 'midnight', class: 'from-indigo-900 via-purple-900 to-black', label: '🌙' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.media_url && !formData.caption) {
      toast.error('⚠️ Add media or text to continue');
      return;
    }

    // For text stories, ensure media_url is set
    if (activeTab === 'text' && !formData.media_url) {
      setFormData(prev => ({ ...prev, media_url: 'text-story' }));
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
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl h-[90vh] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex"
        >
          {/* Left Panel - Preview */}
          <div className="w-[45%] bg-gradient-to-br from-gray-900 to-black border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold">Preview</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-[280px] aspect-[9/16] bg-black rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl">
                {formData.media_url && formData.media_url !== 'text-story' ? (
                  <div className="relative w-full h-full">
                    {formData.media_type === 'video' ? (
                      <video src={formData.media_url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={formData.media_url} className="w-full h-full object-cover" alt="Story" />
                    )}
                    {formData.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white text-sm font-medium">{formData.caption}</p>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'text' && formData.caption ? (
                  <div className={`w-full h-full bg-gradient-to-br ${bgGradients.find(b => b.id === textBg)?.class} flex items-center justify-center p-8`}>
                    <p className="text-white text-2xl font-bold text-center leading-relaxed">
                      {formData.caption}
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Your story preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Creation Tools */}
          <div className="flex-1 flex flex-col bg-black">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white mb-1">Create Story</h2>
              <p className="text-gray-400 text-sm">Visible for 24 hours</p>
            </div>

          <div className="flex-1 overflow-y-auto">
            {/* Tabs */}
            <div className="p-4 border-b border-white/10">
              <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('media')}
                  className={`flex-1 py-2.5 px-3 rounded-md font-medium transition flex items-center justify-center gap-2 text-sm ${
                    activeTab === 'media'
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Media
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 py-2.5 px-3 rounded-md font-medium transition flex items-center justify-center gap-2 text-sm ${
                    activeTab === 'text'
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Type className="w-4 h-4" />
                  Text
                </button>
                <button
                  onClick={() => setActiveTab('gif')}
                  className={`flex-1 py-2.5 px-3 rounded-md font-medium transition flex items-center justify-center gap-2 text-sm ${
                    activeTab === 'gif'
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  GIF
                </button>
              </div>
            </div>

            <div className="p-6">

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Media Upload Tab */}
              {activeTab === 'media' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  {!formData.media_url ? (
                    <label className="block cursor-pointer group">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={(e) => handleFileUpload(e.target.files?.[0])}
                      />
                      <div className="border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 transition-all p-12 text-center">
                        {uploading ? (
                          <>
                            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-3" />
                            <p className="text-gray-400">Uploading...</p>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-white/20 transition">
                              <Upload className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-white font-semibold mb-1">Upload media</p>
                            <p className="text-gray-400 text-sm">JPG, PNG or MP4 • Max 100MB</p>
                          </>
                        )}
                      </div>
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        {formData.media_type === 'video' ? (
                          <Video className="w-6 h-6 text-white" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">Media uploaded</p>
                        <p className="text-gray-400 text-xs">{formData.media_type}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, media_url: "" }))}
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Text Story Tab */}
              {activeTab === 'text' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="text-white font-medium mb-3 block text-sm">Your text</label>
                    <textarea
                      value={formData.caption}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, caption: e.target.value, media_url: 'text-story' }));
                      }}
                      placeholder="What's on your mind?"
                      className="w-full bg-white/5 border border-white/10 text-white text-lg p-4 rounded-xl placeholder-gray-500 focus:outline-none focus:border-white/30 resize-none"
                      rows={4}
                      maxLength={200}
                    />
                    <p className="text-gray-500 text-xs mt-2">{formData.caption.length}/200</p>
                  </div>

                  <div>
                    <label className="text-white font-medium mb-3 block flex items-center gap-2 text-sm">
                      <Palette className="w-4 h-4" />
                      Background
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {bgGradients.map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => setTextBg(bg.id)}
                          className={`h-14 rounded-lg bg-gradient-to-br ${bg.class} text-xl flex items-center justify-center transition-all ${
                            textBg === bg.id ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* GIF Tab */}
              {activeTab === 'gif' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={gifSearchQuery}
                      onChange={(e) => setGifSearchQuery(e.target.value)}
                      placeholder="Search GIFs..."
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-white/30"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-2">
                    {gifSearchQuery && (
                      <>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ 
                                ...prev, 
                                media_url: `https://media.tenor.com/example-${i}.gif`,
                                media_type: 'image'
                              }));
                              toast.success('GIF selected!');
                            }}
                            className="aspect-square bg-white/5 rounded-lg hover:bg-white/10 transition border border-white/10 flex items-center justify-center"
                          >
                            <Sparkles className="w-6 h-6 text-gray-500" />
                          </button>
                        ))}
                      </>
                    )}
                    {!gifSearchQuery && (
                      <div className="col-span-3 text-center py-16">
                        <Sparkles className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Search for GIFs</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Caption Input (for media tab) */}
              {activeTab === 'media' && formData.media_url && (
                <div>
                  <label className="text-white font-medium mb-2 block text-sm">Add caption</label>
                  <Input
                    value={formData.caption}
                    onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                    placeholder="Write a caption..."
                    className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-white/30"
                    maxLength={150}
                  />
                  <p className="text-gray-500 text-xs mt-1.5">{formData.caption.length}/150</p>
                </div>
              )}

              {/* Music Selection */}
              <div className="border-t border-white/10 pt-5">
                <label className="text-white font-medium mb-3 block flex items-center gap-2 text-sm">
                  <Music className="w-4 h-4" />
                  Add music
                </label>
                
                {formData.music ? (
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Music className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{formData.music}</p>
                      <p className="text-gray-400 text-xs">Music added</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, music: "" }))}
                      className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={musicSearchQuery}
                        onChange={(e) => setMusicSearchQuery(e.target.value)}
                        placeholder="Search songs..."
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-white/30"
                      />
                    </div>

                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload(e.target.files?.[0])}
                      />
                      <div className="p-3 border border-dashed border-white/20 rounded-lg hover:border-white/40 transition text-center">
                        <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-white text-xs">Upload audio</p>
                      </div>
                    </label>
                    
                    {musicResults.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {musicResults.map((track, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, music: `${track.artist} - ${track.title}` }));
                              setMusicSearchQuery("");
                              toast.success('Music added!');
                            }}
                            className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded-lg transition"
                          >
                            <p className="text-white text-xs font-medium truncate">{track.title}</p>
                            <p className="text-gray-400 text-[10px] truncate">{track.artist}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </form>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="p-4 border-t border-white/10 bg-black">
              <Button
                onClick={handleSubmit}
                disabled={createStoryMutation.isPending || (!formData.media_url && !formData.caption)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold h-12 rounded-xl disabled:opacity-50"
              >
                {createStoryMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  'Share to Story'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}