import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, TrendingUp, Clock, Sparkles, Play, Heart, 
  Filter, Music, Users, ChevronLeft
} from "lucide-react";
import { motion } from "framer-motion";

export default function MusicDiscover() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedMood, setSelectedMood] = useState("all");
  const [sortBy, setSortBy] = useState("trending");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allTracks = [] } = useQuery({
    queryKey: ['all-music-tracks'],
    queryFn: async () => {
      return await base44.entities.MusicTrack.filter({ status: "published" }, '-created_date', 100);
    },
    initialData: []
  });

  const { data: followedArtists = [] } = useQuery({
    queryKey: ['followed-artists', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const follows = await base44.entities.Follow.filter({ follower_email: currentUser.email });
      return follows.map(f => f.following_email);
    },
    enabled: !!currentUser,
    initialData: []
  });

  const genres = ["all", "hip_hop", "rap", "r&b", "pop", "rock", "electronic", "latin", "country", "jazz", "reggae"];
  const moods = ["all", "energetic", "chill", "romantic", "party", "workout", "focus", "sad"];

  // Filtering logic
  let filteredTracks = allTracks.filter(track => {
    const matchesSearch = !searchQuery || 
      track.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = selectedGenre === "all" || track.genre === selectedGenre;
    
    return matchesSearch && matchesGenre;
  });

  // Sort tracks
  if (sortBy === "trending") {
    filteredTracks = filteredTracks.sort((a, b) => (b.stream_count || 0) - (a.stream_count || 0));
  } else if (sortBy === "new") {
    filteredTracks = filteredTracks.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  } else if (sortBy === "popular") {
    filteredTracks = filteredTracks.sort((a, b) => (b.stream_count || 0) + (b.download_count || 0) - (a.stream_count || 0) - (a.download_count || 0));
  }

  const trendingTracks = [...allTracks].sort((a, b) => (b.stream_count || 0) - (a.stream_count || 0)).slice(0, 10);
  
  const newReleases = [...allTracks]
    .filter(track => followedArtists.includes(track.artist_email))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

  const forYou = [...allTracks].slice(0, 10); // Simplified recommendation

  const TrackCard = ({ track }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card 
        className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer group"
        onClick={() => navigate(createPageUrl("ArtistProfile") + `?artist=${encodeURIComponent(track.artist_email)}`)}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-shrink-0">
              <img 
                src={track.cover_art_url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400"} 
                alt={track.title}
                className="w-24 h-24 rounded-lg object-cover"
              />
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <Play className="w-8 h-8 text-white" fill="white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg mb-1 truncate">{track.title}</h3>
              <p className="text-gray-400 text-sm mb-2 truncate">{track.artist}</p>
              
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {track.genre?.replace('_', ' ')}
                </Badge>
                
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <Play className="w-3 h-3" />
                  <span>{(track.stream_count || 0).toLocaleString()}</span>
                </div>
                
                {track.pricing_model === 'free' && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    Free
                  </Badge>
                )}
              </div>
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                // Add to favorites logic
              }}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <Heart className="w-5 h-5 text-gray-400 hover:text-red-400" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(createPageUrl("Vibe"))}
            className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-10 h-10 text-purple-400" />
              Discover Music
            </h1>
            <p className="text-gray-300">Find your next favorite track</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracks, artists..."
                  className="pl-12 bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
            >
              {genres.map(genre => (
                <option key={genre} value={genre}>
                  {genre === 'all' ? 'All Genres' : genre.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>

            <select
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
            >
              {moods.map(mood => (
                <option key={mood} value={mood}>
                  {mood === 'all' ? 'All Moods' : mood.charAt(0).toUpperCase() + mood.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
            >
              <option value="trending">🔥 Trending</option>
              <option value="new">🆕 Newest</option>
              <option value="popular">⭐ Most Popular</option>
            </select>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 border border-white/20">
            <TabsTrigger value="all">
              <Music className="w-4 h-4 mr-2" />
              All Tracks
            </TabsTrigger>
            <TabsTrigger value="trending">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="new">
              <Clock className="w-4 h-4 mr-2" />
              New Releases
            </TabsTrigger>
            <TabsTrigger value="foryou">
              <Sparkles className="w-4 h-4 mr-2" />
              For You
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredTracks.length === 0 ? (
              <div className="text-center py-20">
                <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No tracks found</h3>
                <p className="text-gray-400">Try adjusting your filters</p>
              </div>
            ) : (
              filteredTracks.map(track => <TrackCard key={track.id} track={track} />)
            )}
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-orange-400" />
                <div>
                  <h3 className="text-white font-bold">Trending Now</h3>
                  <p className="text-orange-300 text-sm">Most streamed tracks this week</p>
                </div>
              </div>
            </div>
            {trendingTracks.map(track => <TrackCard key={track.id} track={track} />)}
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-white font-bold">New Releases</h3>
                  <p className="text-blue-300 text-sm">
                    {followedArtists.length > 0 
                      ? `Latest from artists you follow` 
                      : 'Latest releases from all artists'}
                  </p>
                </div>
              </div>
            </div>
            {newReleases.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Follow artists to see their new releases here</p>
              </div>
            ) : (
              newReleases.map(track => <TrackCard key={track.id} track={track} />)
            )}
          </TabsContent>

          <TabsContent value="foryou" className="space-y-4">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <div>
                  <h3 className="text-white font-bold">Personalized For You</h3>
                  <p className="text-purple-300 text-sm">Based on your listening history</p>
                </div>
              </div>
            </div>
            {forYou.map(track => <TrackCard key={track.id} track={track} />)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}