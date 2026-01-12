import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Video } from "lucide-react";
import LivestreamChat from "../components/livestream/LivestreamChat.jsx";
import LivestreamReactions from "../components/livestream/LivestreamReactions.jsx";
import PPVAccessGate from "../components/creator/PPVAccessGate.jsx";
import LivestreamPolls from "../components/livestream/LivestreamPolls.jsx";
import LivestreamQA from "../components/livestream/LivestreamQA.jsx";
import TippingIntegration from "../components/creator/TippingIntegration.jsx";
import AgoraVideoPlayer from "../components/livestream/AgoraVideoPlayer.jsx";
import CoHostManager from "../components/livestream/CoHostManager.jsx";
import ReactionEffects from "../components/livestream/ReactionEffects.jsx";
import PPVTicketGate from "../components/livestream/PPVTicketGate.jsx";
import LiveTippingOverlay from "../components/livestream/LiveTippingOverlay.jsx";

export default function LivestreamViewer() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [streamId, setStreamId] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');

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
    const id = params.get('id');
    setStreamId(id);

    // Track viewer analytics
    if (id) {
      const trackViewing = async () => {
        try {
          await base44.entities.ViewerAnalytics.create({
            content_id: id,
            is_currently_watching: true
          });
        } catch (err) {
          console.log("Analytics tracking error:", err);
        }
      };
      trackViewing();

      // Cleanup when leaving
      return () => {
        const cleanup = async () => {
          try {
            const analytics = await base44.entities.ViewerAnalytics.filter({
              content_id: id,
              created_by: user?.email
            });
            if (analytics[0]) {
              await base44.entities.ViewerAnalytics.update(analytics[0].id, {
                is_currently_watching: false
              });
            }
          } catch (err) {
            console.log("Cleanup error:", err);
          }
        };
        cleanup();
      };
    }
  }, []);

  // Determine if user is broadcaster
  const params = new URLSearchParams(window.location.search);
  const isBroadcaster = params.get('broadcaster') === 'true';

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: async () => {
      const streams = await base44.entities.StreamingContent.filter({ id: streamId });
      return streams[0];
    },
    enabled: !!streamId
  });

  // Check if stream has pricing tiers
  const { data: streamTiers = [] } = useQuery({
    queryKey: ['stream-tiers', streamId],
    queryFn: async () => {
      return await base44.entities.LivestreamPricingTier.filter({ stream_id: streamId });
    },
    enabled: !!streamId
  });

  // Check user's membership status
  const { data: myMembership } = useQuery({
    queryKey: ['my-membership', stream?.created_by, currentUser?.email],
    queryFn: async () => {
      if (!currentUser || !stream) return null;
      const memberships = await base44.entities.MembershipSubscription.filter({
        creator_email: stream.created_by,
        subscriber_email: currentUser.email,
        status: 'active'
      });
      return memberships[0];
    },
    enabled: !!currentUser && !!stream
  });

  const { data: viewerCount = 0 } = useQuery({
    queryKey: ['viewer-count', streamId],
    queryFn: async () => {
      const analytics = await base44.entities.ViewerAnalytics.filter({ 
        content_id: streamId,
        is_currently_watching: true
      });
      return analytics.length;
    },
    refetchInterval: 5000,
    enabled: !!streamId
  });

  if (!stream) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Loading stream...</p>
      </div>
    );
  }

  const isStreamCreator = currentUser?.email === stream?.created_by;

  // Wrap content in PPV gate if applicable
  const content = (
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

          <div className="flex items-center gap-2">
            {myMembership && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                <Crown className="w-3 h-3 mr-1" />
                Member
              </Badge>
            )}
            <LiveTippingOverlay
              streamId={streamId}
              creatorEmail={stream.created_by}
              currentUser={currentUser}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
              {stream.is_live && stream.agora_channel_name ? (
                <>
                  <AgoraVideoPlayer 
                    channelName={stream.agora_channel_name}
                    role={isBroadcaster ? "host" : "audience"}
                    onViewerJoin={() => {
                      // Track viewer analytics
                    }}
                  />
                  <ReactionEffects streamId={streamId} />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                  <div className="text-center">
                    <Video className="w-16 h-16 text-white/40 mx-auto mb-4" />
                    <p className="text-white text-lg font-semibold">Stream Ended</p>
                    <p className="text-gray-400 text-sm">This livestream is no longer active</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reactions */}
            <LivestreamReactions streamId={streamId} currentUser={currentUser} />

            {/* Co-Host Manager */}
            <CoHostManager streamId={streamId} currentUser={currentUser} isCreator={isStreamCreator} />

            {/* Stream Info */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <h2 className="text-white font-bold text-lg mb-2">{stream.title}</h2>
              {stream.description && (
                <p className="text-gray-300 text-sm">{stream.description}</p>
              )}
            </div>
          </div>

          {/* Interactive Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/10 h-[600px] flex flex-col">
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-3 text-sm font-medium transition ${
                    activeTab === 'chat' 
                      ? 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-500' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('polls')}
                  className={`flex-1 py-3 text-sm font-medium transition ${
                    activeTab === 'polls' 
                      ? 'bg-blue-500/20 text-blue-300 border-b-2 border-blue-500' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Polls
                </button>
                <button
                  onClick={() => setActiveTab('qa')}
                  className={`flex-1 py-3 text-sm font-medium transition ${
                    activeTab === 'qa' 
                      ? 'bg-green-500/20 text-green-300 border-b-2 border-green-500' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Q&A
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'chat' && (
                  <LivestreamChat 
                    streamId={streamId} 
                    isCreator={isStreamCreator}
                    currentUser={currentUser}
                  />
                )}
                {activeTab === 'polls' && (
                  <div className="h-full overflow-y-auto p-4">
                    <LivestreamPolls
                      streamId={streamId}
                      isCreator={isStreamCreator}
                      currentUser={currentUser}
                    />
                  </div>
                )}
                {activeTab === 'qa' && (
                  <div className="h-full overflow-y-auto p-4">
                    <LivestreamQA
                      streamId={streamId}
                      isCreator={isStreamCreator}
                      currentUser={currentUser}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );

  // Check if stream has paid tiers and user needs access  
  if (streamTiers.length > 0 && !isStreamCreator) {
    return (
      <PPVTicketGate stream={stream} currentUser={currentUser}>
        {content}
      </PPVTicketGate>
    );
  }

  return content;
}