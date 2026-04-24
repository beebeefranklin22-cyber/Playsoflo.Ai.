import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Play, Pause, Music } from "lucide-react";

export default function RelatedTracksSidebar({ currentTrack, onPlayTrack, playingTrack }) {
  const { data: allTracks = [] } = useQuery({
    queryKey: ['related-tracks-sidebar'],
    queryFn: () => base44.entities.MusicTrack.filter({ status: "published" }),
    initialData: [],
    staleTime: 60000,
  });

  // Filter related: same genre first, then others, exclude current
  const related = [
    ...allTracks.filter(t => t.id !== currentTrack?.id && t.genre === currentTrack?.genre),
    ...allTracks.filter(t => t.id !== currentTrack?.id && t.genre !== currentTrack?.genre),
  ].slice(0, 20);

  if (!currentTrack) return null;

  return (
    <div className="w-80 flex-shrink-0 bg-white/5 rounded-2xl p-4 border border-white/10 overflow-y-auto max-h-[600px]">
      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <Music className="w-5 h-5 text-purple-400" />
        Up Next
      </h3>

      {related.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          No related tracks found
        </div>
      )}

      <div className="space-y-2">
        {related.map((track, idx) => {
          const isPlaying = playingTrack?.id === track.id;
          return (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track)}
              className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition group ${
                isPlaying ? "bg-purple-600/20 border border-purple-500/30" : "hover:bg-white/10"
              }`}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={track.cover_art_url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100"}
                  alt={track.title}
                  className="w-12 h-12 object-cover rounded-lg"
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100"; }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition">
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white ml-0.5" />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isPlaying ? "text-purple-300" : "text-white"}`}>
                  {track.title}
                </p>
                <p className="text-gray-400 text-xs truncate">{track.artist_name || "Unknown"}</p>
                {track.genre && (
                  <p className="text-purple-400 text-xs capitalize mt-0.5">{track.genre.replace(/_/g, ' ')}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}