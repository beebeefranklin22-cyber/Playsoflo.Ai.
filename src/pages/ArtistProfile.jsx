import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Music, Users, DollarSign, Play, Edit, Save, X, Upload,
  Instagram, Youtube, Globe, ChevronLeft, Star, TrendingUp,
  Calendar, FileSignature, Briefcase, Share2, Heart, UserPlus, UserMinus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ArtistProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const artistEmail = urlParams.get('artist');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: artist = null } = useQuery({
    queryKey: ['artist-profile', artistEmail],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: artistEmail });
      return users[0] || null;
    },
    enabled: !!artistEmail
  });

  const { data: artistTracks = [] } = useQuery({
    queryKey: ['artist-tracks', artistEmail],
    queryFn: async () => {
      return await base44.entities.MusicTrack.filter({ 
        artist_email: artistEmail,
        status: "published"
      }, '-created_date');
    },
    enabled: !!artistEmail,
    initialData: []
  });

  const { data: artistPools = [] } = useQuery({
    queryKey: ['artist-pools', artistEmail],
    queryFn: async () => {
      return await base44.entities.FanPool.filter({ artist_email: artistEmail });
    },
    enabled: !!artistEmail,
    initialData: []
  });

  const { data: artistContracts = [] } = useQuery({
    queryKey: ['artist-contracts', artistEmail],
    queryFn: async () => {
      return await base44.entities.MusicContract.filter({});
    },
    enabled: !!artistEmail,
    initialData: []
  });

  const { data: artistDeals = [] } = useQuery({
    queryKey: ['artist-deals', artistEmail],
    queryFn: async () => {
      return await base44.entities.MusicDealApplication.filter({ artist_email: artistEmail });
    },
    enabled: !!artistEmail,
    initialData: []
  });

  const { data: isFollowing = false, refetch: refetchFollow } = useQuery({
    queryKey: ['is-following', currentUser?.email, artistEmail],
    queryFn: async () => {
      if (!currentUser || currentUser.email === artistEmail) return false;
      const follows = await base44.entities.Follow.filter({
        follower_email: currentUser.email,
        following_email: artistEmail
      });
      return follows.length > 0;
    },
    enabled: !!currentUser && !!artistEmail && currentUser?.email !== artistEmail
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const follows = await base44.entities.Follow.filter({
          follower_email: currentUser.email,
          following_email: artistEmail
        });
        if (follows[0]) await base44.entities.Follow.delete(follows[0].id);
      } else {
        await base44.entities.Follow.create({
          follower_email: currentUser.email,
          following_email: artistEmail,
          follower_name: currentUser.full_name,
          following_name: artist?.full_name || artistEmail
        });
      }
    },
    onSuccess: () => {
      refetchFollow();
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['artist-profile']);
      setIsEditing(false);
      toast.success('Profile updated!');
    }
  });

  const handleBannerUpload = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditForm({ ...editForm, artist_banner_url: file_url });
  };

  const isOwnProfile = currentUser?.email === artistEmail;

  const totalStreams = artistTracks.reduce((sum, t) => sum + (t.stream_count || 0), 0);
  const totalDownloads = artistTracks.reduce((sum, t) => sum + (t.download_count || 0), 0);
  const totalRevenue = artistTracks.reduce((sum, t) => sum + (t.revenue_generated || 0), 0);

  useEffect(() => {
    if (artist && isOwnProfile) {
      setEditForm({
        artist_bio: artist.artist_bio || "",
        artist_instagram: artist.artist_instagram || "",
        artist_twitter: artist.artist_twitter || "",
        artist_youtube: artist.artist_youtube || "",
        artist_spotify: artist.artist_spotify || "",
        artist_soundcloud: artist.artist_soundcloud || "",
        artist_website: artist.artist_website || "",
        artist_banner_url: artist.artist_banner_url || ""
      });
    }
  }, [artist, isOwnProfile]);

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
        <div className="text-center">
          <Music className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-lg">Loading artist profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      {/* Banner */}
      <div className="relative h-64 bg-gradient-to-r from-purple-600 to-pink-600">
        {artist.artist_banner_url && (
          <img 
            src={artist.artist_banner_url} 
            alt="Banner" 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent" />
        
        <button
          onClick={() => navigate(createPageUrl("Vibe"))}
          className="absolute top-4 left-4 p-3 bg-black/50 rounded-full hover:bg-black/70 transition backdrop-blur-sm"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {isOwnProfile && !isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm hover:bg-white/30"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* Profile Header */}
        <div className="relative -mt-20 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            <img
              src={artist.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.full_name)}&size=200`}
              alt={artist.full_name}
              className="w-40 h-40 rounded-2xl border-4 border-gray-950 shadow-2xl object-cover"
            />
            
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">{artist.full_name}</h1>
              {artist.artist_bio && (
                <p className="text-gray-300 mb-4 max-w-2xl">{artist.artist_bio}</p>
              )}
              
              <div className="flex flex-wrap gap-3 mb-4">
                {artist.artist_instagram && (
                  <a href={`https://instagram.com/${artist.artist_instagram}`} target="_blank" rel="noopener noreferrer">
                    <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30 flex items-center gap-1">
                      <Instagram className="w-3 h-3" />
                      {artist.artist_instagram}
                    </Badge>
                  </a>
                )}
                {artist.artist_youtube && (
                  <a href={artist.artist_youtube} target="_blank" rel="noopener noreferrer">
                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30 flex items-center gap-1">
                      <Youtube className="w-3 h-3" />
                      YouTube
                    </Badge>
                  </a>
                )}
                {artist.artist_website && (
                  <a href={artist.artist_website} target="_blank" rel="noopener noreferrer">
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Website
                    </Badge>
                  </a>
                )}
              </div>

              {!isOwnProfile && currentUser && (
                <Button
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  className={isFollowing 
                    ? "bg-white/10 hover:bg-white/20" 
                    : "bg-purple-600 hover:bg-purple-700"}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4 mr-2" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Music className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{artistTracks.length}</p>
              <p className="text-gray-400 text-sm">Tracks</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Play className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{totalStreams.toLocaleString()}</p>
              <p className="text-gray-400 text-sm">Streams</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{totalDownloads.toLocaleString()}</p>
              <p className="text-gray-400 text-sm">Downloads</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">${totalRevenue.toFixed(0)}</p>
              <p className="text-gray-400 text-sm">Revenue</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-pink-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{artistPools.length}</p>
              <p className="text-gray-400 text-sm">Fan Pools</p>
            </CardContent>
          </Card>
        </div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setIsEditing(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-3xl font-bold text-white mb-6">Edit Artist Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Banner Image</label>
                    {editForm.artist_banner_url && (
                      <img src={editForm.artist_banner_url} alt="Banner" className="w-full h-32 object-cover rounded-lg mb-2" />
                    )}
                    <input
                      id="banner-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleBannerUpload(e.target.files?.[0])}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('banner-upload').click()}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {editForm.artist_banner_url ? 'Change Banner' : 'Upload Banner'}
                    </Button>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Bio</label>
                    <textarea
                      value={editForm.artist_bio}
                      onChange={(e) => setEditForm({ ...editForm, artist_bio: e.target.value })}
                      rows={4}
                      placeholder="Tell your story..."
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Instagram</label>
                      <Input
                        value={editForm.artist_instagram}
                        onChange={(e) => setEditForm({ ...editForm, artist_instagram: e.target.value })}
                        placeholder="@username"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Twitter/X</label>
                      <Input
                        value={editForm.artist_twitter}
                        onChange={(e) => setEditForm({ ...editForm, artist_twitter: e.target.value })}
                        placeholder="@username"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">YouTube</label>
                      <Input
                        value={editForm.artist_youtube}
                        onChange={(e) => setEditForm({ ...editForm, artist_youtube: e.target.value })}
                        placeholder="Channel URL"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Spotify</label>
                      <Input
                        value={editForm.artist_spotify}
                        onChange={(e) => setEditForm({ ...editForm, artist_spotify: e.target.value })}
                        placeholder="Artist profile URL"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">SoundCloud</label>
                      <Input
                        value={editForm.artist_soundcloud}
                        onChange={(e) => setEditForm({ ...editForm, artist_soundcloud: e.target.value })}
                        placeholder="Profile URL"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Website</label>
                      <Input
                        value={editForm.artist_website}
                        onChange={(e) => setEditForm({ ...editForm, artist_website: e.target.value })}
                        placeholder="https://..."
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={() => updateProfileMutation.mutate(editForm)}
                      disabled={updateProfileMutation.isPending}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <Tabs defaultValue="tracks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 border border-white/20">
            <TabsTrigger value="tracks">Tracks ({artistTracks.length})</TabsTrigger>
            <TabsTrigger value="pools">Fan Pools ({artistPools.length})</TabsTrigger>
            <TabsTrigger value="contracts">Contracts ({artistContracts.length})</TabsTrigger>
            <TabsTrigger value="deals">Deals ({artistDeals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="tracks" className="space-y-4">
            {artistTracks.length === 0 ? (
              <div className="text-center py-20">
                <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No tracks yet</h3>
                <p className="text-gray-400">This artist hasn't uploaded any music</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {artistTracks.map(track => (
                  <Card key={track.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition group">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={track.cover_art_url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200"}
                            alt={track.title}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Play className="w-6 h-6 text-white" fill="white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-bold mb-1 truncate">{track.title}</h3>
                          <p className="text-gray-400 text-sm mb-2">{track.genre?.replace('_', ' ')}</p>
                          
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{(track.stream_count || 0).toLocaleString()} streams</span>
                            <span>•</span>
                            <span>{(track.download_count || 0).toLocaleString()} downloads</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pools" className="space-y-4">
            {artistPools.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No fan pools</h3>
                <p className="text-gray-400">No active crowdfunding campaigns</p>
              </div>
            ) : (
              artistPools.map(pool => (
                <Card key={pool.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-white font-bold text-xl mb-2">{pool.title}</h3>
                    <p className="text-gray-400 mb-4">{pool.description}</p>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white font-bold">
                          ${(pool.raised_amount || 0).toLocaleString()} / ${pool.goal_amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                          style={{ width: `${Math.min((pool.raised_amount / pool.goal_amount) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        {pool.contributors?.length || 0} backers
                      </div>
                      <Badge className={
                        pool.status === 'active' ? 'bg-green-500/20 text-green-300' :
                        pool.status === 'funded' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-gray-500/20 text-gray-300'
                      }>
                        {pool.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4">
            {isOwnProfile ? (
              artistContracts.length === 0 ? (
                <div className="text-center py-20">
                  <FileSignature className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No contracts</h3>
                  <p className="text-gray-400">No active music contracts</p>
                </div>
              ) : (
                artistContracts.map(contract => (
                  <Card key={contract.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-white font-bold text-lg capitalize">
                            {contract.contract_type.replace('_', ' ')}
                          </h3>
                          <p className="text-gray-400 text-sm">{contract.parties?.length || 0} parties</p>
                        </div>
                        <Badge className={
                          contract.status === 'all_signed' ? 'bg-green-500/20 text-green-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }>
                          {contract.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            ) : (
              <div className="text-center py-20 bg-white/5 rounded-xl">
                <FileSignature className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Contracts are private</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deals" className="space-y-4">
            {isOwnProfile ? (
              artistDeals.length === 0 ? (
                <div className="text-center py-20">
                  <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No deal applications</h3>
                  <p className="text-gray-400">No submitted deal applications</p>
                </div>
              ) : (
                artistDeals.map(deal => (
                  <Card key={deal.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-white font-bold text-lg capitalize">
                            {deal.deal_type.replace('_', ' ')}
                          </h3>
                          <p className="text-gray-400 text-sm">{deal.monthly_listeners?.toLocaleString()} monthly listeners</p>
                        </div>
                        <Badge className={
                          deal.status === 'offer_made' ? 'bg-green-500/20 text-green-400' :
                          deal.status === 'accepted' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }>
                          {deal.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            ) : (
              <div className="text-center py-20 bg-white/5 rounded-xl">
                <Briefcase className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Deal applications are private</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}