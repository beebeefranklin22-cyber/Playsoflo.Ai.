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
        expires_at: expiresAt.toISOString(),
        views: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('✨ Story shared with your followers!');
      onClose();
      resetForm();
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
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gray-950 rounded-3xl overflow-hidden border border-purple-500/20 shadow-2xl"
        >
          <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            
            <h2 className="text-3xl font-bold text-white mb-2">Create Story</h2>
            <p className="text-white/90 text-sm">Share moments with your followers • Disappears in 24h</p>
          </div>

          <div className="p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('media')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'media'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Media
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'text'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Type className="w-4 h-4" />
                Text
              </button>
              <button
                onClick={() => setActiveTab('gif')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'gif'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                GIF
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Media Upload Tab */}
              {activeTab === 'media' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {formData.media_url ? (
                    <div className="relative aspect-[9/16] max-h-[500px] rounded-2xl overflow-hidden bg-black">
                      {formData.media_type === 'video' ? (
                        <video src={formData.media_url} className="w-full h-full object-contain" controls />
                      ) : (
                        <img src={formData.media_url} className="w-full h-full object-contain" alt="Story preview" />
                      )}
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, media_url: "" }))}
                        className="absolute top-4 right-4 p-2.5 bg-red-500/90 backdrop-blur-sm rounded-full hover:bg-red-600 shadow-lg transition"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer group">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={(e) => handleFileUpload(e.target.files?.[0])}
                      />
                      <div className="aspect-[9/16] max-h-[500px] border-2 border-dashed border-purple-500/40 rounded-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 hover:from-purple-500/10 hover:to-pink-500/10 transition-all flex flex-col items-center justify-center gap-4 group-hover:border-purple-500/60">
                        {uploading ? (
                          <>
                            <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
                            <p className="text-gray-400 text-sm">Uploading your media...</p>
                          </>
                        ) : (
                          <>
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                              <Upload className="w-12 h-12 text-white" />
                            </div>
                            <div className="text-center px-6">
                              <p className="text-white font-bold text-xl mb-2">Upload Photo or Video</p>
                              <p className="text-gray-400 text-sm">Tap to choose from your device</p>
                              <p className="text-purple-400 text-xs mt-2">Max 100MB • JPG, PNG, MP4</p>
                            </div>
                          </>
                        )}
                      </div>
                    </label>
                  )}
                </motion.div>
              )}

              {/* Text Story Tab */}
              {activeTab === 'text' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className={`aspect-[9/16] max-h-[500px] rounded-2xl bg-gradient-to-br ${bgGradients.find(b => b.id === textBg)?.class} p-8 flex items-center justify-center`}>
                    <textarea
                      value={formData.caption}
                      onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                      placeholder="Write something inspiring..."
                      className="w-full bg-transparent border-none text-white text-3xl font-bold text-center placeholder-white/40 focus:outline-none resize-none"
                      rows={6}
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Background Style
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {bgGradients.map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => {
                            setTextBg(bg.id);
                            if (!formData.media_url) {
                              setFormData(prev => ({ ...prev, media_url: 'text-story' }));
                            }
                          }}
                          className={`h-16 rounded-xl bg-gradient-to-br ${bg.class} text-2xl flex items-center justify-center transition-all ${
                            textBg === bg.id ? 'ring-4 ring-purple-400 scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={gifSearchQuery}
                      onChange={(e) => setGifSearchQuery(e.target.value)}
                      placeholder="Search GIFs on Tenor..."
                      className="pl-12 bg-white/10 border-purple-500/30 text-white placeholder-gray-400 h-12 text-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-white/5 pr-2">
                    {/* Placeholder GIF results */}
                    {gifSearchQuery && (
                      <>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setFormData(prev => ({ 
                                ...prev, 
                                media_url: `https://media.tenor.com/example-${i}.gif`,
                                media_type: 'image'
                              }));
                              toast.success('✨ GIF selected!');
                            }}
                            className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl cursor-pointer hover:scale-105 hover:shadow-lg transition-all border border-purple-500/30 flex items-center justify-center"
                          >
                            <Sparkles className="w-8 h-8 text-purple-400" />
                          </div>
                        ))}
                      </>
                    )}
                    {!gifSearchQuery && (
                      <div className="col-span-2 text-center py-12">
                        <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-3 opacity-50" />
                        <p className="text-gray-400">Search for the perfect GIF</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Caption Input (always visible) */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <label className="text-white font-semibold mb-2 block flex items-center gap-2">
                  <Type className="w-4 h-4 text-purple-400" />
                  Caption
                </label>
                <Input
                  value={formData.caption}
                  onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                  placeholder="Say something about this story..."
                  className="bg-white/10 border-white/20 text-white placeholder-gray-500"
                  maxLength={150}
                />
                <p className="text-gray-500 text-xs mt-1.5">{formData.caption.length}/150</p>
              </div>

              {/* Music Selection */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                  <Music className="w-4 h-4 text-pink-400" />
                  Add Music
                </label>
                
                {formData.music ? (
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg border border-pink-500/30">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-pink-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Music className="w-5 h-5 text-pink-400 animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{formData.music}</p>
                        <p className="text-gray-400 text-xs">Now playing</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, music: "" }))}
                      className="p-1.5 hover:bg-white/10 rounded-full transition flex-shrink-0"
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
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-500"
                      />
                    </div>
                    
                    <div className="text-center">
                      <span className="text-gray-400 text-xs">or</span>
                    </div>

                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload(e.target.files?.[0])}
                      />
                      <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-dashed border-purple-500/30 rounded-lg hover:border-purple-500/60 transition-all text-center">
                        <Upload className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                        <p className="text-white text-sm font-medium">Upload Audio File</p>
                        <p className="text-gray-400 text-xs mt-0.5">MP3, WAV, M4A (Max 10MB)</p>
                      </div>
                    </label>
                    
                    {musicResults.length > 0 && (
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-white/5">
                        {musicResults.map((track, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, music: `${track.artist} - ${track.title}` }));
                              setMusicSearchQuery("");
                              toast.success('🎵 Music added!');
                            }}
                            className="w-full text-left p-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all group"
                          >
                            <p className="text-white text-sm font-medium truncate group-hover:text-purple-400 transition">{track.title}</p>
                            <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Preview & Submit */}
              {formData.media_url && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4"
                >
                  <p className="text-green-400 font-semibold text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Ready to share!
                  </p>
                  <p className="text-gray-400 text-xs">Your story will be visible to followers only for 24 hours</p>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={createStoryMutation.isPending || (!formData.media_url && !formData.caption)}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white font-bold py-5 text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createStoryMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sharing Story...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Share to Followers
                  </>
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}