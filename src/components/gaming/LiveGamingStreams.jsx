import React from "react";
import { Button } from "@/components/ui/button";
import { X, Eye, Play } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function LiveGamingStreams({ currentUser, onClose, onJoinStream }) {
  const { data: liveStreams = [], isLoading } = useQuery({
    queryKey: ['live-gaming-streams'],
    queryFn: async () => {
      return await base44.entities.StreamingContent.filter({
        type: 'gaming_stream',
        is_live: true
      }, '-created_date', 50);
    },
    refetchInterval: 5000
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/50 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white font-bold text-sm">LIVE</span>
            </div>
            <h2 className="text-3xl font-black text-white">Gaming Streams</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Loading streams...</p>
            </div>
          ) : liveStreams.length === 0 ? (
            <div className="text-center py-12">
              <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No live streams right now</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {liveStreams.map(stream => (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition group cursor-pointer"
                  onClick={() => onJoinStream(stream)}
                >
                  <div className="aspect-video bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center relative">
                    <Play className="w-16 h-16 text-white/50 group-hover:text-white/80 transition" />
                    <div className="absolute top-2 left-2 bg-red-600 px-2 py-1 rounded-full flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-white text-xs font-bold">LIVE</span>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-full flex items-center gap-1">
                      <Eye className="w-3 h-3 text-white" />
                      <span className="text-white text-xs">0</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-bold mb-1">{stream.title}</h3>
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">{stream.description}</p>
                    <p className="text-purple-400 text-sm">👤 {stream.creator_email.split('@')[0]}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}