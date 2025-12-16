import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Gamepad2, Trophy, Users, Zap, Sparkles, Crown, Star, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import SnakeGame from "../components/games/SnakeGame";
import PongGame from "../components/games/PongGame";
import SoFloRunner from "../components/games/SoFloRunner";
import CryptoCollector from "../components/games/CryptoCollector";
import VibeMatch from "../components/games/VibeMatch";
import MultiplayerPong from "../components/games/MultiplayerPong";

export default function Gaming() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  React.useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['game-leaderboard'],
    queryFn: async () => {
      const scores = await base44.entities.GameScore.list('-score');
      
      // Group by user and game, get best scores
      const userScores = {};
      scores.forEach(score => {
        const key = `${score.user_email}-${score.game_name}`;
        if (!userScores[key] || userScores[key].score < score.score) {
          userScores[key] = score;
        }
      });
      
      return Object.values(userScores).sort((a, b) => b.score - a.score).slice(0, 10);
    },
    refetchInterval: 10000
  });

  const { data: myStats } = useQuery({
    queryKey: ['my-game-stats', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      const scores = await base44.entities.GameScore.filter({ user_email: currentUser.email });
      
      return {
        totalGames: scores.length,
        totalRewards: scores.reduce((sum, s) => sum + (s.reward_earned || 0), 0),
        bestScore: Math.max(...scores.map(s => s.score), 0),
        favoriteGame: scores.length > 0 ? scores.sort((a, b) => 
          scores.filter(s => s.game_name === b.game_name).length - 
          scores.filter(s => s.game_name === a.game_name).length
        )[0]?.game_name : null
      };
    },
    enabled: !!currentUser
  });

  const games = [
    {
      id: 'snake',
      name: 'Classic Snake',
      description: 'Eat, grow, don\'t crash',
      icon: '🐍',
      category: 'classic',
      difficulty: 'Easy',
      reward: '0.1-0.5 SFC',
      component: SnakeGame,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'pong',
      name: 'Retro Pong',
      description: 'Classic paddle action',
      icon: '🏓',
      category: 'classic',
      difficulty: 'Easy',
      reward: '0.1-0.3 SFC',
      component: PongGame,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'soflo-runner',
      name: 'SoFlo Runner 3D',
      description: 'Run through Miami in 3D',
      icon: '🏃',
      category: 'unique',
      difficulty: 'Medium',
      reward: '0.2-0.8 SFC',
      component: SoFloRunner,
      is3D: true,
      multiplayer: false
    },
    {
      id: 'crypto-collector',
      name: 'Crypto Collector',
      description: 'Catch falling coins',
      icon: '💰',
      category: 'unique',
      difficulty: 'Medium',
      reward: '0.2-0.6 SFC',
      component: CryptoCollector,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'vibe-match',
      name: 'Vibe Match',
      description: 'Match the vibes & colors',
      icon: '🎨',
      category: 'unique',
      difficulty: 'Hard',
      reward: '0.3-1.0 SFC',
      component: VibeMatch,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'multiplayer-pong',
      name: 'Pong Battle',
      description: 'Challenge your friends',
      icon: '⚔️',
      category: 'multiplayer',
      difficulty: 'Medium',
      reward: '0.5-1.5 SFC',
      component: MultiplayerPong,
      is3D: false,
      multiplayer: true
    }
  ];

  const filteredGames = activeTab === 'all' ? games : games.filter(g => g.category === activeTab);

  if (selectedGame) {
    const GameComponent = selectedGame.component;
    return <GameComponent currentUser={currentUser} onExit={() => setSelectedGame(null)} gameData={selectedGame} />;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Gamepad2 className="w-8 h-8" />
              PlaySoFlo Gaming
            </h1>
            <p className="text-purple-100">Play games, earn SoFloCoin rewards!</p>
          </div>
        </div>

        {myStats && (
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <p className="text-purple-100 text-xs">Games Played</p>
              <p className="text-white text-2xl font-bold">{myStats.totalGames}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <p className="text-purple-100 text-xs">Rewards Earned</p>
              <p className="text-white text-2xl font-bold flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                {myStats.totalRewards.toFixed(2)}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <p className="text-purple-100 text-xs">Best Score</p>
              <p className="text-white text-2xl font-bold">{myStats.bestScore}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <p className="text-purple-100 text-xs">Favorite</p>
              <p className="text-white text-sm font-bold truncate">{myStats.favoriteGame || 'None'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 border-b border-white/10 overflow-x-auto">
        {['all', 'classic', 'unique', 'multiplayer'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full font-medium transition whitespace-nowrap ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            {tab === 'all' ? 'All Games' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      <div className="p-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredGames.map((game, idx) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition cursor-pointer group"
              onClick={() => setSelectedGame(game)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl">{game.icon}</div>
                <div className="flex flex-col gap-1">
                  {game.is3D && (
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full font-bold">
                      3D
                    </span>
                  )}
                  {game.multiplayer && (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Multi
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-white font-bold text-xl mb-2">{game.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{game.description}</p>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold">{game.reward}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  game.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                  game.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {game.difficulty}
                </span>
              </div>

              <Button className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 group-hover:from-purple-700 group-hover:to-pink-700">
                Play Now
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Global Leaderboard
          </h2>
          <div className="space-y-2">
            {leaderboard.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-yellow-500 text-black' :
                    idx === 1 ? 'bg-gray-400 text-black' :
                    idx === 2 ? 'bg-orange-600 text-white' :
                    'bg-white/10 text-white'
                  }`}>
                    {idx === 0 ? <Crown className="w-5 h-5" /> : idx + 1}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{entry.user_email.split('@')[0]}</p>
                    <p className="text-gray-400 text-sm">{entry.game_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-lg">{entry.score}</p>
                  <p className="text-purple-400 text-sm flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    +{entry.reward_earned.toFixed(2)} SFC
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}