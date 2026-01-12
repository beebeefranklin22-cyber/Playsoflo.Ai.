import React, { useState } from "react";
import { X, Trophy, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function FriendsLeaderboard({ currentUser, gameName, onClose }) {
  const { data: friendsScores = [], isLoading } = useQuery({
    queryKey: ['friends-leaderboard', gameName, currentUser?.email],
    queryFn: async () => {
      // Get friends
      const friendships = await base44.entities.Friendship.filter({
        $or: [
          { user1_email: currentUser.email },
          { user2_email: currentUser.email }
        ]
      });
      
      const friendEmails = friendships.map(f => 
        f.user1_email === currentUser.email ? f.user2_email : f.user1_email
      );
      
      // Include current user
      const allEmails = [currentUser.email, ...friendEmails];
      
      // Get scores for all
      const allScores = await Promise.all(allEmails.map(async email => {
        const scores = await base44.entities.GameScore.filter({ 
          user_email: email,
          game_name: gameName
        }, '-score', 1);
        
        return scores.length > 0 ? scores[0] : { user_email: email, score: 0, game_name: gameName };
      }));
      
      return allScores.sort((a, b) => b.score - a.score);
    },
    enabled: !!currentUser && !!gameName
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-xl rounded-3xl border-2 border-indigo-500/50 shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div>
              <h2 className="text-2xl font-black text-white">Friends Only</h2>
              <p className="text-gray-400 text-sm">{gameName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="space-y-2">
              {friendsScores.map((entry, index) => {
                const isCurrentUser = entry.user_email === currentUser?.email;
                return (
                  <motion.div
                    key={entry.user_email}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-4 rounded-xl transition ${
                      isCurrentUser
                        ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 border-2 border-purple-500/60'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-black">
                        {index === 0 && <Medal className="w-8 h-8 text-yellow-400" />}
                        {index === 1 && <Medal className="w-8 h-8 text-gray-400" />}
                        {index === 2 && <Medal className="w-8 h-8 text-orange-600" />}
                        {index > 2 && <span className="text-gray-400">#{index + 1}</span>}
                      </div>
                      <div>
                        <p className="font-bold text-white">
                          {entry.user_email.split('@')[0]}
                          {isCurrentUser && <span className="text-purple-400 text-sm ml-2">(You)</span>}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-black text-purple-400">{entry.score}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}