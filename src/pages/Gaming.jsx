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
import SpaceInvaders from "../components/games/SpaceInvaders";
import TetrisGame from "../components/games/TetrisGame";
import RacingGame from "../components/games/RacingGame";
import BrickBreaker3D from "../components/games/BrickBreaker3D";
import EndlessRunner3D from "../components/games/EndlessRunner3D";
import BubbleShooter from "../components/games/BubbleShooter";
import Highway95Racing from "../components/games/Highway95Racing";
import SkyRunner3D from "../components/games/SkyRunner3D";
import SudokuGame from "../components/games/SudokuGame";
import TowerDefense from "../components/games/TowerDefense";
import PhysicsCatapult from "../components/games/PhysicsCatapult";
import MultiplayerCards from "../components/games/MultiplayerCards";
import HiddenObjects from "../components/games/HiddenObjects";
import FPSShooter from "../components/games/FPSShooter";
import Basketball from "../components/games/Basketball";
import GlobalLeaderboard from "../components/games/GlobalLeaderboard";

export default function Gaming() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
      name: 'Neon Snake',
      description: 'Modern twist on classic snake with combos',
      icon: '🐍',
      category: 'classic',
      difficulty: 'Easy',
      component: SnakeGame,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'tetris',
      name: 'Neon Tetris',
      description: 'Stack blocks and clear lines',
      icon: '🟦',
      category: 'classic',
      difficulty: 'Medium',
      component: TetrisGame,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'space-invaders',
      name: 'Space Invaders',
      description: 'Defend Earth from alien invasion',
      icon: '👾',
      category: 'classic',
      difficulty: 'Medium',
      component: SpaceInvaders,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'i95-racing',
      name: 'I-95 Highway Racing',
      description: 'Realistic 3D highway racing with traffic',
      icon: '🏎️',
      category: 'action',
      difficulty: 'Hard',
      component: Highway95Racing,
      is3D: true,
      multiplayer: false
    },
    {
      id: 'pong',
      name: 'Retro Pong',
      description: 'Classic paddle vs AI',
      icon: '🏓',
      category: 'classic',
      difficulty: 'Easy',
      component: PongGame,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'soflo-runner',
      name: 'SoFlo Runner 3D',
      description: 'Run through Miami in 3D',
      icon: '🏃',
      category: 'action',
      difficulty: 'Medium',
      component: SoFloRunner,
      is3D: true,
      multiplayer: false
    },
    {
      id: 'crypto-collector',
      name: 'Crypto Collector',
      description: 'Catch falling coins',
      icon: '💰',
      category: 'action',
      difficulty: 'Medium',
      component: CryptoCollector,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'vibe-match',
      name: 'Vibe Match',
      description: 'Match the vibes & colors',
      icon: '🎨',
      category: 'puzzle',
      difficulty: 'Hard',
      component: VibeMatch,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'multiplayer-pong',
      name: 'Pong Battle',
      description: 'Challenge your friends online',
      icon: '⚔️',
      category: 'multiplayer',
      difficulty: 'Medium',
      component: MultiplayerPong,
      is3D: false,
      multiplayer: true
    },
    {
      id: 'brick-breaker',
      name: 'Brick Breaker 3D',
      description: 'Smash bricks with neon effects',
      icon: '🧱',
      category: 'classic',
      difficulty: 'Medium',
      component: BrickBreaker3D,
      is3D: true,
      multiplayer: false
    },
    {
      id: 'endless-runner',
      name: 'Endless Runner 3D',
      description: 'Run forever in 3D space',
      icon: '🏃',
      category: 'action',
      difficulty: 'Hard',
      component: EndlessRunner3D,
      is3D: true,
      multiplayer: false
    },
    {
      id: 'bubble-shooter',
      name: 'Bubble Shooter',
      description: 'Match and pop colorful bubbles',
      icon: '🫧',
      category: 'puzzle',
      difficulty: 'Easy',
      component: BubbleShooter,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'sky-runner',
      name: 'Sky Runner 3D',
      description: '3D platformer with dynamic levels',
      icon: '🏃',
      category: 'action',
      difficulty: 'Medium',
      component: SkyRunner3D,
      is3D: true,
      multiplayer: false
    },
    {
      id: 'sudoku',
      name: 'Neon Sudoku',
      description: 'Classic number puzzle with style',
      icon: '🧩',
      category: 'puzzle',
      difficulty: 'Medium',
      component: SudokuGame,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'tower-defense',
      name: 'Tower Defense',
      description: 'Strategic tower placement defense',
      icon: '🗼',
      category: 'strategy',
      difficulty: 'Hard',
      component: TowerDefense,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'physics-catapult',
      name: 'Physics Catapult',
      description: 'Launch projectiles to hit targets',
      icon: '🎯',
      category: 'action',
      difficulty: 'Medium',
      component: PhysicsCatapult,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'card-battle',
      name: 'Card Battle',
      description: 'Turn-based card combat',
      icon: '🃏',
      category: 'multiplayer',
      difficulty: 'Medium',
      component: MultiplayerCards,
      is3D: false,
      multiplayer: true
    },
    {
      id: 'hidden-objects',
      name: 'Hidden Objects',
      description: 'Find all the hidden items',
      icon: '🔍',
      category: 'puzzle',
      difficulty: 'Easy',
      component: HiddenObjects,
      is3D: false,
      multiplayer: false
    },
    {
      id: 'fps-shooter',
      name: 'FPS Shooter',
      description: 'First-person shooter action',
      icon: '🔫',
      category: 'action',
      difficulty: 'Hard',
      component: FPSShooter,
      is3D: true,
      multiplayer: false
    },
    {
      id: 'basketball',
      name: 'Basketball',
      description: 'Shoot hoops and score points',
      icon: '🏀',
      category: 'sports',
      difficulty: 'Medium',
      component: Basketball,
      is3D: false,
      multiplayer: false
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
            <p className="text-purple-100">Play arcade games and compete on the leaderboard!</p>
          </div>
        </div>

        {myStats && (
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p className="text-purple-100 text-xs">Games Played</p>
                <p className="text-white text-2xl font-bold">{myStats.totalGames}</p>
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
            <Button onClick={() => setShowLeaderboard(true)} className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 h-full px-6">
              <Trophy className="w-5 h-5 mr-2" />
              View Leaderboard
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 border-b border-white/10 overflow-x-auto">
        {['all', 'classic', 'action', 'puzzle', 'strategy', 'sports', 'multiplayer'].map(tab => (
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

              <div className="flex items-center justify-end text-sm">
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
                  <p className="text-gray-400 text-sm">{entry.game_name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {showLeaderboard && <GlobalLeaderboard currentUser={currentUser} onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}