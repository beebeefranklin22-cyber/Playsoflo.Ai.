import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Music, MapPin, Calendar, Settings, Edit2, Camera, Users,  
  Lock, Upload, Loader2, Tag, Plus, X,
  Shield, Bell, Globe, Award,
  Activity, Sparkles, Briefcase, Wallet,
  DollarSign, ChevronRight, Palette, AlertTriangle, RefreshCw,
  Twitter, Instagram, Facebook, Youtube, Linkedin, AtSign
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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PortfolioSection from "../components/profile/PortfolioSection";
import GallerySection from "../components/profile/GallerySection";
import ReviewsList from "../components/reviews/ReviewsList";
import ProfileCustomization from "../components/profile/ProfileCustomization";
import FollowStats from "../components/social/FollowStats";
import DeleteAccountModal from "../components/profile/DeleteAccountModal";
import UsernameSetup from "../components/profile/UsernameSetup";
import ProfileBusinessHub from "../components/profile/ProfileBusinessHub";
import EditProfileModal from "../components/profile/EditProfileModal";
import StripePayoutCard from "../components/profile/StripePayoutCard";
import ExperienceBookingsStatus from "../components/profile/ExperienceBookingsStatus";

// Skeleton shimmer for fast perceived loading
function ProfileSkeleton() {
  return (
    <div className="min-h-screen pb-20 animate-pulse">
      <div className="h-64 bg-white/10" />
      <div className="px-6 -mt-20 relative z-10">
        <div className="flex items-end gap-6 mb-6">
          <div className="w-32 h-32 rounded-full bg-white/10 border-4 border-gray-900 flex-shrink-0" />
          <div className="flex-1 space-y-3 pb-4">
            <div className="h-7 bg-white/10 rounded-xl w-48" />
            <div className="h-4 bg-white/10 rounded-xl w-32" />
            <div className="h-4 bg-white/10 rounded-xl w-64" />
          </div>
        </div>
        <div className="space-y-4 mt-8">
          <div className="h-28 bg-white/10 rounded-2xl" />
          <div className="h-40 bg-white/10 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const [editedUser, setEditedUser] = useState({
    full_name: "",
    username: "",
    bio: "",
    link_in_bio: "",
    website: "",
    social_links: {
      twitter: "",
      instagram: "",
      facebook: "",
      tiktok: "",
      youtube: "",
      linkedin: ""
    },
    phone: "",
    address: "",
    interests: [],
    privacy_settings: {
      profile_visibility: "public",
      show_email: false,
      show_phone: false,
      show_activity: true,
      allow_messages: "everyone"
    },
    notification_preferences: {
      app_updates: true,
      promotions: true,
      new_features: true,
      ride_alerts: true,
      booking_reminders: true,
      payment_alerts: true,
      social_updates: false,
      marketing_emails: false
    }
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoadError(null);
        const user = await base44.auth.me();
        setCurrentUser(user);
        setEditedUser({
          full_name: user.full_name || "",
          username: user.username || "",
          bio: user.bio || "",
          link_in_bio: user.link_in_bio || "",
          website: user.website || "",
          social_links: user.social_links || {
            twitter: "",
            instagram: "",
            facebook: "",
            tiktok: "",
            youtube: "",
            linkedin: ""
          },
          phone: user.phone || "",
          address: user.address || "",
          interests: user.interests || [],
          privacy_settings: user.privacy_settings || {
            profile_visibility: "public",
            show_email: false,
            show_phone: false,
            show_activity: true,
            allow_messages: "everyone"
          },
          notification_preferences: user.notification_preferences || {
            app_updates: true,
            promotions: true,
            new_features: true,
            ride_alerts: true,
            booking_reminders: true,
            payment_alerts: true,
            social_updates: false,
            marketing_emails: false
          }
        });
      } catch (error) {
        console.log("Error fetching user:", error);
        setLoadError("We couldn't load your profile. Please check your connection and try again.");
      }
    };
    fetchUser();

    // Stripe onboarding return feedback
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'success') {
      toast.success('Stripe connected! Your payout status will update shortly.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('stripe') === 'refresh') {
      toast.info('Setup paused — you can finish connecting Stripe anytime.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
      const user = await base44.auth.me();
      return user;
    },
    onSuccess: (user) => {
      setCurrentUser(user);
      setEditedUser(prev => ({ ...prev, ...user }));
      toast.success('Profile saved!');
    },
    onError: (err) => {
      const msg = err?.message || '';
      if (msg.includes('network') || msg.includes('fetch')) {
        toast.error('No connection. Please check your internet and try again.');
      } else if (msg.includes('unauthorized') || msg.includes('401')) {
        toast.error('Session expired. Please sign in again.');
      } else {
        toast.error('Could not save your profile. Please try again in a moment.');
      }
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
        await updateUserMutation.mutateAsync({ profile_picture: file_url, profile_photo: file_url });
        toast.success('Profile photo updated!');
      }
      
      // Success haptic
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('success');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + (error.message || 'Unknown error'));
      
      // Error haptic
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('error');
      }
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
    try {
      await updateUserMutation.mutateAsync(editedUser);
      setIsEditing(false);
      
      // Success haptic
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('success');
      }
    } catch (error) {
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('error');
      }
      throw error;
    }
  };

  // Show skeleton while loading
  if (!currentUser && !loadError) return <ProfileSkeleton />;

  // Show friendly error state
  if (loadError) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Profile Unavailable</h2>
        <p className="text-gray-400 text-sm max-w-xs">{loadError}</p>
      </div>
      <Button
        onClick={() => { setLoadError(null); setCurrentUser(null); window.location.reload(); }}
        className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </Button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="min-h-screen pb-20"
      style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Cover Photo */}
      <div className="relative h-64">
        {currentUser?.cover_photo ? (
          <img 
            src={currentUser.cover_photo} 
            alt="Cover" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : currentUser?.profile_customization?.primary_color ? (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${currentUser.profile_customization.primary_color}, ${currentUser.profile_customization.secondary_color || currentUser.profile_customization.primary_color})`
            }}
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
            {(currentUser?.profile_picture || currentUser?.profile_photo) ? (
              <img
                src={currentUser.profile_picture || currentUser.profile_photo}
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
            <h1 className="text-3xl font-bold text-white mb-2"
              style={currentUser?.profile_customization?.font_style === 'elegant'
                ? { fontFamily: "Georgia, serif" }
                : currentUser?.profile_customization?.font_style === 'playful'
                ? { fontFamily: "'Comic Sans MS', cursive" }
                : currentUser?.profile_customization?.font_style === 'modern'
                ? { fontFamily: "'Courier New', monospace" }
                : {}}
            >
              {currentUser?.full_name || "User"}
            </h1>
            {currentUser?.profile_customization?.custom_status && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-2"
                style={{ 
                  backgroundColor: `${currentUser.profile_customization.primary_color || '#9333ea'}30`,
                  color: currentUser.profile_customization.primary_color || '#c084fc'
                }}>
                <Sparkles className="w-3 h-3" />
                {currentUser.profile_customization.custom_status}
              </div>
            )}
            <p className="text-purple-400 flex items-center gap-1 mb-1">
              <AtSign className="w-4 h-4" />
              {currentUser?.username || currentUser?.email?.split('@')[0]}
            </p>
            {currentUser?.privacy_settings?.show_email !== false && (
              <p className="text-gray-500 text-sm mb-2">{currentUser?.email}</p>
            )}
            {currentUser?.bio && (
              <p className="text-gray-300">{currentUser.bio}</p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button
              onClick={() => setShowCustomization(true)}
              variant="outline"
              size="icon"
              title="Customize appearance"
              className="bg-white/10 border-white/20"
            >
              <Palette className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setShowPrivacySettings(true)}
              variant="outline"
              size="icon"
              title="Privacy settings"
              className="bg-white/10 border-white/20"
            >
              <Lock className="w-4 h-4" />
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

        {/* Username Setup */}
        {!currentUser?.username && (
          <div className="mb-6">
            <UsernameSetup 
              currentUser={currentUser}
              onComplete={async () => {
                const user = await base44.auth.me();
                setCurrentUser(user);
              }}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="bg-white/10 border border-white/20 flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="business">Business Hub</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card className="glass-effect border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <FollowStats userEmail={currentUser?.email} currentUser={currentUser} />
                  </div>
                </div>
              </CardContent>
            </Card>

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

            {/* Payments & Payouts — easy Stripe setup right from the profile */}
            <StripePayoutCard currentUser={currentUser} />

            {/* Quick Hub Links */}
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  My Hubs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Provider Hub", sub: "Services & bookings", icon: Briefcase, color: "purple", page: "ProviderHub" },
                    { label: "My Wallet", sub: "Balance & earnings", icon: Wallet, color: "green", page: "Wallet" },
                    { label: "Business Hub", sub: "Store, driver & creator", icon: DollarSign, color: "blue", tab: "business" },
                    { label: "Reviews", sub: "What clients say", icon: Award, color: "yellow", tab: "reviews" },
                  ].map((hub) => (
                    <button
                      key={hub.label}
                      onClick={() => {
                        if (hub.page) navigate(createPageUrl(hub.page));
                        else document.querySelector(`[value="${hub.tab}"]`)?.click();
                      }}
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition group text-left"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        hub.color === "purple" ? "bg-purple-500/20" :
                        hub.color === "green" ? "bg-green-500/20" :
                        hub.color === "blue" ? "bg-blue-500/20" : "bg-yellow-500/20"
                      }`}>
                        <hub.icon className={`w-4 h-4 ${
                          hub.color === "purple" ? "text-purple-400" :
                          hub.color === "green" ? "text-green-400" :
                          hub.color === "blue" ? "text-blue-400" : "text-yellow-400"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate">{hub.label}</p>
                        <p className="text-gray-400 text-xs truncate">{hub.sub}</p>
                      </div>
                    </button>
                  ))}
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

            {/* Account Management - Prominent Delete Account */}
            <Card className="glass-effect border-red-500/40 bg-red-500/10">
              <CardHeader>
                <CardTitle className="text-red-300 flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-6 h-6" />
                  Delete Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-500/20 border-2 border-red-500/40 rounded-xl p-5">
                  <p className="text-red-200 font-bold mb-3 text-base">
                    ⚠️ Permanent Account Deletion
                  </p>
                  <p className="text-gray-300 text-sm mb-3">
                    This will <strong className="text-white">immediately and permanently</strong> remove:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-2 ml-4 mb-4">
                    <li>✗ All posts, messages, photos & videos</li>
                    <li>✗ Your profile and personal information</li>
                    <li>✗ Bookings, orders, and subscriptions</li>
                    <li>✗ Wallet balance and transaction history</li>
                    <li>✗ Groups, followers, and social connections</li>
                    <li>✗ Business listings and earnings data</li>
                  </ul>
                  <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-3 mb-3">
                    <p className="text-yellow-200 text-sm font-semibold">
                      🚨 NO RECOVERY POSSIBLE - Your data will be gone forever!
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (window.NativeAppBridge?.triggerHaptic) {
                      window.NativeAppBridge.triggerHaptic('warning');
                    }
                    setShowDeleteAccountModal(true);
                  }}
                  data-delete-account
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold min-h-[50px] text-base"
                >
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Delete My Account Permanently
                </Button>
                <p className="text-center text-gray-500 text-xs italic">
                  This action meets iOS App Store account deletion requirements
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4 mt-6">
            <ExperienceBookingsStatus currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="business" className="space-y-4">
            <ProfileBusinessHub
              currentUser={currentUser}
              onUserUpdate={async () => {
                const user = await base44.auth.me();
                setCurrentUser(user);
              }}
            />
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
            <ReviewsList userEmail={currentUser?.email} />
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
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-white font-medium">App Updates</span>
                    <p className="text-gray-400 text-xs">Get notified about new versions</p>
                  </div>
                  <button
                    onClick={() => setEditedUser({
                      ...editedUser,
                      notification_preferences: { ...editedUser.notification_preferences, app_updates: !editedUser.notification_preferences.app_updates }
                    })}
                    className={`w-12 h-6 rounded-full transition ${
                      editedUser.notification_preferences.app_updates ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                      editedUser.notification_preferences.app_updates ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-white font-medium">Promotions</span>
                    <p className="text-gray-400 text-xs">Special offers and deals</p>
                  </div>
                  <button
                    onClick={() => setEditedUser({
                      ...editedUser,
                      notification_preferences: { ...editedUser.notification_preferences, promotions: !editedUser.notification_preferences.promotions }
                    })}
                    className={`w-12 h-6 rounded-full transition ${
                      editedUser.notification_preferences.promotions ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                      editedUser.notification_preferences.promotions ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-white font-medium">New Features</span>
                    <p className="text-gray-400 text-xs">Learn about new capabilities</p>
                  </div>
                  <button
                    onClick={() => setEditedUser({
                      ...editedUser,
                      notification_preferences: { ...editedUser.notification_preferences, new_features: !editedUser.notification_preferences.new_features }
                    })}
                    className={`w-12 h-6 rounded-full transition ${
                      editedUser.notification_preferences.new_features ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                      editedUser.notification_preferences.new_features ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-white font-medium">Ride Alerts</span>
                    <p className="text-gray-400 text-xs">Driver updates and arrivals</p>
                  </div>
                  <button
                    onClick={() => setEditedUser({
                      ...editedUser,
                      notification_preferences: { ...editedUser.notification_preferences, ride_alerts: !editedUser.notification_preferences.ride_alerts }
                    })}
                    className={`w-12 h-6 rounded-full transition ${
                      editedUser.notification_preferences.ride_alerts ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                      editedUser.notification_preferences.ride_alerts ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-white font-medium">Booking Reminders</span>
                    <p className="text-gray-400 text-xs">Upcoming reservations</p>
                  </div>
                  <button
                    onClick={() => setEditedUser({
                      ...editedUser,
                      notification_preferences: { ...editedUser.notification_preferences, booking_reminders: !editedUser.notification_preferences.booking_reminders }
                    })}
                    className={`w-12 h-6 rounded-full transition ${
                      editedUser.notification_preferences.booking_reminders ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                      editedUser.notification_preferences.booking_reminders ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-white font-medium">Payment Alerts</span>
                    <p className="text-gray-400 text-xs">Transaction confirmations</p>
                  </div>
                  <button
                    onClick={() => setEditedUser({
                      ...editedUser,
                      notification_preferences: { ...editedUser.notification_preferences, payment_alerts: !editedUser.notification_preferences.payment_alerts }
                    })}
                    className={`w-12 h-6 rounded-full transition ${
                      editedUser.notification_preferences.payment_alerts ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                      editedUser.notification_preferences.payment_alerts ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-white font-medium">Social Updates</span>
                    <p className="text-gray-400 text-xs">Likes, comments, follows</p>
                  </div>
                  <button
                    onClick={() => setEditedUser({
                      ...editedUser,
                      notification_preferences: { ...editedUser.notification_preferences, social_updates: !editedUser.notification_preferences.social_updates }
                    })}
                    className={`w-12 h-6 rounded-full transition ${
                      editedUser.notification_preferences.social_updates ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                      editedUser.notification_preferences.social_updates ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-white font-medium">Marketing Emails</span>
                    <p className="text-gray-400 text-xs">Newsletter and updates</p>
                  </div>
                  <button
                    onClick={() => setEditedUser({
                      ...editedUser,
                      notification_preferences: { ...editedUser.notification_preferences, marketing_emails: !editedUser.notification_preferences.marketing_emails }
                    })}
                    className={`w-12 h-6 rounded-full transition ${
                      editedUser.notification_preferences.marketing_emails ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                      editedUser.notification_preferences.marketing_emails ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <Button
                  onClick={async () => {
                    await updateUserMutation.mutateAsync({ notification_preferences: editedUser.notification_preferences });
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 mt-4"
                >
                  Save Notification Preferences
                </Button>
              </CardContent>
            </Card>

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
                  onClick={() => navigate(createPageUrl("Notifications"))}
                  variant="outline"
                  className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Notification Center
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl("TermsOfService"))}
                  variant="outline"
                  className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Terms of Service
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

            {/* Sign Out */}
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Session Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    if (window.NativeAppBridge?.triggerHaptic) {
                      window.NativeAppBridge.triggerHaptic('light');
                    }
                    base44.auth.logout();
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 min-h-[44px]"
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* Delete Account - Prominent Section */}
            <Card className="glass-effect border-red-500/30 bg-red-500/5">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Delete Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-300 font-semibold mb-2">
                    Permanently delete your account
                  </p>
                  <p className="text-gray-400 text-sm mb-3">
                    This will delete all your data including:
                  </p>
                  <ul className="text-gray-400 text-xs space-y-1 ml-4 mb-4">
                    <li>• Profile, posts, and messages</li>
                    <li>• Bookings, orders, and transactions</li>
                    <li>• Wallet balance and payment methods</li>
                    <li>• All content and account history</li>
                  </ul>
                  <p className="text-yellow-400 text-xs font-semibold">
                    ⚠️ This action cannot be undone!
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (window.NativeAppBridge?.triggerHaptic) {
                      window.NativeAppBridge.triggerHaptic('warning');
                    }
                    setShowDeleteAccountModal(true);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white min-h-[44px]"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Delete My Account Permanently
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <EditProfileModal
            currentUser={currentUser}
            onClose={() => setIsEditing(false)}
            onSaved={async () => {
              const user = await base44.auth.me();
              setCurrentUser(user);
            }}
          />
        )}
      </AnimatePresence>

      {/* Privacy Settings Modal */}
      <AnimatePresence>
        {showPrivacySettings && (
          <motion.div
            key="privacy-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowPrivacySettings(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
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

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        currentUser={currentUser}
      />

      {/* Interests Modal */}
      <AnimatePresence>
        {showInterests && (
          <motion.div
            key="interests-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowInterests(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Tag className="w-6 h-6" />
                  Manage Interests
                </h3>
                <button onClick={() => setShowInterests(false)} className="p-1 hover:bg-white/10 rounded-full transition">
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
                    autoFocus
                  />
                  <Button onClick={handleAddInterest} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {editedUser.interests.map((interest, idx) => (
                    <Badge key={idx} className="bg-purple-500/20 text-purple-300 flex items-center gap-1">
                      {interest}
                      <button onClick={() => handleRemoveInterest(interest)} className="hover:text-white transition ml-1">
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
                  disabled={updateUserMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {updateUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Interests
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}