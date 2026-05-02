import React, { useState } from "react";
import { Youtube, Twitch, Instagram, Plus, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";

const PLATFORMS = [
  {
    id: "youtube",
    label: "YouTube Live",
    icon: Youtube,
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/30",
    rtmp_url: "rtmp://a.rtmp.youtube.com/live2",
    key_placeholder: "xxxx-xxxx-xxxx-xxxx-xxxx",
    help_url: "https://studio.youtube.com/channel/UC/livestreaming",
    help_text: "YouTube Studio → Go Live → Stream settings",
  },
  {
    id: "twitch",
    label: "Twitch",
    icon: Twitch,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/30",
    rtmp_url: "rtmp://live.twitch.tv/app",
    key_placeholder: "live_xxxxxxxxxxxx",
    help_url: "https://dashboard.twitch.tv/settings/stream",
    help_text: "Twitch Dashboard → Settings → Stream → Primary Stream key",
  },
  {
    id: "instagram",
    label: "Instagram Live",
    icon: Instagram,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/30",
    rtmp_url: "rtmps://live-api-s.facebook.com:443/rtmp",
    key_placeholder: "FB-xxxxxxxxxxxx",
    help_url: "https://www.facebook.com/live/producer",
    help_text: "Instagram Live via Meta Live Producer (desktop only)",
  },
];

export default function MultistreamDestinations({ destinations, onChange }) {
  const [showKeys, setShowKeys] = useState({});

  const toggleEnabled = (id) => {
    const updated = destinations.map(d =>
      d.platform_id === id ? { ...d, enabled: !d.enabled } : d
    );
    // If not yet in list, add it
    if (!updated.find(d => d.platform_id === id)) {
      const platform = PLATFORMS.find(p => p.id === id);
      onChange([...updated, { platform_id: id, stream_key: "", enabled: true, rtmp_url: platform.rtmp_url }]);
    } else {
      onChange(updated);
    }
  };

  const setKey = (id, key) => {
    const existing = destinations.find(d => d.platform_id === id);
    if (existing) {
      onChange(destinations.map(d => d.platform_id === id ? { ...d, stream_key: key } : d));
    } else {
      const platform = PLATFORMS.find(p => p.id === id);
      onChange([...destinations, { platform_id: id, stream_key: key, enabled: true, rtmp_url: platform.rtmp_url }]);
    }
  };

  const getDestination = (id) => destinations.find(d => d.platform_id === id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-gray-300 text-sm font-medium">Multistream Destinations</label>
        <span className="text-gray-500 text-xs">Optional — stream to multiple platforms at once</span>
      </div>

      {PLATFORMS.map((platform) => {
        const dest = getDestination(platform.id);
        const isEnabled = !!dest?.enabled;
        const Icon = platform.icon;

        return (
          <div key={platform.id} className={`rounded-xl border p-3 transition ${isEnabled ? platform.bg : 'border-white/10 bg-white/5'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${isEnabled ? platform.color : 'text-gray-500'}`} />
                <span className={`text-sm font-semibold ${isEnabled ? 'text-white' : 'text-gray-500'}`}>{platform.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={platform.help_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-300 transition"
                  title={platform.help_text}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => toggleEnabled(platform.id)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${isEnabled ? 'bg-purple-600' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isEnabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {isEnabled && (
              <div className="mt-2 space-y-1">
                <p className="text-gray-500 text-xs">{platform.help_text}</p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys[platform.id] ? "text" : "password"}
                      value={dest?.stream_key || ""}
                      onChange={(e) => setKey(platform.id, e.target.value)}
                      placeholder={platform.key_placeholder}
                      className="bg-black/30 border-white/10 text-white placeholder-gray-600 text-xs pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys(s => ({ ...s, [platform.id]: !s[platform.id] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showKeys[platform.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {dest?.stream_key && (
                  <p className="text-green-400 text-xs">✓ Stream key set — will push to {platform.label} when you go live</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}