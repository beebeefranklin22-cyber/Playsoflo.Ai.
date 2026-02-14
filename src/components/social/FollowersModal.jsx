import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Users, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FollowButton from "./FollowButton";

export default function FollowersModal({ isOpen, onClose, userEmail, currentUser, mode = 'followers' }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(mode);

  const { data: followers = [], isLoading: loadingFollowers } = useQuery({
    queryKey: ['user-followers', userEmail],
    queryFn: async () => {
      const followData = await base44.entities.Follow.filter({
        following_email: userEmail
      });
      
      // Get full user details for each follower
      const users = await base44.entities.User.list();
      return followData.map(follow => {
        const followerUser = users.find(u => u.email === follow.follower_email);
        return {
          ...follow,
          follower_user: followerUser
        };
      });
    },
    enabled: isOpen && activeTab === 'followers'
  });

  const { data: following = [], isLoading: loadingFollowing } = useQuery({
    queryKey: ['user-following', userEmail],
    queryFn: async () => {
      const followData = await base44.entities.Follow.filter({
        follower_email: userEmail
      });
      
      // Get full user details for each following
      const users = await base44.entities.User.list();
      return followData.map(follow => {
        const followingUser = users.find(u => u.email === follow.following_email);
        return {
          ...follow,
          following_user: followingUser
        };
      });
    },
    enabled: isOpen && activeTab === 'following'
  });

  if (!isOpen) return null;

  const displayList = activeTab === 'followers' ? followers : following;
  const isLoading = activeTab === 'followers' ? loadingFollowers : loadingFollowing;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden border border-white/20"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6" />
              Connections
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('followers')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                activeTab === 'followers'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Followers ({followers.length})
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                activeTab === 'following'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Following ({following.length})
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            </div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayList.map((follow) => {
                const displayEmail = activeTab === 'followers' ? follow.follower_email : follow.following_email;
                const displayUser = activeTab === 'followers' ? follow.follower_user : follow.following_user;
                const displayName = activeTab === 'followers' ? follow.follower_name : follow.following_name;
                
                return (
                  <div key={follow.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition">
                    <button
                      onClick={() => {
                        navigate(createPageUrl("UserProfile") + `?user=${displayEmail}`);
                        onClose();
                      }}
                      className="flex items-center gap-3 flex-1"
                    >
                      {displayUser?.profile_picture ? (
                        <img 
                          src={displayUser.profile_picture} 
                          className="w-12 h-12 rounded-full object-cover"
                          alt={displayName}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {(displayName || displayEmail)[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-white font-semibold">{displayName || displayEmail.split('@')[0]}</p>
                        <p className="text-gray-400 text-sm">@{displayUser?.username || displayEmail.split('@')[0]}</p>
                      </div>
                    </button>
                    
                    {currentUser && displayEmail !== currentUser.email && (
                      <FollowButton 
                        targetUserEmail={displayEmail}
                        currentUser={currentUser}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}