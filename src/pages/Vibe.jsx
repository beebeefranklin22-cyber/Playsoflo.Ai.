import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Music, Play, Pause, Heart, TrendingUp, Flame,
  Radio, Mic2, Users, DollarSign, ChevronLeft,
  Search, Clock, BarChart3, Upload, Briefcase,
  Sparkles, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MusicPlayer from "../components/MusicPlayer";

export default function Vibe() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("discover");
  const [playingTrack, setPlayingTrack] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Sample tracks for fallback
  const sampleTracks = [
    {
      id: 'sample_1',
      title: 'Summer Vibes',
      name: 'Summer Vibes',
      artist_name: 'Demo Artist',
      artist: 'Demo Artist',
      genre: 'pop',
      cover_art_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
      image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
      popularity: 95,
      source: 'demo'
    },
    {
      id: 'sample_2',
      title: 'City Nights',
      name: 'City Nights',
      artist_name: 'Urban Sound',
      artist: 'Urban Sound',
      genre: 'electronic',
      cover_art_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
      popularity: 88,
      source: 'demo'
    },
    {
      id: 'sample_3',
      title: 'Midnight Drive',
      name: 'Midnight Drive',
      artist_name: 'Night Rider',
      artist: 'Night Rider',
      genre: 'r_n_b',
      cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      popularity: 82,
      source: 'demo'
    },
    {
      id: 'sample_4',
      title: 'Tropical Sunset',
      name: 'Tropical Sunset',
      artist_name: 'Island Beats',
      artist: 'Island Beats',
      genre: 'reggae',
      cover_art_url: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
      image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
      popularity: 79,
      source: 'demo'
    },
    {
      id: 'sample_5',
      title: 'Rock Anthem',
      name: 'Rock Anthem',
      artist_name: 'Electric Storm',
      artist: 'Electric Storm',
      genre: 'rock',
      cover_art_url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400',
      image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400',
      popularity: 91,
      source: 'demo'
    }
  ];

  // Fetch music from SoundCloud + user uploads + samples
  const { data: musicData, isLoading, refetch, error: queryError } = useQuery({
    queryKey: ['music-discovery', selectedGenre, searchQuery],
    queryFn: async () => {
      console.log('Fetching music - Genre:', selectedGenre, 'Search:', searchQuery);
      
      // First, always load user-uploaded tracks
      let userTracks = [];
      try {
        userTracks = await base44.entities.MusicTrack.filter({
          status: "published"
        });
        console.log('User tracks found:', userTracks.length);
      } catch (error) {
        console.error('User tracks error:', error);
      }
      
      // Try to fetch from YouTube Music
      let youtubeTracks = [];
      try {
        const query = searchQuery?.trim() || (selectedGenre !== 'all' ? selectedGenre : 'popular music');
        console.log('Calling fetchYouTubeMusic with query:', query);
        
        const youtubeResponse = await base44.functions.invoke('fetchYouTubeMusic', { 
          query: query,
          maxResults: 50
        });
        
        youtubeTracks = youtubeResponse?.data?.tracks || [];
        console.log('YouTube tracks found:', youtubeTracks.length);
      } catch (error) {
        console.error('YouTube fetch error:', error);
      }
      
      // Combine all sources
      const combinedTracks = [...youtubeTracks, ...userTracks];
      
      // If we have tracks, return them
      if (combinedTracks.length > 0) {
        return { 
          tracks: combinedTracks.sort(() => Math.random() - 0.5), 
          source: youtubeTracks.length > 0 ? 'youtube' : 'user' 
        };
      }
      
      // Fallback to sample tracks if nothing else works
      console.log('Using sample tracks as fallback');
      return { 
        tracks: sampleTracks.filter(t => 
          selectedGenre === 'all' || t.genre === selectedGenre
        ), 
        source: 'demo' 
      };
    },
    initialData: { tracks: sampleTracks, source: 'demo' },
    retry: 1,
    staleTime: 2 * 60 * 1000
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
    const matchesSearch = !searchQuery || 
      track.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
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

          {/* Search */}
          <form onSubmit={(e) => { e.preventDefault(); console.log('Search submitted:', searchQuery); refetch(); }} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs, artists, albums..."
              className="pl-12 pr-24 bg-white/10 border-white/20 text-white placeholder-gray-400 h-12"
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 h-9"
              size="sm"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-xl border border-white/20 mb-6">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="fan-pools">Fan Pools</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="my-music">My Music</TabsTrigger>
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

            {/* Stats Banner */}
            <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <div>
                      <p className="text-white font-bold">
                        {filteredTracks.length.toLocaleString()} Songs • {
                          musicData?.source === 'youtube' ? '🎵 YouTube Music' : 
                          musicData?.source === 'user' ? '👤 User Uploads' : 
                          '🎵 Demo Tracks'
                        }
                      </p>
                      <p className="text-gray-400 text-sm">
                        {isLoading ? 'Loading...' : queryError ? 'Error loading songs' : 'Ready to play'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={loadMoreSongs}
                    disabled={loadingMore || isLoading}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingMore ? 'animate-spin' : ''}`} />
                    {loadingMore ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              </CardContent>
            </Card>

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

            {/* Music Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredTracks.map((track, idx) => (
                <motion.div
                  key={track.id || idx}
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
                          {playingTrack?.id === track.id ? (
                            <Pause className="w-6 h-6 text-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white ml-1" />
                          )}
                        </button>
                      </div>
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
                      <div className="flex items-center gap-2 mt-2">
                        <button className="p-1 hover:bg-white/10 rounded transition">
                          <Heart className="w-4 h-4 text-gray-400 hover:text-red-400" />
                        </button>
                        {track.source === 'youtube' && (
                          <Badge className="bg-red-500/20 text-red-400 text-xs">
                            YouTube
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
                <p className="text-gray-400">Try a different genre or search term</p>
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

          <TabsContent value="charts">
            <div className="space-y-6">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Flame className="w-6 h-6 text-orange-400" />
                    Top Trending Now
                  </h2>
                  <div className="space-y-3">
                    {allTracks
                      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                      .slice(0, 50)
                      .map((track, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition cursor-pointer">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {idx + 1}
                        </div>
                        <img
                          src={track.cover_art_url || track.album?.images?.[0]?.url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100"}
                          alt={track.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-white font-semibold">{track.title || track.name}</p>
                          <p className="text-gray-400 text-sm">{track.artist_name || track.artists?.[0]?.name}</p>
                        </div>
                        {track.popularity && (
                          <Badge className="bg-green-500/20 text-green-400">
                            {track.popularity}
                          </Badge>
                        )}
                        <button
                          onClick={() => handleTrackClick(track)}
                          className="p-2 bg-purple-600 rounded-full hover:bg-purple-700 transition"
                        >
                          {playingTrack?.id === track.id ? (
                            <Pause className="w-4 h-4 text-white" />
                          ) : (
                            <Play className="w-4 h-4 text-white ml-0.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
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
        />
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}