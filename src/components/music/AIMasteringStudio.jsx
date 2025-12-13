import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, Music, Wand2, Play, Pause, Download, CheckCircle, 
  Loader2, Upload, Volume2, Radio, Waves, TrendingUp 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const masteringStyles = [
  { 
    id: "pop", 
    name: "Pop", 
    icon: "🎤",
    description: "Bright, punchy, radio-ready sound",
    settings: { loudness: -14, compression: "medium", brightness: "bright" }
  },
  { 
    id: "hip_hop", 
    name: "Hip Hop", 
    icon: "🎧",
    description: "Deep bass, tight drums, clear vocals",
    settings: { loudness: -11, compression: "heavy", brightness: "warm" }
  },
  { 
    id: "electronic", 
    name: "Electronic", 
    icon: "🔊",
    description: "Loud, wide, energetic club sound",
    settings: { loudness: -10, compression: "heavy", brightness: "bright" }
  },
  { 
    id: "rock", 
    name: "Rock", 
    icon: "🎸",
    description: "Dynamic, powerful, guitar-focused",
    settings: { loudness: -12, compression: "medium", brightness: "neutral" }
  },
  { 
    id: "jazz", 
    name: "Jazz", 
    icon: "🎷",
    description: "Natural, spacious, detailed",
    settings: { loudness: -16, compression: "light", brightness: "warm" }
  },
  { 
    id: "classical", 
    name: "Classical", 
    icon: "🎻",
    description: "Pristine dynamics, wide soundstage",
    settings: { loudness: -18, compression: "light", brightness: "neutral" }
  }
];

export default function AIMasteringStudio({ currentUser, tracks }) {
  const qc = useQueryClient();
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("pop");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [customSettings, setCustomSettings] = useState({
    loudness: -14,
    compression: "medium",
    brightness: "neutral",
    stereo_width: 100
  });
  const [playingPreview, setPlayingPreview] = useState(null);

  const { data: masterings = [] } = useQuery({
    queryKey: ['music-masterings', currentUser?.email],
    queryFn: () => base44.entities.MusicMastering.filter({ artist_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, track_id }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return { file_url, track_id };
    },
    onSuccess: ({ file_url, track_id }) => {
      toast.success('Track uploaded! Ready for mastering.');
      setAudioFile(null);
      masteringMutation.mutate({
        audio_url: file_url,
        track_id: track_id,
        mastering_style: selectedStyle,
        mastering_settings: customSettings
      });
    },
  });

  const masteringMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('processMusicMastering', data);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-masterings'] });
      qc.invalidateQueries({ queryKey: ['currentUser'] });
      setShowUploadModal(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Mastering failed');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (masteringId) => {
      await base44.entities.MusicMastering.update(masteringId, {
        status: 'approved',
        approved_date: new Date().toISOString()
      });
      return masteringId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-masterings'] });
      toast.success('Master approved! Ready for distribution.');
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File too large. Max 100MB');
        return;
      }
      setAudioFile(file);
    }
  };

  const handleMaster = () => {
    if (!audioFile) {
      toast.error('Please select an audio file');
      return;
    }

    if (currentUser.usd_balance < 4.99) {
      toast.error('Insufficient balance. Need $4.99 for mastering.');
      return;
    }

    uploadMutation.mutate({ file: audioFile, track_id: selectedTrack?.id });
  };

  const selectStyle = (styleId) => {
    setSelectedStyle(styleId);
    const style = masteringStyles.find(s => s.id === styleId);
    if (style) {
      setCustomSettings({
        ...customSettings,
        loudness: style.settings.loudness,
        compression: style.settings.compression,
        brightness: style.settings.brightness
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Wand2 className="w-7 h-7 text-purple-400" />
            AI Mastering Studio
          </h2>
          <p className="text-gray-400">Professional-quality mastering powered by AI • $4.99 per track</p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600"
        >
          <Upload className="w-4 h-4 mr-2" />
          Master New Track
        </Button>
      </div>

      {/* Mastering History */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Your Mastered Tracks</h3>
        {masterings.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {masterings.map((mastering) => {
              const track = tracks?.find(t => t.id === mastering.track_id);
              const isPlaying = playingPreview === mastering.id;

              return (
                <Card key={mastering.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-bold">{track?.title || 'Mastered Track'}</h4>
                          <p className="text-gray-400 text-sm capitalize">{mastering.mastering_style}</p>
                        </div>
                      </div>
                      <Badge className={`${
                        mastering.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        mastering.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        mastering.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {mastering.status === 'approved' ? '✓ Approved' : mastering.status}
                      </Badge>
                    </div>

                    {mastering.status === 'completed' && (
                      <div className="space-y-3">
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Preview Master</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPlayingPreview(isPlaying ? null : mastering.id)}
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          </div>
                          <audio 
                            src={mastering.mastered_audio_url} 
                            controls 
                            className="w-full"
                            style={{ height: '40px' }}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => approveMutation.mutate(mastering.id)}
                            disabled={approveMutation.isPending}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Master
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(mastering.mastered_audio_url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {mastering.status === 'processing' && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-purple-400 animate-spin mr-2" />
                        <span className="text-gray-400">Processing mastering...</span>
                      </div>
                    )}

                    {mastering.status === 'approved' && (
                      <div className="text-center text-green-400 text-sm py-2">
                        ✓ Approved on {new Date(mastering.approved_date).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Wand2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No mastered tracks yet</h3>
              <p className="text-gray-400 mb-4">Upload your first track to experience AI mastering</p>
              <Button onClick={() => setShowUploadModal(true)} className="bg-purple-600">
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload & Master Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => !masteringMutation.isPending && setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-3xl font-bold text-white mb-2">AI Mastering Studio</h2>
              <p className="text-gray-400 mb-6">Upload your mixed track and let AI perfect it</p>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Upload Mixed Track</label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center bg-white/5 hover:bg-white/10 transition">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">
                      {audioFile ? audioFile.name : 'Click to upload audio file'}
                    </p>
                    <p className="text-gray-400 text-sm">WAV, MP3, FLAC • Max 100MB</p>
                  </label>
                </div>
              </div>

              {/* Mastering Style */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Mastering Style</label>
                <div className="grid md:grid-cols-3 gap-3">
                  {masteringStyles.map((style) => (
                    <Card
                      key={style.id}
                      onClick={() => selectStyle(style.id)}
                      className={`cursor-pointer transition ${
                        selectedStyle === style.id
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">{style.icon}</div>
                        <h4 className="text-white font-bold mb-1">{style.name}</h4>
                        <p className="text-gray-400 text-xs">{style.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="mb-6 bg-white/5 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Advanced Settings
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Compression</label>
                    <Select 
                      value={customSettings.compression} 
                      onValueChange={(v) => setCustomSettings({...customSettings, compression: v})}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="heavy">Heavy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Brightness</label>
                    <Select 
                      value={customSettings.brightness} 
                      onValueChange={(v) => setCustomSettings({...customSettings, brightness: v})}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="bright">Bright</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">Professional AI Mastering</p>
                    <p className="text-gray-400 text-sm">Preview before finalizing</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-2xl">$4.99</p>
                    <p className="text-gray-400 text-xs">Your balance: ${currentUser?.usd_balance?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  disabled={masteringMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMaster}
                  disabled={!audioFile || masteringMutation.isPending || uploadMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {masteringMutation.isPending || uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Master Track ($4.99)
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}