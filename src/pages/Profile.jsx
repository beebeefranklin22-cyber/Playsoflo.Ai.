import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Music, MapPin, Calendar, Settings, Edit2, Camera, Users,  
  Lock, Eye, EyeOff, Upload, Loader2, Tag, Plus, X, Check,
  Share2, Shield, Bell, Globe, Heart, Star, Award, Trophy,
  Activity, Sparkles, Car, Briefcase, Video, Store, Wallet,
  DollarSign, ChevronRight, Palette, Image as ImageIcon, Navigation, Clock, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PortfolioSection from "../components/profile/PortfolioSection";
import ReviewsSection from "../components/profile/ReviewsSection";
import GallerySection from "../components/profile/GallerySection";
import ProfileCustomization from "../components/profile/ProfileCustomization";
import FollowStats from "../components/social/FollowStats";
import RidePreferencesModal from "../components/ride/RidePreferencesModal";
import VehicleInfoModal from "../components/ride/VehicleInfoModal";

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showRidePreferences, setShowRidePreferences] = useState(false);
  const [showVehicleInfo, setShowVehicleInfo] = useState(false);

  const [editedUser, setEditedUser] = useState({
    full_name: "",
    bio: "",
    phone: "",
    address: "",
    interests: [],
    privacy_settings: {
      profile_visibility: "public",
      show_email: false,
      show_phone: false,
      show_activity: true,
      allow_messages: "everyone"
    }
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setEditedUser({
          full_name: user.full_name || "",
          bio: user.bio || "",
          phone: user.phone || "",
          address: user.address || "",
          interests: user.interests || [],
          privacy_settings: user.privacy_settings || {
            profile_visibility: "public",
            show_email: false,
            show_phone: false,
            show_activity: true,
            allow_messages: "everyone"
          }
        });
      } catch (error) {
        console.log("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      toast.success('Profile updated!');
    }
  });

  const handleImageUpload = async (file, type) => {
    if (!file) return;
    
    if (!currentUser) {
      toast.error('Please log in to upload');
      return;
    }
    
    if (type === 'cover') setUploadingCover(true);
    if (type === 'profile') setUploadingProfile(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (type === 'cover') {
        await updateUserMutation.mutateAsync({ cover_photo: file_url });
        toast.success('Cover photo updated!');
      } else {
        await updateUserMutation.mutateAsync({ profile_photo: file_url });
        toast.success('Profile photo updated!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      if (type === 'cover') setUploadingCover(false);
      if (type === 'profile') setUploadingProfile(false);
    }
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !editedUser.interests.includes(newInterest.trim())) {
      setEditedUser({
        ...editedUser,
        interests: [...editedUser.interests, newInterest.trim()]
      });
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (interest) => {
    setEditedUser({
      ...editedUser,
      interests: editedUser.interests.filter(i => i !== interest)
    });
  };

  const handleSave = async () => {
    await updateUserMutation.mutateAsync(editedUser);
    setIsEditing(false);
  };

  const connectSpotify = async () => {
    toast.info('Spotify integration coming soon!');
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Cover Photo */}
      <div className="relative h-64">
        {currentUser?.cover_photo ? (
          <img 
            src={currentUser.cover_photo} 
            alt="Cover" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600" />
        )}
        <div className="absolute inset-0 bg-black/20" />
        
        <input
          type="file"
          id="cover-upload"
          className="hidden"
          accept="image/*,video/*"
          onChange={(e) => handleImageUpload(e.target.files?.[0], 'cover')}
        />
        <button
          onClick={() => document.getElementById('cover-upload').click()}
          disabled={uploadingCover}
          className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-full hover:bg-black/70 transition"
        >
          {uploadingCover ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Profile Info */}
      <div className="px-6 -mt-20 relative z-10">
        <div className="flex items-end gap-6 mb-6">
          <div className="relative">
            {currentUser?.profile_photo ? (
              <img
                src={currentUser.profile_photo}
                alt="Profile"
                className="w-32 h-32 rounded-full border-4 border-gray-900 object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-4 border-gray-900 flex items-center justify-center text-white text-4xl font-bold">
                {currentUser?.full_name?.[0] || "U"}
              </div>
            )}
            <input
              type="file"
              id="profile-upload"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files?.[0], 'profile')}
            />
            <button 
              onClick={() => document.getElementById('profile-upload').click()}
              disabled={uploadingProfile}
              className="absolute bottom-2 right-2 bg-purple-600 p-2 rounded-full hover:bg-purple-700 transition"
            >
              {uploadingProfile ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">
              {currentUser?.full_name || "User"}
            </h1>
            {currentUser?.privacy_settings?.show_email !== false && (
              <p className="text-gray-400 mb-2">{currentUser?.email}</p>
            )}
            {currentUser?.bio && (
              <p className="text-gray-300">{currentUser.bio}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowCustomization(true)}
              variant="outline"
              className="bg-white/10 border-white/20"
            >
              <Palette className="w-4 h-4 mr-2" />
              Customize
            </Button>
            <Button
              onClick={() => setShowPrivacySettings(true)}
              variant="outline"
              className="bg-white/10 border-white/20"
            >
              <Lock className="w-4 h-4 mr-2" />
              Privacy
            </Button>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </div>

        {/* User Info */}
        <div className="flex flex-wrap gap-4 mb-4">
          {currentUser?.address && (
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4" />
              <span>{currentUser.address}</span>
            </div>
          )}
          {currentUser?.phone && currentUser?.privacy_settings?.show_phone && (
            <div className="flex items-center gap-2 text-gray-300">
              <Users className="w-4 h-4" />
              <span>{currentUser.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="w-4 h-4" />
            <span>Joined {new Date(currentUser?.created_date).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Interests */}
        {currentUser?.interests && currentUser.interests.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {currentUser.interests.map((interest, idx) => (
              <Badge key={idx} className="bg-purple-500/20 text-purple-300">
                <Tag className="w-3 h-3 mr-1" />
                {interest}
              </Badge>
            ))}
          </div>
        )}

        {/* Spotify Connection */}
        {!currentUser?.spotify_access_token && (
          <Button
            onClick={connectSpotify}
            className="bg-green-600 hover:bg-green-700 mb-6"
          >
            <Music className="w-4 h-4 mr-2" />
            Connect Spotify for Music Streaming
          </Button>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="bg-white/10 border border-white/20 flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {isEditing ? (
              <Card className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Edit Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Full Name</label>
                    <Input
                      value={editedUser.full_name}
                      onChange={(e) => setEditedUser({ ...editedUser, full_name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Bio</label>
                    <Textarea
                      value={editedUser.bio}
                      onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      className="bg-white/10 border-white/20 text-white"
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Phone</label>
                    <Input
                      value={editedUser.phone}
                      onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Address</label>
                    <Input
                      value={editedUser.address}
                      onChange={(e) => setEditedUser({ ...editedUser, address: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <Button onClick={handleSave} className="w-full bg-purple-600 hover:bg-purple-700">
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-effect border-white/10">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                          <p className="text-xl font-bold text-white">0</p>
                          <p className="text-gray-400 text-xs">Posts</p>
                        </div>
                        <FollowStats userEmail={currentUser?.email} currentUser={currentUser} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
            )}

            {/* Interests Management */}
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Interests & Preferences
                  </CardTitle>
                  <Button
                    onClick={() => setShowInterests(true)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editedUser.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {editedUser.interests.map((interest, idx) => (
                      <Badge key={idx} className="bg-purple-500/20 text-purple-300">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No interests added. Add some for personalized recommendations!</p>
                )}
              </CardContent>
            </Card>

            {/* My Hubs & Services */}
            {/* Ride Settings */}
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Ride Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setShowRidePreferences(true)}
                  variant="outline"
                  className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Ride Preferences
                </Button>
                <Button
                  onClick={() => setShowVehicleInfo(true)}
                  variant="outline"
                  className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10"
                >
                  <Car className="w-4 h-4 mr-2" />
                  My Vehicle Info (Driver)
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  My Hubs & Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate(createPageUrl("DriverHub"))}
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Car className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Driver Hub</p>
                        <p className="text-gray-400 text-xs">Manage rides & earnings</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition" />
                  </button>

                  <button
                    onClick={() => navigate(createPageUrl("ProviderHub"))}
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Provider Hub</p>
                        <p className="text-gray-400 text-xs">Services & bookings</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition" />
                  </button>

                  <button
                    onClick={() => navigate(createPageUrl("CreatorHub"))}
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                        <Video className="w-5 h-5 text-pink-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Creator Hub</p>
                        <p className="text-gray-400 text-xs">Content & monetization</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition" />
                  </button>

                  <button
                    onClick={() => navigate(createPageUrl("RestaurantOwnerHub"))}
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                        <Store className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Restaurant Hub</p>
                        <p className="text-gray-400 text-xs">Menu & orders</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Monetization & Earnings */}
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Earnings & Monetization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate(createPageUrl("Wallet"))}
                    className="flex items-center justify-between w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">My Wallet</p>
                        <p className="text-gray-400 text-xs">Balance: $0.00</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition" />
                  </button>

                  <button
                    onClick={() => navigate(createPageUrl("CreatorStorefront"))}
                    className="flex items-center justify-between w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Store className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">My Storefront</p>
                        <p className="text-gray-400 text-xs">Sell products & services</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  About Me
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentUser?.bio ? (
                  <p className="text-gray-300">{currentUser.bio}</p>
                ) : (
                  <p className="text-gray-400 text-sm">No bio yet. Click Edit to add one!</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            <PortfolioSection 
              userEmail={currentUser?.email} 
              isOwnProfile={true} 
              currentUser={currentUser} 
            />
          </TabsContent>

          <TabsContent value="gallery" className="space-y-4">
            <GallerySection 
              userEmail={currentUser?.email} 
              isOwnProfile={true} 
              currentUser={currentUser} 
            />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <ReviewsSection 
              userEmail={currentUser?.email} 
              isOwnProfile={true} 
              currentUser={currentUser} 
            />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Award className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Welcome to the platform!</p>
                      <p className="text-gray-400 text-sm">Start exploring experiences and services</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setShowPrivacySettings(true)}
                  variant="outline"
                  className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Privacy Settings
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Language & Region
                </Button>
              </CardContent>
            </Card>

            <Button
              onClick={() => base44.auth.logout()}
              className="w-full bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
            >
              Sign Out
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {/* Privacy Settings Modal */}
      <AnimatePresence>
        {showPrivacySettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowPrivacySettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Lock className="w-6 h-6" />
                  Privacy Settings
                </h3>
                <button onClick={() => setShowPrivacySettings(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Profile Visibility</label>
                  <Select
                    value={editedUser.privacy_settings.profile_visibility}
                    onValueChange={(v) => setEditedUser({
                      ...editedUser,
                      privacy_settings: { ...editedUser.privacy_settings, profile_visibility: v }
                    })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white">Show Email</span>
                  <button
                    onClick={() => setEditedUser({
                      ...editedUser,
                      privacy_settings: { ...editedUser.privacy_settings, show_email: !editedUser.privacy_settings.show_email }
                    })}
                    className={`w-12 h-6 rounded-full transition ${
                      editedUser.privacy_settings.show_email ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                      editedUser.privacy_settings.show_email ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white">Show Phone</span>
                  <button
                    onClick={() => setEditedUser({
                      ...editedUser,
                      privacy_settings: { ...editedUser.privacy_settings, show_phone: !editedUser.privacy_settings.show_phone }
                    })}
                    className={`w-12 h-6 rounded-full transition ${
                      editedUser.privacy_settings.show_phone ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                      editedUser.privacy_settings.show_phone ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white">Show Activity</span>
                  <button
                    onClick={() => setEditedUser({
                      ...editedUser,
                      privacy_settings: { ...editedUser.privacy_settings, show_activity: !editedUser.privacy_settings.show_activity }
                    })}
                    className={`w-12 h-6 rounded-full transition ${
                      editedUser.privacy_settings.show_activity ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                      editedUser.privacy_settings.show_activity ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <Button
                  onClick={async () => {
                    await updateUserMutation.mutateAsync({ privacy_settings: editedUser.privacy_settings });
                    setShowPrivacySettings(false);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Save Privacy Settings
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Customization Modal */}
      <ProfileCustomization
        isOpen={showCustomization}
        onClose={() => setShowCustomization(false)}
        currentUser={currentUser}
        onUpdate={async () => {
          const user = await base44.auth.me();
          setCurrentUser(user);
        }}
      />

      {/* Ride Preferences Modal */}
      <RidePreferencesModal
        isOpen={showRidePreferences}
        onClose={() => setShowRidePreferences(false)}
        currentUser={currentUser}
        onUpdate={async () => {
          const user = await base44.auth.me();
          setCurrentUser(user);
        }}
      />

      {/* Vehicle Info Modal */}
      <VehicleInfoModal
        isOpen={showVehicleInfo}
        onClose={() => setShowVehicleInfo(false)}
        currentUser={currentUser}
        onUpdate={async () => {
          const user = await base44.auth.me();
          setCurrentUser(user);
        }}
      />

      {/* Interests Modal */}
      <AnimatePresence>
        {showInterests && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowInterests(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Tag className="w-6 h-6" />
                  Manage Interests
                </h3>
                <button onClick={() => setShowInterests(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                    placeholder="Add an interest..."
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Button onClick={handleAddInterest} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {editedUser.interests.map((interest, idx) => (
                    <Badge key={idx} className="bg-purple-500/20 text-purple-300 flex items-center gap-1">
                      {interest}
                      <button onClick={() => handleRemoveInterest(interest)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <Button
                  onClick={async () => {
                    await updateUserMutation.mutateAsync({ interests: editedUser.interests });
                    setShowInterests(false);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Save Interests
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}