import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FollowButton from "./FollowButton";

export default function FollowStats({ userEmail, currentUser }) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(null); // 'followers' | 'following' | null

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', userEmail],
    queryFn: () => base44.entities.Follow.filter({ following_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', userEmail],
    queryFn: () => base44.entities.Follow.filter({ follower_email: userEmail }),
    enabled: !!userEmail
  });

  const UserListModal = ({ type, users, onClose }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-2xl max-h-[70vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-xl font-bold text-white capitalize">{type}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
          {users.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No {type} yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {users.map((user) => {
                const email = type === 'followers' ? user.follower_email : user.following_email;
                const name = type === 'followers' ? user.follower_name : user.following_name;

                return (
                  <div key={user.id} className="flex items-center justify-between p-4 hover:bg-white/5">
                    <button
                      onClick={() => {
                        onClose();
                        navigate(createPageUrl("UserProfile") + `?email=${encodeURIComponent(email)}`);
                      }}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {name?.[0] || "U"}
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">{name || "User"}</p>
                        <p className="text-gray-400 text-xs">{email}</p>
                      </div>
                    </button>

                    {currentUser && email !== currentUser.email && (
                      <FollowButton
                        targetEmail={email}
                        targetName={name}
                        currentUser={currentUser}
                        size="sm"
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

  return (
    <>
      <div className="flex items-center gap-6">
        <button
          onClick={() => setShowModal('followers')}
          className="text-center hover:opacity-80 transition"
        >
          <p className="text-xl font-bold text-white">{followers.length}</p>
          <p className="text-gray-400 text-xs">Followers</p>
        </button>

        <button
          onClick={() => setShowModal('following')}
          className="text-center hover:opacity-80 transition"
        >
          <p className="text-xl font-bold text-white">{following.length}</p>
          <p className="text-gray-400 text-xs">Following</p>
        </button>
      </div>

      <AnimatePresence>
        {showModal === 'followers' && (
          <UserListModal
            type="followers"
            users={followers}
            onClose={() => setShowModal(null)}
          />
        )}
        {showModal === 'following' && (
          <UserListModal
            type="following"
            users={following}
            onClose={() => setShowModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}