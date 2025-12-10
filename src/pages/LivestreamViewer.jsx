import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Gift, Video } from "lucide-react";
import LivestreamChat from "../components/livestream/LivestreamChat.jsx";
import LivestreamReactions from "../components/livestream/LivestreamReactions.jsx";
import LivestreamTipping from "../components/livestream/LivestreamTipping.jsx";

export default function LivestreamViewer() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [streamId, setStreamId] = useState(null);
  const [showTipping, setShowTipping] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("Error loading user:", error);
      }
    };
    fetchUser();

    // Get stream ID from URL
    const params = new URLSearchParams(window.location.search);
    setStreamId(params.get('id'));
  }, []);

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => base44.entities.StreamingContent.filter({ id: streamId }),
    enabled: !!streamId,
    select: (data) => data[0]
  });

  const { data: viewerCount = 0 } = useQuery({
    queryKey: ['viewer-count', streamId],
    queryFn: async () => {
      // Simulate viewer count - in production, track with presence
      return Math.floor(Math.random() * 1000) + 100;
    },
    refetchInterval: 10000,
    enabled: !!streamId
  });

  if (!stream) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Loading stream...</p>
      </div>
    );
  }

  const isCreator = currentUser?.email === stream.created_by;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="icon"
              className="text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-white font-bold text-xl">{stream.title}</h1>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">{stream.created_by}</span>
                <span className="flex items-center gap-1 text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  LIVE
                </span>
                <span className="flex items-center gap-1 text-gray-400">
                  <Users className="w-4 h-4" />
                  {viewerCount.toLocaleString()} watching
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowTipping(true)}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            <Gift className="w-4 h-4 mr-2" />
            Send Gift
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
              {stream.thumbnail_url ? (
                <img 
                  src={stream.thumbnail_url} 
                  alt={stream.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900">
                  <Video className="w-16 h-16 text-white/40" />
                </div>
              )}
              
              {/* Live Badge */}
              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            </div>

            {/* Reactions */}
            <LivestreamReactions streamId={streamId} currentUser={currentUser} />

            {/* Stream Info */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <h2 className="text-white font-bold text-lg mb-2">{stream.title}</h2>
              {stream.description && (
                <p className="text-gray-300 text-sm">{stream.description}</p>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="lg:col-span-1 h-[600px]">
            <LivestreamChat 
              streamId={streamId} 
              isCreator={isCreator}
              currentUser={currentUser}
            />
          </div>
        </div>
      </div>

      {/* Tipping Modal */}
      {showTipping && (
        <LivestreamTipping
          streamId={streamId}
          creatorEmail={stream.created_by}
          currentUser={currentUser}
          onClose={() => setShowTipping(false)}
        />
      )}
    </div>
  );
}