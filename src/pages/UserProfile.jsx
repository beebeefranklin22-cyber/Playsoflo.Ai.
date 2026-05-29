import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Grid, Video, Bookmark, MessageCircle, MoreHorizontal, ChevronLeft, Play,
  Heart, Globe, Twitter, Instagram, Facebook, Youtube, Linkedin, AtSign,
  MoreVertical, ShoppingBag, Megaphone, ExternalLink, Plus, Music
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import FollowButton from "../components/social/FollowButton";
import AddFriendButton from "../components/friends/AddFriendButton";
import FollowersModal from "../components/social/FollowersModal";
import ShowcasePostModal from "../components/profile/ShowcasePostModal";
import ProfileHighlights from "../components/profile/ProfileHighlights";

const SHOWCASE_TYPE_COLORS = {
  product: "from-purple-500 to-pink-500",
  business: "from-blue-500 to-cyan-500",
  content: "from-yellow-500 to-orange-500",
  promo: "from-red-500 to-pink-500",
  saved: "from-green-500 to-teal-500",
  shared: "from-indigo-500 to-purple-500",
  ad: "from-orange-500 to-red-500",
};

export default function UserProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const userParam = searchParams.get("email") || searchParams.get("user") || searchParams.get("username");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalMode, setFollowersModalMode] = useState("followers");
  const [showShowcaseModal, setShowShowcaseModal] = useState(false);
  const [coverVideoError, setCoverVideoError] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: profileUser, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile-user", userParam],
    queryFn: async () => {
      if (!userParam) return null;

      // If it looks like a MongoDB ObjectId (24 hex chars), do a direct ID lookup
      const isId = /^[a-f0-9]{24}$/i.test(userParam);
      if (isId) {
        const res = await base44.functions.invoke("searchUsers", { id: userParam });
        return res.users?.[0] || null;
      }

      // Otherwise search by email/username
      const res = await base44.functions.invoke("searchUsers", { query: userParam });
      const users = res.users || [];
      const term = userParam.toLowerCase();
      return users.find(u =>
        u.email?.toLowerCase() === term ||
        u.username?.toLowerCase() === term
      ) || users[0] || null;
    },
    enabled: !!userParam,
  });

  const isOwnProfile = currentUser?.email === profileUser?.email;
  const isPrivate = !!(profileUser?.is_private || profileUser?.privacy_settings?.is_private);

  // Check if current user follows this profile (needed for private gating)
  const { data: isFollowing = false } = useQuery({
    queryKey: ["is-following", currentUser?.email, profileUser?.email],
    queryFn: async () => {
      const follows = await base44.entities.Follow.filter({
        follower_email: currentUser.email,
        following_email: profileUser.email,
      });
      return follows.length > 0;
    },
    enabled: !!currentUser && !!profileUser?.email && !isOwnProfile,
  });

  const canViewContent = isOwnProfile || !isPrivate || isFollowing;

  const { data: followersData = [] } = useQuery({
    queryKey: ["followers", profileUser?.email],
    queryFn: () => base44.entities.Follow.filter({ following_email: profileUser.email }),
    enabled: !!profileUser?.email,
    staleTime: 0,
  });

  const { data: followingData = [] } = useQuery({
    queryKey: ["following", profileUser?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: profileUser.email }),
    enabled: !!profileUser?.email,
    staleTime: 0,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["user-posts", profileUser?.email],
    queryFn: () => base44.entities.SocialPost.filter({ created_by: profileUser.email }, "-created_date"),
    enabled: !!profileUser?.email && canViewContent,
  });

  const { data: videoPosts = [] } = useQuery({
    queryKey: ["user-videos", profileUser?.email],
    queryFn: () => base44.entities.VideoPost.filter({ creator_email: profileUser.email }, "-created_date"),
    enabled: !!profileUser?.email && canViewContent,
  });

  const { data: reels = [] } = useQuery({
    queryKey: ["user-reels", profileUser?.email],
    queryFn: () => base44.entities.Reel.filter({ creator_email: profileUser.email }, "-created_date"),
    enabled: !!profileUser?.email && canViewContent,
  });

  const { data: showcasePosts = [] } = useQuery({
    queryKey: ["user-showcase", profileUser?.email],
    queryFn: () => base44.entities.ShowcasePost.filter({ creator_email: profileUser.email }, "-created_date"),
    enabled: !!profileUser?.email && canViewContent,
  });

  const { data: listeningHistory = [] } = useQuery({
    queryKey: ["user-history", profileUser?.email],
    queryFn: async () => {
      const history = await base44.entities.ListeningHistory.filter({ user_email: profileUser.email });
      return history.sort((a, b) => new Date(b.played_at) - new Date(a.played_at)).slice(0, 20);
    },
    enabled: !!profileUser?.email && (profileUser?.is_public_history || isOwnProfile),
  });

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-2">User not found</p>
          <Button onClick={() => navigate(-1)} className="bg-purple-600 hover:bg-purple-700">Go Back</Button>
        </div>
      </div>
    );
  }

  const coverMedia = profileUser.cover_video_url || profileUser.cover_image_url || profileUser.cover_url || profileUser.cover_photo;
  const isCoverVideo = !coverVideoError && (profileUser.cover_video_url || (coverMedia && coverMedia.match(/\.(mp4|mov|webm|ogg)/i)));
  const themeColors = profileUser.profile_customization;
  const coverStyle = (!coverMedia && themeColors?.primary_color && themeColors?.secondary_color)
    ? { background: `linear-gradient(135deg, ${themeColors.primary_color}, ${themeColors.secondary_color})` }
    : {};

  const tabs = [
    { id: "posts", label: "Posts", icon: Grid },
    { id: "videos", label: "Videos", icon: Video },
    { id: "reels", label: "Reels", icon: Play },
    { id: "showcase", label: "Showcase", icon: ShoppingBag },
    { id: "more", label: "More", icon: MoreVertical },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* ── COVER PHOTO / VIDEO ── with header overlaid on top */}
      <div className="relative w-full h-52 bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 overflow-hidden" style={coverStyle}>
        {coverMedia && isCoverVideo ? (
          <video
            src={coverMedia}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            onError={() => setCoverVideoError(true)}
          />
        ) : coverMedia && !isCoverVideo ? (
          <img src={coverMedia} className="w-full h-full object-cover" alt="cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-fuchsia-900 to-indigo-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Header overlaid on cover */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1.5 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <span className="text-white font-semibold text-sm drop-shadow">{profileUser.username || profileUser.full_name}</span>
          </div>
          <button className="p-1.5 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm">
            <MoreHorizontal className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Profile Info — avatar sits below cover, not inside it */}
      <div className="px-4 pb-4">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-12 mb-3 pt-0">
          <div className="w-24 h-24 rounded-full border-4 border-[#07131A] overflow-visible bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl flex-shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden">
            {(profileUser.profile_picture || profileUser.profile_photo) ? (
              <img src={profileUser.profile_picture || profileUser.profile_photo} alt={profileUser.full_name} className="w-full h-full object-cover" />
            ) : (
              (profileUser.full_name?.[0] || "U").toUpperCase()
            )}
            </div>
          </div>
          {!isOwnProfile && currentUser && (
            <div className="flex gap-2 mt-2">
              <FollowButton
                targetUserEmail={profileUser.email}
                currentUser={currentUser}
              />
              <button
                className="p-2 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition"
                onClick={() => navigate(createPageUrl("Messages") + `?user=${profileUser.email}`)}
              >
                <MessageCircle className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-white">{profileUser.full_name}</h2>
            <p className="text-purple-400 flex items-center gap-1 text-sm">
              <AtSign className="w-3.5 h-3.5" />
              {profileUser.username || profileUser.email?.split("@")[0]}
            </p>
            {profileUser.privacy_settings?.show_email !== false && (
              <p className="text-gray-500 text-xs mt-0.5">{profileUser.email}</p>
            )}
          </div>


        </div>

        {profileUser.bio && <p className="text-gray-300 text-sm mb-3">{profileUser.bio}</p>}

        {/* Link in bio */}
        {profileUser.link_in_bio && (
          <a
            href={profileUser.link_in_bio}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-cyan-400 text-sm font-medium mb-3 hover:text-cyan-300 transition"
          >
            <Globe className="w-4 h-4" />
            {profileUser.link_in_bio.replace(/^https?:\/\//, "")}
          </a>
        )}

        {/* Social links */}
        {(profileUser.website || profileUser.social_links) && (
          <div className="flex flex-wrap gap-3 mb-3">
            {profileUser.website && (
              <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 text-sm">
                <Globe className="w-4 h-4" /> Website
              </a>
            )}
            {profileUser.social_links?.twitter && (
              <a href={`https://twitter.com/${profileUser.social_links.twitter}`} target="_blank" rel="noopener noreferrer" className="text-blue-400"><Twitter className="w-4 h-4" /></a>
            )}
            {profileUser.social_links?.instagram && (
              <a href={`https://instagram.com/${profileUser.social_links.instagram}`} target="_blank" rel="noopener noreferrer" className="text-pink-400"><Instagram className="w-4 h-4" /></a>
            )}
            {profileUser.social_links?.youtube && (
              <a href={`https://youtube.com/${profileUser.social_links.youtube}`} target="_blank" rel="noopener noreferrer" className="text-red-400"><Youtube className="w-4 h-4" /></a>
            )}
            {profileUser.social_links?.facebook && (
              <a href={`https://facebook.com/${profileUser.social_links.facebook}`} target="_blank" rel="noopener noreferrer" className="text-blue-500"><Facebook className="w-4 h-4" /></a>
            )}
            {profileUser.social_links?.linkedin && (
              <a href={`https://linkedin.com/in/${profileUser.social_links.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-blue-600"><Linkedin className="w-4 h-4" /></a>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-6 mb-3">
          <div className="text-center">
            <p className="text-white font-bold">{posts.length}</p>
            <p className="text-gray-400 text-xs">Posts</p>
          </div>
          <button onClick={() => { setFollowersModalMode("followers"); setShowFollowersModal(true); }} className="text-center hover:opacity-80">
            <p className="text-white font-bold">{followersData.length}</p>
            <p className="text-gray-400 text-xs">Followers</p>
          </button>
          <button onClick={() => { setFollowersModalMode("following"); setShowFollowersModal(true); }} className="text-center hover:opacity-80">
            <p className="text-white font-bold">{followingData.length}</p>
            <p className="text-gray-400 text-xs">Following</p>
          </button>
        </div>

        {!isOwnProfile && currentUser && (
          <AddFriendButton targetUser={profileUser} currentUser={currentUser} />
        )}

        {/* Showcase CTA for own profile */}
        {isOwnProfile && (
          <Button
            onClick={() => setShowShowcaseModal(true)}
            className="mt-3 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Showcase Post
          </Button>
        )}
      </div>

      {/* Highlights */}
      <ProfileHighlights
        profileUser={profileUser}
        isOwnProfile={isOwnProfile}
        posts={posts}
        reels={reels}
      />

      {/* Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex-1 min-w-[60px] py-3 flex items-center justify-center gap-1.5 text-sm transition-all ${
              activeTab === tab.id
                ? "border-b-2 border-purple-500 text-white font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── PRIVATE PROFILE LOCK ── */}
      {!canViewContent && (
        <div className="text-center py-20 px-8">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-lg mb-1">This account is private</h3>
          <p className="text-gray-400 text-sm">Follow this account to see their posts, videos, and reels.</p>
        </div>
      )}

      {/* ── POSTS TAB ── (images + any video posts) */}
      {canViewContent && activeTab === "posts" && (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {posts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="aspect-square relative cursor-pointer group overflow-hidden bg-black"
            >
              {post.image_url ? (
                <img src={post.image_url} alt={post.caption} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <Grid className="w-6 h-6 text-gray-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <div className="flex items-center gap-1 text-white text-sm"><Heart className="w-4 h-4 fill-white" />{post.likes_count || 0}</div>
                <div className="flex items-center gap-1 text-white text-sm"><MessageCircle className="w-4 h-4 fill-white" />{post.comments_count || 0}</div>
              </div>
              {post.music_playing && (
                <div className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1">
                  <Music className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.div>
          ))}
          {posts.length === 0 && (
            <div className="col-span-3 text-center py-20 text-gray-400">No posts yet</div>
          )}
        </div>
      )}

      {/* ── VIDEOS TAB ── */}
      {canViewContent && activeTab === "videos" && (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {videoPosts.map((v, idx) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="aspect-square relative cursor-pointer group overflow-hidden bg-black"
            >
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <Video className="w-6 h-6 text-gray-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <Play className="w-10 h-10 text-white" />
              </div>
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-xs">
                <Play className="w-3 h-3" />{v.views || 0}
              </div>
            </motion.div>
          ))}
          {videoPosts.length === 0 && (
            <div className="col-span-3 text-center py-20 text-gray-400">No videos yet</div>
          )}
        </div>
      )}

      {/* ── REELS TAB ── */}
      {canViewContent && activeTab === "reels" && (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {reels.map((reel, idx) => (
            <motion.div
              key={reel.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="aspect-[9/16] relative cursor-pointer group overflow-hidden bg-black"
              onClick={() => navigate(createPageUrl("Reels") + `?reel=${reel.id}`)}
            >
              {reel.thumbnail_url ? (
                <img src={reel.thumbnail_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <Play className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Play className="w-10 h-10 text-white" />
              </div>
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
                <Heart className="w-3 h-3" />{reel.likes_count || 0}
              </div>
            </motion.div>
          ))}
          {reels.length === 0 && (
            <div className="col-span-3 text-center py-20 text-gray-400">No reels yet</div>
          )}
        </div>
      )}

      {/* ── SHOWCASE TAB ── */}
      {canViewContent && activeTab === "showcase" && (
        <div className="p-3 space-y-3">
          {isOwnProfile && (
            <button
              onClick={() => setShowShowcaseModal(true)}
              className="w-full border-2 border-dashed border-purple-500/40 rounded-2xl py-6 flex flex-col items-center gap-2 hover:border-purple-500/70 hover:bg-purple-500/5 transition"
            >
              <Plus className="w-8 h-8 text-purple-400" />
              <p className="text-purple-300 font-medium">Add New Showcase</p>
              <p className="text-gray-500 text-xs">Products · Business · Promos · Content</p>
            </button>
          )}

          {showcasePosts.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition"
            >
              {/* Media */}
              {item.media_url && (
                <div className="relative w-full aspect-video bg-black">
                  {item.media_type === "video" ? (
                    <video src={item.media_url} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={item.media_url} className="w-full h-full object-cover" alt={item.title} />
                  )}
                  {item.is_promoted && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Megaphone className="w-3 h-3" /> Promoted
                    </div>
                  )}
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r ${SHOWCASE_TYPE_COLORS[item.showcase_type] || "from-purple-500 to-pink-500"} text-white text-xs font-bold capitalize`}>
                    {item.showcase_type}
                  </div>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-white font-bold text-base">{item.title}</h3>
                  {item.price > 0 && (
                    <span className="text-green-400 font-bold text-sm flex-shrink-0">${item.price.toFixed(2)}</span>
                  )}
                </div>

                {item.description && (
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.description}</p>
                )}

                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.tags.map((tag, i) => (
                      <span key={i} className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-gray-500 text-sm">
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{item.likes_count || 0}</span>
                    <span className="flex items-center gap-1"><Play className="w-3.5 h-3.5" />{item.views_count || 0}</span>
                  </div>
                  {item.link_url && (
                    <a
                      href={item.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:opacity-90 transition"
                    >
                      {item.link_label || "Learn More"}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {showcasePosts.length === 0 && !isOwnProfile && (
            <div className="text-center py-20 text-gray-400">No showcase posts yet</div>
          )}
        </div>
      )}

      {/* ── MORE TAB (listening history) ── */}
      {canViewContent && activeTab === "more" && (
        <div className="p-4 space-y-3">
          <h3 className="text-white font-semibold mb-3">Listening History</h3>
          {listeningHistory.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition">
              <img
                src={item.cover_art_url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100"}
                alt={item.track_title}
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{item.track_title}</p>
                <p className="text-gray-400 text-sm truncate">{item.artist_name}</p>
                <p className="text-gray-500 text-xs">{new Date(item.played_at).toLocaleDateString()}</p>
              </div>
              <Play className="w-5 h-5 text-purple-400 flex-shrink-0" />
            </div>
          ))}
          {listeningHistory.length === 0 && (
            <div className="text-center py-10 text-gray-400">No listening history</div>
          )}
        </div>
      )}

      {/* Followers Modal */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userEmail={profileUser?.email}
        currentUser={currentUser}
        mode={followersModalMode}
      />

      {/* Showcase Modal */}
      <AnimatePresence>
        {showShowcaseModal && (
          <ShowcasePostModal
            currentUser={currentUser}
            onClose={() => setShowShowcaseModal(false)}
            onSaved={() => queryClient.invalidateQueries(["user-showcase", profileUser?.email])}
          />
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}