import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReelCard from "@/components/reels/ReelCard";
import ReelsUploadModal from "@/components/reels/ReelsUploadModal";
import { motion, AnimatePresence } from "framer-motion";

export default function Reels() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: reels = [], isLoading } = useQuery({
    queryKey: ["reels"],
    queryFn: () => base44.entities.Reel.list("-created_date", 50),
    initialData: [],
  });

  // Vertical scroll snap detection
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const index = Math.round(el.scrollTop / el.clientHeight);
      setActiveIndex(index);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-40">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        style={{ top: "calc(1rem + var(--safe-area-top, 0px))" }}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Upload button */}
      {currentUser && (
        <button
          onClick={() => setShowUpload(true)}
          className="absolute top-4 right-4 z-50 w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white shadow-lg"
          style={{ top: "calc(1rem + var(--safe-area-top, 0px))" }}
        >
          <Plus className="w-5 h-5" />
        </button>
      )}

      {reels.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <p className="text-white text-2xl font-bold mb-2">No Reels Yet</p>
          <p className="text-gray-400 mb-6">Be the first to share a reel!</p>
          {currentUser && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-3 rounded-full"
            >
              <Plus className="w-5 h-5" /> Create Reel
            </button>
          )}
        </div>
      ) : (
        /* Scroll-snap vertical feed */
        <div
          ref={containerRef}
          className="h-full overflow-y-scroll"
          style={{ scrollSnapType: "y mandatory", scrollbarWidth: "none" }}
        >
          {reels.map((reel, index) => (
            <div
              key={reel.id}
              style={{ scrollSnapAlign: "start", height: "100dvh", minHeight: "-webkit-fill-available" }}
            >
              <ReelCard
                reel={reel}
                currentUser={currentUser}
                isActive={activeIndex === index}
              />
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showUpload && (
          <ReelsUploadModal
            currentUser={currentUser}
            onClose={() => setShowUpload(false)}
            onSuccess={() => queryClient.invalidateQueries(["reels"])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}