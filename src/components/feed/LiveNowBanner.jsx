import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Radio, Eye, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveNowBanner() {
  const navigate = useNavigate();

  const { data: liveStreams = [] } = useQuery({
    queryKey: ["home-live-streams"],
    queryFn: async () => {
      const streams = await base44.entities.StreamingContent.filter({ is_live: true, status: "live" });
      const cutoff = Date.now() - 8 * 60 * 60 * 1000;
      return streams.filter(s => !s.stream_started_at || new Date(s.stream_started_at).getTime() > cutoff).slice(0, 3);
    },
    refetchInterval: 30000,
    staleTime: 15000,
    initialData: [],
  });

  if (liveStreams.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-3 bg-gradient-to-r from-red-900/60 to-rose-900/40 border border-red-500/30 rounded-2xl p-3 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 font-bold text-xs uppercase tracking-wider">Live Now</span>
          <span className="ml-auto text-xs text-gray-400">{liveStreams.length} stream{liveStreams.length > 1 ? "s" : ""}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {liveStreams.map(stream => (
            <button
              key={stream.id}
              onClick={() => navigate(createPageUrl("LivestreamViewer") + `?id=${stream.id}`)}
              className="flex-shrink-0 flex items-center gap-2 bg-black/40 hover:bg-black/60 border border-red-500/20 rounded-xl px-3 py-2 transition active:scale-95"
            >
              {stream.thumbnail_url ? (
                <img src={stream.thumbnail_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-red-900 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-red-400" />
                </div>
              )}
              <div className="text-left">
                <p className="text-white text-xs font-semibold line-clamp-1 max-w-[100px]">{stream.title}</p>
                <div className="flex items-center gap-1 text-gray-400 text-[10px]">
                  <Eye className="w-2.5 h-2.5" />
                  {stream.views || 0}
                </div>
              </div>
              <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
            </button>
          ))}
          <button
            onClick={() => navigate(createPageUrl("Streaming"))}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold transition"
          >
            See All
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}