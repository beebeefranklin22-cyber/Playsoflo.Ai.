import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Trophy, Medal, Award, User } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function GlobalLeaderboard({ currentUser, onClose }) {
  const [selectedGame, setSelectedGame] = useState('all');

  const games = [
    { id: 'all', name: 'All Games', icon: '🎮' },
    { id: 'snake', name: 'Snake', icon: '🐍' },
    { id: 'tetris', name: 'Tetris', icon: '🟦' },
    { id: 'pong', name: 'Pong', icon: '🏓' },
    { id: 'racing-2d', name: '2D Racing', icon: '🏎️' },
    { id: 'space-invaders', name: 'Space Invaders', icon: '👾' },
    { id: 'brick-breaker-3d', name: 'Brick Breaker 3D', icon: '🧱' },
    { id: 'endless-runner-3d', name: 'Endless Runner 3D', icon: '🏃' },
    { id: 'bubble-shooter', name: 'Bubble Shooter', icon: '🎈' },
    { id: 'i95-racing', name: 'I-95 Racing', icon: '🚗' },
    { id: 'sky-runner', name: 'Sky Runner 3D', icon: '🏃' },
    { id: 'sudoku', name: 'Sudoku', icon: '🧩' },
    { id: 'tower-defense', name: 'Tower Defense', icon: '🗼' },
    { id: 'physics-catapult', name: 'Physics Catapult', icon: '🎯' },
    { id: 'card-battle', name: 'Card Battle', icon: '🃏' },
    { id: 'hidden-objects', name: 'Hidden Objects', icon: '🔍' },
    { id: 'fps-shooter', name: 'FPS Shooter', icon: '🔫' },
    { id: 'basketball', name: 'Basketball', icon: '🏀' }
  ];

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['leaderboard', selectedGame],
    queryFn: async () => {
      const scores = selectedGame === 'all' 
        ? await base44.entities.GameScore.list('-score', 100)
        : await base44.entities.GameScore.filter({ game_name: selectedGame }, '-score', 100);

      // Group by user and get highest score
      const userScores = {};
      scores.forEach(score => {
        if (!userScores[score.user_email] || userScores[score.user_email].score < score.score) {
          userScores[score.user_email] = score;
        }
      });

      return Object.values(userScores).sort((a, b) => b.score - a.score).slice(0, 50);
    }
  });

  const userRank = leaderboard.findIndex(entry => entry.user_email === currentUser?.email) + 1;

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
        className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/50 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h2 className="text-3xl font-black text-white">Global Leaderboard</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Game filter */}
          <div className="mb-6 flex gap-2 flex-wrap">
            {games.map(game => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className={`px-4 py-2 rounded-full font-medium transition ${
                  selectedGame === game.id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {game.icon} {game.name}
              </button>
            ))}
          </div>

          {/* User's rank */}
          {currentUser && userRank > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-2 border-yellow-500/50 rounded-2xl p-4 mb-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-yellow-400" />
                  <div>
                    <p className="text-white font-bold">Your Rank</p>
                    <p className="text-gray-300 text-sm">{currentUser.full_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-yellow-400">#{userRank}</p>
                  <p className="text-gray-300 text-sm">{leaderboard[userRank - 1]?.score} pts</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Leaderboard */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No scores yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => {
                const isCurrentUser = entry.user_email === currentUser?.email;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`flex items-center justify-between p-4 rounded-xl transition ${
                      isCurrentUser
                        ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-2 border-purple-500/50'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl">
                        {index === 0 && <Medal className="w-10 h-10 text-yellow-400" />}
                        {index === 1 && <Medal className="w-10 h-10 text-gray-400" />}
                        {index === 2 && <Medal className="w-10 h-10 text-orange-600" />}
                        {index > 2 && <span className="text-gray-400">#{index + 1}</span>}
                      </div>
                      <div>
                        <p className="font-bold text-white flex items-center gap-2">
                          {entry.user_email.split('@')[0]}
                          {isCurrentUser && <User className="w-4 h-4 text-purple-400" />}
                        </p>
                        <p className="text-xs text-gray-400">{entry.game_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-purple-400">{entry.score}</p>
                      <p className="text-xs text-gray-400">points</p>
                    </div>
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