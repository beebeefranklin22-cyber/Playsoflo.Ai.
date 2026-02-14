import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Music, Play, Heart, Share2, MoreVertical, ExternalLink,
  Calendar, MapPin, Ticket, ShoppingBag, TrendingUp, Video,
  Bell, BellOff, Users, DollarSign, Star, Award, Clock,
  Instagram, Twitter, Youtube, Facebook, Globe, Verified,
  Download, Plus, MessageCircle, ShoppingCart, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatLocalTime, formatDateOnly } from "../components/utils/dateUtils";
import PurchaseAccessGate from "../components/payment/PurchaseAccessGate";
import UniversalPaymentGate from "../components/payment/UniversalPaymentGate";

export default function ArtistProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("music");
  const [playingTrack, setPlayingTrack] = useState(null);
  
  const artistEmail = searchParams.get("artist");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch artist user data
  const { data: artist } = useQuery({
    queryKey: ['artist', artistEmail],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.find(u => u.email === artistEmail);
    },
    enabled: !!artistEmail
  });

  // Check if following
  const { data: isFollowing = false } = useQuery({
    queryKey: ['is-following', currentUser?.email, artistEmail],
    queryFn: async () => {
      const follows = await base44.entities.Follow.filter({
        follower_email: currentUser.email,
        following_email: artistEmail
      });
      return follows.length > 0;
    },
    enabled: !!currentUser && !!artistEmail
  });

  // Fetch artist's music
  const { data: tracks = [] } = useQuery({
    queryKey: ['artist-tracks', artistEmail],
    queryFn: async () => {
      const allTracks = await base44.entities.MusicTrack.filter({
        artist_email: artistEmail,
        status: "published"
      });
      return allTracks.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    },
    enabled: !!artistEmail
  });

  // Fetch artist's albums
  const { data: albums = [] } = useQuery({
    queryKey: ['artist-albums', artistEmail],
    queryFn: async () => {
      const allAlbums = await base44.entities.MusicAlbum.filter({
        artist_email: artistEmail,
        status: "published"
      });
      return allAlbums.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    },
    enabled: !!artistEmail
  });

  // Fetch artist's videos
  const { data: videos = [] } = useQuery({
    queryKey: ['artist-videos', artistEmail],
    queryFn: async () => {
      const allVideos = await base44.entities.VideoPost.filter({
        creator_email: artistEmail
      });
      return allVideos.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!artistEmail
  });

  // Fetch upcoming events
  const { data: events = [] } = useQuery({
    queryKey: ['artist-events', artistEmail],
    queryFn: async () => {
      const allEvents = await base44.entities.Experience.filter({
        provider_email: artistEmail,
        is_active: true
      });
      return allEvents.filter(e => 
        e.event_dates?.some(d => new Date(d.date) > new Date())
      );
    },
    enabled: !!artistEmail
  });

  // Fetch merchandise
  const { data: merch = [] } = useQuery({
    queryKey: ['artist-merch', artistEmail],
    queryFn: async () => {
      return await base44.entities.CreatorProduct.filter({
        creator_email: artistEmail,
        product_type: "merchandise"
      });
    },
    enabled: !!artistEmail
  });

  // Fetch crowdfunding campaigns
  const { data: crowdfunds = [] } = useQuery({
    queryKey: ['artist-crowdfunds', artistEmail],
    queryFn: async () => {
      return await base44.entities.CrowdfundingCampaign.filter({
        creator_email: artistEmail,
        status: "active"
      });
    },
    enabled: !!artistEmail
  });

  // Fetch followers count
  const { data: followersCount = 0 } = useQuery({
    queryKey: ['artist-followers-count', artistEmail],
    queryFn: async () => {
      const follows = await base44.entities.Follow.filter({
        following_email: artistEmail
      });
      return follows.length;
    },
    enabled: !!artistEmail
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const follows = await base44.entities.Follow.filter({
          follower_email: currentUser.email,
          following_email: artistEmail
        });
        if (follows[0]) {
          await base44.entities.Follow.delete(follows[0].id);
        }
      } else {
        await base44.entities.Follow.create({
          follower_email: currentUser.email,
          following_email: artistEmail,
          follower_name: currentUser.full_name,
          following_name: artist?.full_name || artistEmail
        });

        // Send notification to artist
        await base44.entities.Notification.create({
          recipient_email: artistEmail,
          type: "new_follower",
          title: "New Follower",
          message: `${currentUser.full_name || currentUser.email} started following you`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_picture
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['is-following']);
      queryClient.invalidateQueries(['artist-followers-count']);
      toast.success(isFollowing ? 'Unfollowed artist' : 'Following artist! You\'ll receive notifications about new releases.');
    }
  });

  const [purchasingTrack, setPurchasingTrack] = useState(null);

  // Check track purchases
  const { data: purchasedTracks = [] } = useQuery({
    queryKey: ['purchased-tracks', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const purchases = await base44.entities.ContentPurchase.filter({
        buyer_email: currentUser.email,
        item_type: "music_track"
      });
      return purchases.map(p => p.item_id);
    },
    enabled: !!currentUser
  });

  const handlePlayTrack = (track) => {
    // Check if track requires purchase
    if (track.price_usd > 0 && !purchasedTracks.includes(track.id)) {
      setPurchasingTrack(track);
      return;
    }

    setPlayingTrack(track);
    // Update user's current music
    if (currentUser) {
      base44.auth.updateMe({
        current_music: `${track.title} - ${track.artist_name || artist?.full_name}`
      });
    }

    // Increment stream count
    base44.entities.MusicTrack.update(track.id, {
      stream_count: (track.stream_count || 0) + 1
    });
  };

  const handleTrackPurchaseSuccess = () => {
    queryClient.invalidateQueries(['purchased-tracks']);
    if (purchasingTrack) {
      handlePlayTrack(purchasingTrack);
      setPurchasingTrack(null);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${artist?.full_name || artistEmail} - Artist Profile`,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Profile link copied to clipboard!');
    }
  };

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading artist profile...</p>
        </div>
      </div>
    );
  }

  const totalStreams = tracks.reduce((sum, t) => sum + (t.stream_count || 0), 0);
  const totalRevenue = tracks.reduce((sum, t) => sum + (t.revenue_generated || 0), 0);

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative h-80 bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900">
        <div className="absolute inset-0 bg-black/40" />
        {artist.cover_photo && (
          <img 
            src={artist.cover_photo} 
            className="absolute inset-0 w-full h-full object-cover opacity-50"
            alt="Cover"
          />
        )}
        
        <div className="relative h-full max-w-7xl mx-auto px-4 flex items-end pb-8">
          <div className="flex items-end gap-6 w-full">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-40 h-40 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20"
            >
              {artist.profile_picture ? (
                <img 
                  src={artist.profile_picture} 
                  className="w-full h-full object-cover"
                  alt={artist.full_name}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-5xl font-bold">
                  {artist.full_name?.[0] || "A"}
                </div>
              )}
            </motion.div>

            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  Artist
                </Badge>
                {artist.is_verified && (
                  <Verified className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <h1 className="text-5xl font-bold text-white mb-2 flex items-center gap-3">
                {artist.full_name || artist.email}
              </h1>
              <div className="flex items-center gap-6 text-gray-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{followersCount.toLocaleString()} followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  <span>{tracks.length} tracks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  <span>{totalStreams.toLocaleString()} streams</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pb-4">
              <Button
                onClick={() => followMutation.mutate()}
                disabled={!currentUser || followMutation.isPending}
                className={isFollowing 
                  ? "bg-white/20 hover:bg-white/30 border border-white/40" 
                  : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                }
              >
                {isFollowing ? (
                  <>
                    <BellOff className="w-4 h-4 mr-2" />
                    Following
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="bg-white/10 border-white/20 hover:bg-white/20"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("Messages") + `?user=${artistEmail}`)}
                variant="outline"
                className="bg-white/10 border-white/20 hover:bg-white/20"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{totalStreams.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Total Streams</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <DollarSign className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Total Revenue</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{followersCount.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Followers</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{albums.length}</p>
              <p className="text-sm text-gray-400">Albums Released</p>
            </CardContent>
          </Card>
        </div>

        {/* Bio Section */}
        {artist.bio && (
          <Card className="bg-white/5 border-white/10 mb-8">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">About</h2>
              <p className="text-gray-300 leading-relaxed">{artist.bio}</p>
              
              {/* Social Links */}
              {(artist.instagram || artist.twitter || artist.youtube || artist.facebook || artist.website) && (
                <div className="flex gap-4 mt-6 pt-6 border-t border-white/10">
                  {artist.instagram && (
                    <a href={artist.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-400 transition">
                      <Instagram className="w-6 h-6" />
                    </a>
                  )}
                  {artist.twitter && (
                    <a href={artist.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition">
                      <Twitter className="w-6 h-6" />
                    </a>
                  )}
                  {artist.youtube && (
                    <a href={artist.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-400 transition">
                      <Youtube className="w-6 h-6" />
                    </a>
                  )}
                  {artist.facebook && (
                    <a href={artist.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition">
                      <Facebook className="w-6 h-6" />
                    </a>
                  )}
                  {artist.website && (
                    <a href={artist.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                      <Globe className="w-6 h-6" />
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border-white/10 mb-6">
            <TabsTrigger value="music">Music</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="merch">Merch</TabsTrigger>
            <TabsTrigger value="crowdfunds">Support</TabsTrigger>
          </TabsList>

          {/* Music Tab */}
          <TabsContent value="music">
            {/* Albums */}
            {albums.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Albums</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {albums.map((album) => (
                    <Card key={album.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="aspect-square rounded-lg overflow-hidden mb-3 relative">
                          {album.cover_art_url ? (
                            <img src={album.cover_art_url} className="w-full h-full object-cover" alt={album.title} />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                              <Music className="w-12 h-12 text-white" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Play className="w-12 h-12 text-white" />
                          </div>
                        </div>
                        <h3 className="text-white font-semibold truncate">{album.title}</h3>
                        <p className="text-gray-400 text-sm">{formatDateOnly(album.release_date)}</p>
                        <p className="text-gray-500 text-xs">{album.track_ids?.length || 0} tracks</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Tracks */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">All Tracks</h2>
              <div className="space-y-2">
                {tracks.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          {track.cover_art_url ? (
                            <img src={track.cover_art_url} className="w-full h-full object-cover" alt={track.title} />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                              <Music className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold truncate">{track.title}</h3>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span>{track.genre?.replace(/_/g, ' ')}</span>
                            {track.explicit && <Badge variant="outline" className="text-xs">Explicit</Badge>}
                            <span>•</span>
                            <span>{formatDateOnly(track.release_date)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-gray-400 text-sm">
                          <div className="text-center">
                            <Play className="w-4 h-4 mx-auto mb-1" />
                            <p>{(track.stream_count || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <Heart className="w-4 h-4 mx-auto mb-1" />
                            <p>{(track.download_count || 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {track.price_usd > 0 && !purchasedTracks.includes(track.id) ? (
                          <Button
                            onClick={() => setPurchasingTrack(track)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            ${track.price_usd}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handlePlayTrack(track)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Play
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                {tracks.length === 0 && (
                  <div className="text-center py-12">
                    <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No tracks released yet</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <Card key={video.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer group">
                  <CardContent className="p-0">
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} className="w-full h-full object-cover" alt={video.title} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                          <Video className="w-12 h-12 text-white" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Play className="w-16 h-16 text-white" />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-semibold mb-2 line-clamp-2">{video.title}</h3>
                      <div className="flex items-center gap-4 text-gray-400 text-sm">
                        <div className="flex items-center gap-1">
                          <Play className="w-4 h-4" />
                          <span>{(video.views_count || 0).toLocaleString()}</span>
                        </div>
                        <span>{formatLocalTime(video.created_date)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {videos.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No videos uploaded yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <div className="grid gap-4">
              {events.map((event) => (
                <Card key={event.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      {event.image_url && (
                        <div className="w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={event.image_url} className="w-full h-full object-cover" alt={event.title} />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-2">{event.title}</h3>
                        <p className="text-gray-300 mb-4 line-clamp-2">{event.description}</p>
                        
                        <div className="flex flex-wrap gap-4 mb-4">
                          {event.event_dates?.[0] && (
                            <div className="flex items-center gap-2 text-gray-400">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDateOnly(event.event_dates[0].date)}</span>
                            </div>
                          )}
                          {event.venue_name && (
                            <div className="flex items-center gap-2 text-gray-400">
                              <MapPin className="w-4 h-4" />
                              <span>{event.venue_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-400">
                            <Ticket className="w-4 h-4" />
                            <span>From ${event.price}</span>
                          </div>
                        </div>

                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                          <Ticket className="w-4 h-4 mr-2" />
                          Get Tickets
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {events.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No upcoming events</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Merch Tab */}
          <TabsContent value="merch">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {merch.map((item) => (
                <Card key={item.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="aspect-square rounded-lg overflow-hidden mb-3 relative">
                      {item.image_url ? (
                        <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                          <ShoppingBag className="w-12 h-12 text-white" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <h3 className="text-white font-semibold truncate mb-1">{item.name}</h3>
                    <p className="text-gray-400 text-sm mb-2">{item.description?.substring(0, 60)}...</p>
                    <p className="text-purple-400 font-bold">${item.price_usd}</p>
                  </CardContent>
                </Card>
              ))}

              {merch.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No merchandise available</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Crowdfunds Tab */}
          <TabsContent value="crowdfunds">
            <div className="grid gap-6">
              {crowdfunds.map((campaign) => {
                const progress = (campaign.current_amount / campaign.goal_amount) * 100;
                const daysLeft = Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24));

                return (
                  <Card key={campaign.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        {campaign.image_url && (
                          <div className="w-64 h-48 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={campaign.image_url} className="w-full h-full object-cover" alt={campaign.title} />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-white mb-3">{campaign.title}</h3>
                          <p className="text-gray-300 mb-6">{campaign.description}</p>
                          
                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-400 mb-2">
                              <span>${campaign.current_amount?.toLocaleString() || 0} raised</span>
                              <span>${campaign.goal_amount?.toLocaleString()} goal</span>
                            </div>
                            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(progress, 100)}%` }}
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-6 mb-6 text-gray-400">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>{campaign.backers_count || 0} backers</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}</span>
                            </div>
                          </div>

                          <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                            <DollarSign className="w-4 h-4 mr-2" />
                            Back This Project
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {crowdfunds.length === 0 && (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No active crowdfunding campaigns</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Music Player */}
      <AnimatePresence>
        {playingTrack && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-20 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-t border-white/10 p-4"
          >
            <div className="max-w-7xl mx-auto flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg overflow-hidden">
                {playingTrack.cover_art_url ? (
                  <img src={playingTrack.cover_art_url} className="w-full h-full object-cover" alt={playingTrack.title} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="text-white font-semibold">{playingTrack.title}</h4>
                <p className="text-gray-400 text-sm">{artist.full_name}</p>
              </div>

              <audio src={playingTrack.audio_file_url} controls autoPlay className="flex-1 max-w-md" />

              <Button
                variant="ghost"
                onClick={() => setPlayingTrack(null)}
                className="text-gray-400"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purchase Track Modal */}
      {purchasingTrack && (
        <UniversalPaymentGate
          isOpen={!!purchasingTrack}
          onClose={() => setPurchasingTrack(null)}
          amount={purchasingTrack.price_usd}
          itemType="music_track"
          itemId={purchasingTrack.id}
          itemDetails={{
            name: purchasingTrack.title,
            description: `By ${artist.full_name}`,
            seller_email: artist.email
          }}
          onPaymentSuccess={handleTrackPurchaseSuccess}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}