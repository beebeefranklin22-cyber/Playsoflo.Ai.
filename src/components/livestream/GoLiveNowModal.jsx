import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Radio, Loader2, Image, Camera, Smartphone, Monitor } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MultistreamDestinations from "./MultistreamDestinations";
import { manageLiveStream } from "@/functions/manageLiveStream";

export default function GoLiveNowModal({ isOpen, onClose, currentUser }) {
  const navigate = useNavigate();
  const [liveData, setLiveData] = useState({
    title: "",
    description: "",
    category: "entertainment",
    thumbnail_file: null,
    source_type: "phone", // 'phone', 'irl_camera', 'desktop'
  });
  const [multistreamDests, setMultistreamDests] = useState([]);
  const [uploading, setUploading] = useState(false);

  const goLiveMutation = useMutation({
    mutationFn: async (data) => {
      setUploading(true);
      
      // Upload thumbnail if provided
      let thumbnail_url = null;
      if (data.thumbnail_file) {
        toast.info("Uploading thumbnail...");
        const thumbUpload = await base44.integrations.Core.UploadFile({
          file: data.thumbnail_file
        });
        thumbnail_url = thumbUpload.file_url;
      }

      // Generate unique channel name
      const channelName = `livestream_${Date.now()}_${(currentUser.id || currentUser.email || 'user').substring(0, 8)}`;
      
      // Create livestream
      const stream = await base44.entities.StreamingContent.create({
        title: data.title,
        type: 'live_event',
        category: data.category,
        description: data.description,
        thumbnail_url,
        is_live: true,
        rating: 0,
        requires_subscription: false,
        betting_available: false,
        agora_channel_name: channelName,
        creator_email: currentUser.email,
        creator_username: currentUser.username || currentUser.full_name,
        status: "live",
        stream_started_at: new Date().toISOString(),
        source_type: data.source_type || "phone",
      });

      // Save multistream destinations if any
      const activeDests = multistreamDests.filter(d => d.enabled && d.stream_key);
      if (activeDests.length > 0) {
        await manageLiveStream({ action: 'save_multistream', streamId: stream.id, destinations: activeDests })
          .catch(() => {}); // non-blocking
      }

      // Notify followers and subscribers that the creator is live
      const [followers, subscribers] = await Promise.all([
        base44.entities.Follow.filter({ following_email: currentUser.email }),
        base44.entities.UserSubscription.filter({ creator_email: currentUser.email, status: "active" })
      ]);

      const recipientEmails = new Set([
        ...followers.map(f => f.follower_email),
        ...subscribers.map(s => s.subscriber_email)
      ]);

      await Promise.all([...recipientEmails].map(email =>
        base44.entities.Notification.create({
          recipient_email: email,
          type: 'live',
          title: `🔴 ${currentUser.full_name || 'Someone you follow'} is LIVE!`,
          message: `"${data.title}" — Watch now`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          action_url: `/LivestreamViewer?id=${stream.id}`,
          read: false
        }).catch(() => {})
      ));

      return stream;
    },
    onSuccess: (stream) => {
      toast.success("Going live!");
      setUploading(false);
      navigate(createPageUrl("LivestreamViewer") + `?id=${stream.id}&broadcaster=true`);
      onClose();
    },
    onError: (error) => {
      setUploading(false);
      toast.error("Failed to go live: " + error.message);
    }
  });

  const handleGoLive = () => {
    if (!liveData.title) {
      toast.error("Please enter a title");
      return;
    }

    goLiveMutation.mutate(liveData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-gradient-to-br from-red-900 to-pink-900 rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Radio className="w-8 h-8 text-red-400 animate-pulse" />
              Go Live Now
            </h2>
            <p className="text-gray-300 mt-1">Start broadcasting instantly</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm mb-2 block">Stream Title*</label>
            <Input
              value={liveData.title}
              onChange={(e) => setLiveData({ ...liveData, title: e.target.value })}
              placeholder="What's your stream about?"
              className="bg-white/10 border-white/20 text-white placeholder-gray-400"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm mb-2 block">Description</label>
            <Textarea
              value={liveData.description}
              onChange={(e) => setLiveData({ ...liveData, description: e.target.value })}
              placeholder="Tell viewers what to expect..."
              className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              rows={3}
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm mb-2 block">Category</label>
            <Select 
              value={liveData.category} 
              onValueChange={(v) => setLiveData({ ...liveData, category: v })}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="gaming">Gaming</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="lifestyle">Lifestyle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stream Source Selection */}
          <div>
            <label className="text-gray-300 text-sm mb-2 block">Stream Source</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'phone', icon: Smartphone, label: 'Phone / Webcam', desc: 'Built-in or browser camera' },
                { id: 'irl_camera', icon: Camera, label: 'IRL Camera', desc: 'GoPro, Sony ZV-1, OBSBOT, etc.' },
                { id: 'desktop', icon: Monitor, label: 'Desktop', desc: 'Screen or capture card' },
              ].map(src => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => setLiveData(d => ({ ...d, source_type: src.id }))}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition ${
                    liveData.source_type === src.id
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
                  }`}
                >
                  <src.icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{src.label}</span>
                  <span className="text-[10px] opacity-60 leading-tight">{src.desc}</span>
                </button>
              ))}
            </div>
            {liveData.source_type === 'irl_camera' && (
              <p className="text-purple-300 text-xs mt-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                📷 Connect your IRL camera (GoPro, Sony ZV-1, OBSBOT Tiny Pro, DJI Action, etc.) via USB before going live. It will appear as a selectable camera source in the broadcast view.
              </p>
            )}
            {liveData.source_type === 'desktop' && (
              <p className="text-blue-300 text-xs mt-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                🖥️ For HDMI cameras, connect via a capture card (e.g. Elgato Cam Link). It will show as a video device you can select while live.
              </p>
            )}
          </div>

          {/* Multistream destinations */}
          <MultistreamDestinations
            destinations={multistreamDests}
            onChange={setMultistreamDests}
          />

          <div>
            <label className="text-gray-300 text-sm mb-2 block flex items-center gap-2">
              <Image className="w-4 h-4" />
              Thumbnail (Optional)
            </label>
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setLiveData({ ...liveData, thumbnail_file: file });
                  toast.success("Thumbnail selected!");
                }
              }}
              className="bg-white/10 border-white/20 text-white"
            />
            {liveData.thumbnail_file && (
              <div className="mt-2">
                <p className="text-green-400 text-xs">
                  ✓ {liveData.thumbnail_file.name}
                </p>
                {liveData.thumbnail_file.type.startsWith('image/') && (
                  <img 
                    src={URL.createObjectURL(liveData.thumbnail_file)} 
                    alt="Preview" 
                    className="mt-2 w-full h-32 object-cover rounded-lg"
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleGoLive}
              disabled={uploading || !liveData.title}
              className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-6 text-lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Radio className="w-5 h-5 mr-2" />
                  Go Live Now
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              disabled={uploading}
              variant="outline"
              className="bg-white/5 border-white/20 hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}