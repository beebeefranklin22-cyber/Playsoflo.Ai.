import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Play, Pause, TrendingUp, Flame, Music } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Top25Charts({ onPlayTrack, playingTrack, genreFilter = "all" }) {
  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['top25-charts', genreFilter],
    queryFn: async () => {
      const all = await base44.entities.MusicTrack.filter({ status: "published" });
      const filtered = genreFilter === "all" ? all : all.filter(t => t.genre === genreFilter);
      // Sort by stream_count descending, take top 25
      return filtered
        .sort((a, b) => (b.stream_count || 0) - (a.stream_count || 0))
        .slice(0, 25);
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-20">
        <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No tracks yet</h3>
        <p className="text-gray-400">Be the first to upload music in this genre!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-orange-400" />
        <h2 className="text-xl font-bold text-white">Top 25</h2>
        {genreFilter !== "all" && (
          <Badge className="bg-purple-500/20 text-purple-400 capitalize ml-2">
            {genreFilter.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      {tracks.map((track, idx) => {
        const isPlaying = playingTrack?.id === track.id;
        const rank = idx + 1;
        return (
          <div
            key={track.id}
            onClick={() => onPlayTrack(track)}
            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition group ${
              isPlaying
                ? "bg-purple-600/20 border border-purple-500/30"
                : "bg-white/5 hover:bg-white/10 border border-transparent"
            }`}
          >
            {/* Rank */}
            <div className="w-8 text-center flex-shrink-0">
              {rank <= 3 ? (
                <span className={`font-black text-lg ${rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : "text-amber-600"}`}>
                  {rank}
                </span>
              ) : (
                <span className="text-gray-500 font-mono text-sm">{rank}</span>
              )}
            </div>

            {/* Thumbnail */}
            <div className="relative flex-shrink-0">
              <img
                src={track.cover_art_url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100"}
                alt={track.title}
                className="w-12 h-12 object-cover rounded-lg"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100"; }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition">
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${isPlaying ? "text-purple-300" : "text-white"}`}>
                {track.title}
              </p>
              <p className="text-gray-400 text-sm truncate">
                {track.artist_name || "Unknown Artist"}
              </p>
            </div>

            {/* Stats */}
            <div className="flex-shrink-0 text-right hidden sm:block">
              {track.stream_count > 0 && (
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <TrendingUp className="w-3 h-3" />
                  <span>{(track.stream_count || 0).toLocaleString()}</span>
                </div>
              )}
              {track.genre && (
                <Badge className="bg-white/10 text-gray-300 text-xs capitalize mt-1">
                  {track.genre.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}