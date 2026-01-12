import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { 
  X, Upload, Sparkles, Music, Type, Palette, Zap, 
  Volume2, Mic, Users, Scissors, Play, Loader2, Send
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const filters = [
  { id: "none", name: "Original" },
  { id: "vintage", name: "Vintage" },
  { id: "vivid", name: "Vivid" },
  { id: "noir", name: "B&W" },
  { id: "warm", name: "Warm" },
  { id: "cool", name: "Cool" }
];

const sounds = [
  { id: "1", name: "Upbeat Pop", url: "https://example.com/sounds/upbeat.mp3" },
  { id: "2", name: "Chill Vibes", url: "https://example.com/sounds/chill.mp3" },
  { id: "3", name: "Epic Cinematic", url: "https://example.com/sounds/epic.mp3" },
  { id: "4", name: "Funny Comedy", url: "https://example.com/sounds/funny.mp3" }
];

export default function VideoCreationModal({ isOpen, onClose, currentUser, challenges }) {
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [selectedSound, setSelectedSound] = useState(null);
  const [soundVolume, setSoundVolume] = useState(80);
  const [voiceoverFile, setVoiceoverFile] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [textOverlay, setTextOverlay] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [uploading, setUploading] = useState(false);

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video too large. Max 100MB');
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    toast.success('Video loaded!');
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: videoFile });
      
      const hashtagArray = hashtags.split(' ').filter(h => h.startsWith('#')).map(h => h.slice(1));
      
      const videoPost = await base44.entities.VideoPost.create({
        creator_email: currentUser.email,
        creator_name: currentUser.full_name,
        video_url: file_url,
        caption,
        hashtags: hashtagArray,
        challenge_id: selectedChallenge?.id,
        filters_applied: selectedFilter !== 'none' ? [selectedFilter] : [],
        sounds_used: selectedSound ? [selectedSound.name] : [],
        engagement_score: 0
      });

      if (selectedChallenge) {
        await base44.asServiceRole.entities.Challenge.update(selectedChallenge.id, {
          total_videos: (selectedChallenge.total_videos || 0) + 1
        });
      }

      return videoPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discover-videos'] });
      toast.success('Video published! 🎉');
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
      setUploading(false);
    }
  });

  const resetForm = () => {
    setVideoFile(null);
    setVideoPreview("");
    setCaption("");
    setHashtags("");
    setSelectedFilter("none");
    setSelectedSound(null);
    setSelectedChallenge(null);
    setTextOverlay("");
    setUploading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl overflow-y-auto"
      >
        <div className="min-h-screen p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">Create Video</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Video Preview */}
              <div className="space-y-4">
                {!videoPreview ? (
                  <div className="aspect-[9/16] bg-white/5 border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center">
                    <label className="cursor-pointer text-center">
                      <Upload className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                      <p className="text-white font-bold text-xl mb-2">Upload Video</p>
                      <p className="text-gray-400 text-sm mb-4">MP4, MOV • Max 100MB • 60s max</p>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        Choose File
                      </Button>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden">
                    <video
                      ref={videoRef}
                      src={videoPreview}
                      loop
                      controls
                      className="w-full h-full object-contain"
                      style={{ 
                        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)` 
                      }}
                    />
                    {textOverlay && (
                      <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-center px-4"
                        style={{ 
                          fontSize: '32px',
                          color: textColor,
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                          maxWidth: '80%'
                        }}
                      >
                        {textOverlay}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Editing Tools */}
              <div className="space-y-4">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-white/5">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="effects">Effects</TabsTrigger>
                    <TabsTrigger value="audio">Audio</TabsTrigger>
                    <TabsTrigger value="text">Text</TabsTrigger>
                  </TabsList>

                  {/* Details Tab */}
                  <TabsContent value="details" className="space-y-4">
                    <div>
                      <label className="text-white text-sm mb-2 block">Caption</label>
                      <Textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Describe your video..."
                        className="bg-white/10 border-white/20 text-white min-h-24"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm mb-2 block">Hashtags</label>
                      <Input
                        value={hashtags}
                        onChange={(e) => setHashtags(e.target.value)}
                        placeholder="#dance #viral #trending"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    {challenges?.length > 0 && (
                      <div>
                        <label className="text-white text-sm mb-2 block">Join Challenge</label>
                        <div className="grid grid-cols-2 gap-2">
                          {challenges.map((challenge) => (
                            <button
                              key={challenge.id}
                              onClick={() => setSelectedChallenge(
                                selectedChallenge?.id === challenge.id ? null : challenge
                              )}
                              className={`p-3 rounded-lg text-left transition ${
                                selectedChallenge?.id === challenge.id
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
                              }`}
                            >
                              <div className="font-bold text-sm">#{challenge.hashtag}</div>
                              <div className="text-xs opacity-80">{challenge.total_videos || 0} videos</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Effects Tab */}
                  <TabsContent value="effects" className="space-y-4">
                    <div>
                      <label className="text-white text-sm mb-2 block">Filters</label>
                      <div className="grid grid-cols-3 gap-2">
                        {filters.map((filter) => (
                          <button
                            key={filter.id}
                            onClick={() => setSelectedFilter(filter.id)}
                            className={`p-2 rounded-lg text-sm transition ${
                              selectedFilter === filter.id
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/10 text-gray-300'
                            }`}
                          >
                            {filter.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-white text-sm mb-2 block">Brightness: {brightness}%</label>
                      <Slider value={[brightness]} onValueChange={(v) => setBrightness(v[0])} min={50} max={150} />
                    </div>
                    <div>
                      <label className="text-white text-sm mb-2 block">Contrast: {contrast}%</label>
                      <Slider value={[contrast]} onValueChange={(v) => setContrast(v[0])} min={50} max={150} />
                    </div>
                    <div>
                      <label className="text-white text-sm mb-2 block">Saturation: {saturation}%</label>
                      <Slider value={[saturation]} onValueChange={(v) => setSaturation(v[0])} min={0} max={200} />
                    </div>
                    <div>
                      <label className="text-white text-sm mb-2 block">Speed</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[0.5, 0.75, 1, 1.5, 2].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`p-2 rounded-lg text-sm ${
                              playbackSpeed === speed ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-300'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Audio Tab */}
                  <TabsContent value="audio" className="space-y-4">
                    <div>
                      <label className="text-white text-sm mb-2 block flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        Add Sound
                      </label>
                      <div className="space-y-2">
                        {sounds.map((sound) => (
                          <button
                            key={sound.id}
                            onClick={() => setSelectedSound(selectedSound?.id === sound.id ? null : sound)}
                            className={`w-full p-3 rounded-lg text-left transition ${
                              selectedSound?.id === sound.id
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            <Music className="w-4 h-4 inline mr-2" />
                            {sound.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    {selectedSound && (
                      <div>
                        <label className="text-white text-sm mb-2 block">Sound Volume: {soundVolume}%</label>
                        <Slider value={[soundVolume]} onValueChange={(v) => setSoundVolume(v[0])} max={100} />
                      </div>
                    )}
                    <div>
                      <label className="text-white text-sm mb-2 block flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        Add Voiceover
                      </label>
                      <Button
                        onClick={() => document.getElementById('voiceover-upload').click()}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        {voiceoverFile ? 'Voiceover Added ✓' : 'Upload Voiceover'}
                      </Button>
                      <input
                        id="voiceover-upload"
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          setVoiceoverFile(e.target.files?.[0]);
                          toast.success('Voiceover added');
                        }}
                        className="hidden"
                      />
                    </div>
                  </TabsContent>

                  {/* Text Tab */}
                  <TabsContent value="text" className="space-y-4">
                    <div>
                      <label className="text-white text-sm mb-2 block">Text Overlay</label>
                      <Input
                        value={textOverlay}
                        onChange={(e) => setTextOverlay(e.target.value)}
                        placeholder="Add text to your video..."
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm mb-2 block">Text Color</label>
                      <div className="grid grid-cols-6 gap-2">
                        {['#FFFFFF', '#000000', '#FFD700', '#FF1493', '#00CED1', '#7B68EE'].map((color) => (
                          <button
                            key={color}
                            onClick={() => setTextColor(color)}
                            className={`w-12 h-12 rounded-lg border-2 ${
                              textColor === color ? 'border-white' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Publish Button */}
                <Button
                  onClick={() => publishMutation.mutate()}
                  disabled={!videoFile || uploading || !currentUser}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg font-bold"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Publish Video
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}