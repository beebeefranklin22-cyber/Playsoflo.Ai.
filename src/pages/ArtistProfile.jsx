import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Music, Play, ChevronLeft, Instagram, Twitter, Youtube,
  Globe, Share2, Heart, TrendingUp, Users, Verified
} from "lucide-react";
import { motion } from "framer-motion";

export default function ArtistProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const artistEmail = searchParams.get("email");
  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: artist } = useQuery({
    queryKey: ['artist-profile', artistEmail],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: artistEmail });
      return users[0];
    },
    enabled: !!artistEmail
  });

  const { data: artistTracks = [] } = useQuery({
    queryKey: ['artist-tracks', artistEmail],
    queryFn: async () => {
      return await base44.entities.MusicTrack.filter({ 
        artist_email: artistEmail,
        status: "published"
      });
    },
    enabled: !!artistEmail
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['artist-followers', artistEmail],
    queryFn: async () => {
      return await base44.entities.Follow.filter({ following_email: artistEmail });
    },
    enabled: !!artistEmail
  });

  const totalStreams = artistTracks.reduce((sum, track) => sum + (track.stream_count || 0), 0);
  const totalRevenue = artistTracks.reduce((sum, track) => sum + (track.revenue_generated || 0), 0);

  const socialIcons = {
    instagram: Instagram,
    twitter: Twitter,
    youtube: Youtube,
    spotify: Music,
    soundcloud: Music,
    tiktok: Music
  };

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
        <p className="text-white">Loading artist profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="relative h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600/20 to-transparent" />
        <img
          src={artist.profile_photo || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200"}
          alt={artist.full_name}
          className="w-full h-full object-cover opacity-30"
        />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-3 bg-black/50 backdrop-blur-xl rounded-full hover:bg-black/70 transition z-10"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-10">
        {/* Profile Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-end mb-8">
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={artist.profile_photo || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300"}
            alt={artist.full_name}
            className="w-40 h-40 rounded-full object-cover border-4 border-gray-950 shadow-2xl"
          />
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl md:text-5xl font-bold text-white">{artist.full_name}</h1>
              {artist.role === 'admin' && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <Verified className="w-4 h-4 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            
            {artist.bio && (
              <p className="text-gray-300 text-lg mb-4 max-w-2xl">{artist.bio}</p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mb-4">
              <div>
                <p className="text-3xl font-bold text-white">{artistTracks.length}</p>
                <p className="text-gray-400 text-sm">Tracks</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{followers.length}</p>
                <p className="text-gray-400 text-sm">Followers</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{totalStreams.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Streams</p>
              </div>
              {totalRevenue > 0 && (
                <div>
                  <p className="text-3xl font-bold text-green-400">${totalRevenue.toFixed(0)}</p>
                  <p className="text-gray-400 text-sm">Revenue</p>
                </div>
              )}
            </div>

            {/* Social Links */}
            {artist.social_links && Object.keys(artist.social_links).length > 0 && (
              <div className="flex gap-3 mb-4">
                {Object.entries(artist.social_links).map(([platform, url]) => {
                  if (!url) return null;
                  const Icon = socialIcons[platform] || Globe;
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </a>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Heart className="w-4 h-4 mr-2" />
                Follow
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Music Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Music className="w-6 h-6 text-purple-400" />
            Released Tracks
          </h2>

          {artistTracks.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {artistTracks.map((track) => (
                <Card key={track.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer group">
                  <div className="relative">
                    <img
                      src={track.cover_art_url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400"}
                      alt={track.title}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <button
                        onClick={() => navigate(createPageUrl("Vibe"))}
                        className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition hover:scale-110"
                      >
                        <Play className="w-6 h-6 text-white ml-1" />
                      </button>
                    </div>
                    {track.popularity && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-400" />
                          <span className="text-white text-xs font-bold">{track.popularity}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="text-white font-semibold text-sm truncate">{track.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                      <span>{track.stream_count || 0} plays</span>
                      {track.pricing_model !== 'free' && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">${track.price_usd}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No tracks released yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}