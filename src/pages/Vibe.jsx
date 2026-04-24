import React, { useState, useEffect } from "react";
import PageWrapper from "@/components/PageWrapper";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Music, Play, Pause, Heart, TrendingUp, Flame,
  Mic2, Users, ChevronLeft,
  Clock, Upload, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import MusicPlayer from "../components/MusicPlayer";
import Top25Charts from "../components/music/Top25Charts";
import MusicSearchBar from "../components/music/MusicSearchBar";

export default function Vibe() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("charts");
  const [playingTrack, setPlayingTrack] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [loadingMore, setLoadingMore] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // No demo/sample tracks

  // Fetch trending tracks from the app
  const { data: musicData, isLoading, refetch, error: queryError } = useQuery({
    queryKey: ['music-discovery', selectedGenre, activeSearch],
    queryFn: async () => {
      // Load user-uploaded tracks (fast, local DB)
      const userTracks = await base44.entities.MusicTrack.filter({
        status: "published"
      });

      // For search, fetch from YouTube
      if (activeSearch?.trim() && activeSearch.length >= 2) {
        try {
          const youtubeResponse = await base44.functions.invoke('fetchYouTubeMusic', { 
            query: activeSearch,
            maxResults: 20
          });
          
          // Handle different response structures
          let youtubeTracks = [];
          if (youtubeResponse?.data?.data?.tracks) {
            youtubeTracks = youtubeResponse.data.data.tracks;
          } else if (youtubeResponse?.data?.tracks) {
            youtubeTracks = youtubeResponse.data.tracks;
          } else if (youtubeResponse?.tracks) {
            youtubeTracks = youtubeResponse.tracks;
          } else if (Array.isArray(youtubeResponse?.data)) {
            youtubeTracks = youtubeResponse.data;
          } else if (Array.isArray(youtubeResponse)) {
            youtubeTracks = youtubeResponse;
          }

          const filteredUserTracks = userTracks.filter(t => 
            t.title?.toLowerCase().includes(activeSearch.toLowerCase()) ||
            t.artist_name?.toLowerCase().includes(activeSearch.toLowerCase())
          );
          const mergedTracks = [...filteredUserTracks, ...(youtubeTracks || [])];
          
          return { 
            tracks: mergedTracks, 
            source: 'mixed' 
          };
        } catch (err) {
          return {
            tracks: userTracks.filter(t => 
              t.title?.toLowerCase().includes(activeSearch.toLowerCase()) ||
              t.artist_name?.toLowerCase().includes(activeSearch.toLowerCase())
            ),
            source: 'app'
          };
        }
      }
      
      // Apply genre filter
      const filtered = selectedGenre !== 'all' 
        ? userTracks.filter(t => t.genre === selectedGenre)
        : userTracks;
      
      return { 
        tracks: filtered, 
        source: 'app' 
      };
    },
    initialData: { tracks: [], source: 'app' },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: true
  });

  const allTracks = musicData?.tracks || [];

  const { data: fanPools = [] } = useQuery({
    queryKey: ['fan-pools'],
    queryFn: async () => {
      try {
        return await base44.entities.FanPool.filter({
          status: "active"
        });
      } catch (error) {
        console.error('Fan pools fetch error:', error);
        return [];
      }
    },
    initialData: []
  });

  const { data: myTracks = [] } = useQuery({
    queryKey: ['my-tracks', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      try {
        return await base44.entities.MusicTrack.filter({
          artist_email: currentUser.email
        });
      } catch (error) {
        console.error('My tracks fetch error:', error);
        return [];
      }
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: listeningHistory = [] } = useQuery({
    queryKey: ['listening-history', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      try {
        const history = await base44.entities.ListeningHistory.filter({
          user_email: currentUser.email
        });
        return history.sort((a, b) => new Date(b.played_at) - new Date(a.played_at));
      } catch (error) {
        console.error('History fetch error:', error);
        return [];
      }
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Generate smart recommendations based on history
  useEffect(() => {
    if (listeningHistory.length > 0 && allTracks.length > 0) {
      const historyGenres = listeningHistory.map(h => h.genre).filter(Boolean);
      const historyArtists = listeningHistory.map(h => h.artist_name).filter(Boolean);
      const historyIds = listeningHistory.map(h => h.track_id);

      const scored = allTracks
        .filter(t => !historyIds.includes(t.id || t.video_id))
        .map(track => {
          let score = 0;
          if (historyGenres.includes(track.genre)) score += 3;
          if (historyArtists.includes(track.artist_name || track.artist)) score += 2;
          score += Math.random(); // Add randomness
          return { track, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(item => item.track)
        .slice(0, 20);

      setRecommendations(scored);
    }
  }, [listeningHistory, allTracks]);

  const contributeToPoolMutation = useMutation({
    mutationFn: async ({ pool_id, amount, tier }) => {
      const pool = await base44.entities.FanPool.filter({ id: pool_id });
      const currentPool = pool[0];

      const updatedContributors = [
        ...(currentPool.contributors || []),
        {
          email: currentUser.email,
          amount,
          tier,
          contributed_at: new Date().toISOString()
        }
      ];

      const updatedRaised = (currentPool.raised_amount || 0) + amount;

      const updatedTiers = currentPool.tier_rewards.map(t => {
        if (t.tier_name === tier) {
          return { ...t, slots_taken: (t.slots_taken || 0) + 1 };
        }
        return t;
      });

      await base44.entities.FanPool.update(pool_id, {
        contributors: updatedContributors,
        raised_amount: updatedRaised,
        tier_rewards: updatedTiers,
        status: updatedRaised >= currentPool.goal_amount ? "funded" : "active"
      });

      return { pool_id, amount, tier };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fan-pools']);
      alert('✅ Contribution successful! Check your email for access details.');
    }
  });

  const genres = [
    { id: "all", label: "All Genres", emoji: "🎵" },
    { id: "hip_hop", label: "Hip Hop", emoji: "🎤" },
    { id: "rap", label: "Rap", emoji: "🔥" },
    { id: "r_n_b", label: "R&B", emoji: "💜" },
    { id: "pop", label: "Pop", emoji: "⭐" },
    { id: "rock", label: "Rock", emoji: "🎸" },
    { id: "electronic", label: "Electronic", emoji: "🎧" },
    { id: "jazz", label: "Jazz", emoji: "🎺" },
    { id: "latin", label: "Latin", emoji: "💃" },
    { id: "country", label: "Country", emoji: "🤠" },
    { id: "afrobeat", label: "Afrobeat", emoji: "🌍" },
    { id: "reggae", label: "Reggae", emoji: "🏝️" },
    { id: "trap", label: "Trap", emoji: "💎" },
    { id: "drill", label: "Drill", emoji: "⚡" },
    { id: "soul", label: "Soul", emoji: "✨" },
    { id: "funk", label: "Funk", emoji: "🕺" },
    { id: "gospel", label: "Gospel", emoji: "🙏" },
    { id: "dancehall", label: "Dancehall", emoji: "🔊" },
    { id: "indie", label: "Indie", emoji: "🌙" },
    { id: "alternative", label: "Alternative", emoji: "🎭" },
    { id: "classical", label: "Classical", emoji: "🎻" }
  ];

  const filteredTracks = allTracks.filter(track => {
    const q = activeSearch.toLowerCase();
    const matchesSearch = !q ||
      track.title?.toLowerCase().includes(q) ||
      track.name?.toLowerCase().includes(q) ||
      track.artist_name?.toLowerCase().includes(q) ||
      track.artist?.toLowerCase().includes(q) ||
      track.description?.toLowerCase().includes(q);
    const matchesGenre = selectedGenre === 'all' || track.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const handleSearch = async (query) => {
    setActiveSearch(query);
    if (query.trim()) {
      setActiveTab("discover");
      setSearchLoading(true);
      await refetch();
      setSearchLoading(false);
    }
  };

  const handleTrackClick = async (track) => {
    setPlayingTrack(track);
    
    // Update user's current music and notify followers
    if (currentUser) {
      await base44.auth.updateMe({
        current_music: `${track.title || track.name} - ${track.artist_name || track.artist || 'Unknown'}`
      });

      // Notify followers about music listening
      try {
        const followers = await base44.entities.Follow.filter({ 
          following_email: currentUser.email 
        });

        // Get notification preferences and send notifications
        const notificationPromises = followers.map(async (follower) => {
          const prefs = await base44.entities.NotificationPreferences.filter({
            user_email: follower.follower_email
          });
          
          const shouldNotify = !prefs[0] || prefs[0].push_notifications?.friend_listening !== false;
          
          if (shouldNotify) {
            return base44.entities.Notification.create({
              recipient_email: follower.follower_email,
              type: "friend_listening",
              title: "Friend is listening to music",
              message: `${currentUser.full_name} is now listening to ${track.title || track.name}`,
              sender_email: currentUser.email,
              sender_name: currentUser.full_name,
              sender_photo: currentUser.profile_photo,
              action_url: `/vibe`
            });
          }
        });

        await Promise.all(notificationPromises);
      } catch (error) {
        console.log('Error notifying followers:', error);
      }
    }
  };

  const handleNext = () => {
    const currentIdx = filteredTracks.findIndex(t => t.id === playingTrack?.id);
    const nextTrack = filteredTracks[(currentIdx + 1) % filteredTracks.length];
    setPlayingTrack(nextTrack);
  };

  const handlePrevious = () => {
    const currentIdx = filteredTracks.findIndex(t => t.id === playingTrack?.id);
    const prevTrack = filteredTracks[(currentIdx - 1 + filteredTracks.length) % filteredTracks.length];
    setPlayingTrack(prevTrack);
  };

  const loadMoreSongs = async () => {
    setLoadingMore(true);
    await refetch();
    setLoadingMore(false);
  };

  return (
    <PageWrapper showBack={false}>
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(createPageUrl("Universe"))}
              className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Music className="w-8 h-8 text-purple-400" />
                Music
              </h1>
              <p className="text-gray-400">Millions of songs • All genres • Discover new artists</p>
            </div>
            {currentUser?.is_creator && (
              <Button
                onClick={() => navigate(createPageUrl("MusicStudio"))}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <Mic2 className="w-4 h-4 mr-2" />
                Artist Studio
              </Button>
            )}
          </div>

          {/* Search Bar */}
          <MusicSearchBar onSearch={handleSearch} isLoading={searchLoading || isLoading} />
          {activeSearch && (
            <p className="text-gray-400 text-xs mt-2">
              Found <span className="text-white font-semibold">{filteredTracks.length}</span> results for "{activeSearch}"
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-xl border border-white/20 mb-6">
            <TabsTrigger value="discover">
              <Music className="w-4 h-4 mr-1" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="w-4 h-4 mr-1" />
              History
            </TabsTrigger>
            <TabsTrigger value="fan-pools">
              <Users className="w-4 h-4 mr-1" />
              Fan Pools
            </TabsTrigger>
            <TabsTrigger value="charts">
              <TrendingUp className="w-4 h-4 mr-1" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="my-music">
              <Mic2 className="w-4 h-4 mr-1" />
              My Music
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover">
            {/* Genre Filter */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition ${
                    selectedGenre === genre.id
                      ? "bg-purple-600 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  <span className="mr-2">{genre.emoji}</span>
                  {genre.label}
                </button>
              ))}
            </div>



            {/* Debug info for troubleshooting */}
            {filteredTracks.length === 0 && !isLoading && queryError && (
              <Card className="bg-yellow-500/10 border-yellow-500/30 mb-6">
                <CardContent className="p-4">
                  <p className="text-yellow-400 text-sm">
                    🔍 Error loading music: {queryError.message}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Results Summary */}
            {searchQuery && (
              <div className="mb-4 px-2">
                <p className="text-gray-400 text-sm">
                  Found <span className="text-white font-bold">{filteredTracks.length}</span> results
                  {filteredTracks.some(t => t.source === 'youtube') && (
                    <span className="ml-2 text-purple-400">
                      • Includes {filteredTracks.filter(t => t.source === 'youtube').length} music videos from YouTube
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Music Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTracks.map((track, idx) => (
                <motion.div
                  key={track.id || track.video_id || idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(idx * 0.02, 1) }}
                >
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer group">
                    <div className="relative">
                      <img
                        src={track.cover_art_url || track.image || track.album?.images?.[0]?.url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400"}
                        alt={track.title || track.name}
                        className="w-full aspect-square object-cover"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <button
                          onClick={() => handleTrackClick(track)}
                          className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition hover:scale-110"
                        >
                          {playingTrack?.id === track.id || playingTrack?.video_id === track.video_id ? (
                            <Pause className="w-6 h-6 text-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white ml-1" />
                          )}
                        </button>
                      </div>
                      {track.source === 'youtube' && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-red-600/80 backdrop-blur-sm rounded-full">
                          <span className="text-white text-xs font-bold">🎬 VIDEO</span>
                        </div>
                      )}
                      {track.popularity > 0 && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-400" />
                            <span className="text-white text-xs font-bold">{track.popularity}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="text-white font-semibold text-sm truncate mb-1">
                        {track.title || track.name}
                      </h3>
                      <p className="text-gray-400 text-xs truncate">
                        {track.artist_name || track.artist || track.artists?.[0]?.name || "Unknown Artist"}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="p-1 hover:bg-white/10 rounded transition"
                        >
                          <Heart className="w-4 h-4 text-gray-400 hover:text-red-400" />
                        </button>
                        {track.source === 'youtube' && (
                          <Badge className="bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
                            🎬 Video
                          </Badge>
                        )}
                        {track.genre && (
                          <Badge className="bg-blue-500/20 text-blue-400 text-xs capitalize">
                            {track.genre.replace('_', ' ')}
                          </Badge>
                        )}
                        {track.pricing_model && track.pricing_model !== 'free' && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                            ${track.price_usd}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {filteredTracks.length === 0 && !isLoading && (
              <div className="text-center py-20">
                <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No music found</h3>
                <p className="text-gray-400 mb-2">Try a different genre or search term</p>
                {searchQuery && (
                  <Button
                    onClick={() => setSearchQuery('')}
                    variant="outline"
                    className="bg-white/10 border-white/20 mt-4"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}

            {isLoading && (
              <div className="text-center py-20">
                <RefreshCw className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-400">Loading music...</p>
              </div>
            )}

          </TabsContent>

          <TabsContent value="fan-pools">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fanPools.map((pool) => {
                const progress = (pool.raised_amount / pool.goal_amount) * 100;
                const daysLeft = Math.ceil((new Date(pool.deadline) - new Date()) / (1000 * 60 * 60 * 24));

                return (
                  <Card key={pool.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                    <div className="relative h-48">
                      <img
                        src={pool.cover_image || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600"}
                        alt={pool.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white font-bold text-lg mb-1">{pool.title}</h3>
                        <p className="text-gray-300 text-sm">by {pool.artist_name}</p>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <Badge className="mb-3 bg-purple-500/20 text-purple-400 capitalize">
                        {pool.pool_type.replace('_', ' ')}
                      </Badge>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-bold">
                            ${pool.raised_amount.toLocaleString()} / ${pool.goal_amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-gray-400 text-xs mt-2">
                          {pool.contributors?.length || 0} backers • {daysLeft} days left
                        </p>
                      </div>

                      {pool.tier_rewards?.slice(0, 2).map((tier, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-3 mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-semibold text-sm">{tier.tier_name}</span>
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              ${tier.minimum_contribution}
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-xs mb-1 capitalize">
                            {tier.access_type.replace('_', ' ')}
                          </p>
                        </div>
                      ))}

                      <Button
                        onClick={() => {
                          const tier = pool.tier_rewards?.[0];
                          if (tier) {
                            contributeToPoolMutation.mutate({
                              pool_id: pool.id,
                              amount: tier.minimum_contribution,
                              tier: tier.tier_name
                            });
                          }
                        }}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 mt-3"
                        disabled={pool.status !== 'active'}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Back This Project
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {fanPools.length === 0 && (
                <div className="col-span-3 text-center py-20">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No active fan pools</h3>
                  <p className="text-gray-400">Artists can create campaigns for shows, albums & more</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            {listeningHistory.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Recently Played</h2>
                  <p className="text-gray-400 text-sm">{listeningHistory.length} tracks</p>
                </div>
                <div className="space-y-3">
                  {listeningHistory.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        const track = {
                          id: item.track_id,
                          video_id: item.video_id,
                          title: item.track_title,
                          name: item.track_title,
                          artist_name: item.artist_name,
                          artist: item.artist_name,
                          cover_art_url: item.cover_art_url,
                          image: item.cover_art_url,
                          genre: item.genre,
                          source: item.source
                        };
                        handleTrackClick(track);
                      }}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition cursor-pointer"
                    >
                      <div className="text-gray-400 font-mono text-sm w-8">
                        #{idx + 1}
                      </div>
                      <img
                        src={item.cover_art_url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100"}
                        alt={item.track_title}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">{item.track_title}</p>
                        <p className="text-gray-400 text-sm truncate">{item.artist_name}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {new Date(item.played_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-400 capitalize">
                        {item.source}
                      </Badge>
                      <button className="p-2 bg-purple-600 rounded-full hover:bg-purple-700 transition">
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No listening history yet</h3>
                <p className="text-gray-400">Start playing some music to see your history</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="charts">
            {/* Genre Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition ${
                    selectedGenre === genre.id
                      ? "bg-purple-600 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  <span className="mr-2">{genre.emoji}</span>
                  {genre.label}
                </button>
              ))}
            </div>
            <Top25Charts onPlayTrack={handleTrackClick} playingTrack={playingTrack} genreFilter={selectedGenre} />
          </TabsContent>

          <TabsContent value="my-music">
            {currentUser?.is_creator ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Your Music</h2>
                  <Button
                    onClick={() => navigate(createPageUrl("MusicStudio"))}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Track
                  </Button>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  {myTracks.map((track) => (
                    <Card key={track.id} className="bg-white/5 border-white/10">
                      <div className="relative h-40">
                        <img
                          src={track.cover_art_url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400"}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-3">
                        <h3 className="text-white font-semibold text-sm mb-1">{track.title}</h3>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{track.stream_count || 0} plays</span>
                          <Badge className="bg-green-500/20 text-green-400">
                            ${(track.revenue_generated || 0).toFixed(0)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {myTracks.length === 0 && (
                  <div className="text-center py-20">
                    <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No tracks yet</h3>
                    <p className="text-gray-400 mb-6">Upload your first track to get started</p>
                    <Button
                      onClick={() => navigate(createPageUrl("MusicStudio"))}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Music
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <Mic2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Become an Artist</h3>
                <p className="text-gray-400 mb-6">Enable creator mode to upload and monetize music</p>
                <Button
                  onClick={async () => {
                    await base44.auth.updateMe({ is_creator: true });
                    window.location.reload();
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Enable Artist Mode
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Music Player */}
      {playingTrack && (
        <MusicPlayer
          track={playingTrack}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onClose={() => setPlayingTrack(null)}
          onPlayTrack={handleTrackClick}
          upcomingTracks={
            recommendations.length > 0 
              ? recommendations 
              : filteredTracks.slice(
                  filteredTracks.findIndex(t => t.id === playingTrack.id) + 1
                )
          }
        />
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
    </PageWrapper>
  );
}