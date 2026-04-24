import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Play, Pause, Music, Eye } from "lucide-react";
import { motion } from "framer-motion";

export default function Top25Charts({ onPlayTrack, playingTrack }) {
  // Fetch MusicTracks sorted by views/stream_count
  const { data: musicTracks = [], isLoading: loadingMusic } = useQuery({
    queryKey: ['top25-music'],
    queryFn: () => base44.entities.MusicTrack.filter({ status: "published" }),
    initialData: [],
    staleTime: 60000,
  });

  // Fetch StreamingContent sorted by views
  const { data: streamingContent = [], isLoading: loadingStreaming } = useQuery({
    queryKey: ['top25-streaming'],
    queryFn: () => base44.entities.StreamingContent.filter({ status: "published" }),
    initialData: [],
    staleTime: 60000,
  });

  const isLoading = loadingMusic || loadingStreaming;

  // Merge and sort by views (stream_count for music, views for streaming content)
  const top25 = [
    ...musicTracks.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist_name || "Unknown Artist",
      image: t.cover_art_url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400",
      views: t.stream_count || 0,
      genre: t.genre,
      type: "music",
      raw: t,
    })),
    ...streamingContent.map(c => ({
      id: c.id,
      title: c.title,
      artist: c.creator_username || "Unknown Creator",
      image: c.thumbnail_url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400",
      views: c.views || 0,
      genre: c.category,
      type: c.type,
      raw: c,
    }))
  ]
    .sort((a, b) => b.views - a.views)
    .slice(0, 25);

  const rankColor = (idx) => {
    if (idx === 0) return "from-yellow-500 to-amber-600";
    if (idx === 1) return "from-gray-400 to-gray-500";
    if (idx === 2) return "from-orange-500 to-orange-700";
    return "from-purple-700 to-purple-900";
  };

  const formatViews = (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return String(v);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="w-7 h-7 text-orange-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Top 25 Most Viewed</h2>
          <p className="text-gray-400 text-sm">Songs & videos with the most plays in the app</p>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading charts...</p>
        </div>
      )}

      {!isLoading && top25.length === 0 && (
        <div className="text-center py-20">
          <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No content yet</h3>
          <p className="text-gray-400">Charts will populate as songs and videos are played in the app.</p>
        </div>
      )}

      <div className="space-y-2">
        {top25.map((item, idx) => {
          const isPlaying = playingTrack?.id === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer group"
              onClick={() => item.type === "music" && onPlayTrack(item.raw)}
            >
              {/* Rank Badge */}
              <div className={`w-9 h-9 bg-gradient-to-br ${rankColor(idx)} rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                {idx + 1}
              </div>

              {/* Art */}
              <img
                src={item.image}
                alt={item.title}
                className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100"; }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{item.title}</p>
                <p className="text-gray-400 text-sm truncate">{item.artist}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.genre && (
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs capitalize">
                      {item.genre.replace(/_/g, ' ')}
                    </Badge>
                  )}
                  <Badge className={`text-xs ${item.type === 'music' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                    {item.type === 'music' ? '🎵 Music' : '🎬 Video'}
                  </Badge>
                </div>
              </div>

              {/* Views */}
              <div className="flex items-center gap-1 text-gray-400 text-sm flex-shrink-0">
                <Eye className="w-4 h-4" />
                <span className="font-semibold">{formatViews(item.views)}</span>
              </div>

              {/* Play button (music only) */}
              {item.type === "music" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPlayTrack(item.raw); }}
                  className="p-2 bg-purple-600 rounded-full hover:bg-purple-700 transition flex-shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white ml-0.5" />
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}