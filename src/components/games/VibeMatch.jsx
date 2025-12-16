import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function VibeMatch({ currentUser, onExit }) {
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState([]);
  const [playerSequence, setPlayerSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeVibe, setActiveVibe] = useState(null);
  const startTimeRef = React.useRef(null);

  const vibes = [
    { id: 0, name: 'energetic', color: 'from-red-500 to-orange-500', sound: 'C' },
    { id: 1, name: 'chill', color: 'from-blue-500 to-cyan-500', sound: 'D' },
    { id: 2, name: 'luxury', color: 'from-yellow-500 to-amber-500', sound: 'E' },
    { id: 3, name: 'romantic', color: 'from-pink-500 to-rose-500', sound: 'F' }
  ];

  useEffect(() => {
    if (sequence.length > 0 && playerSequence.length === 0 && !isPlaying) {
      playSequence();
    }
  }, [sequence]);

  useEffect(() => {
    if (playerSequence.length > 0 && playerSequence.length === sequence.length) {
      checkSequence();
    }
  }, [playerSequence]);

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setSequence([]);
    setPlayerSequence([]);
    setGameState('playing');
    startTimeRef.current = Date.now();
    addToSequence();
  };

  const addToSequence = () => {
    const randomVibe = Math.floor(Math.random() * vibes.length);
    setSequence(prev => [...prev, randomVibe]);
    setPlayerSequence([]);
  };

  const playSequence = async () => {
    setIsPlaying(true);
    
    for (let i = 0; i < sequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setActiveVibe(sequence[i]);
      await new Promise(resolve => setTimeout(resolve, 500));
      setActiveVibe(null);
    }
    
    setIsPlaying(false);
  };

  const handleVibeClick = (vibeId) => {
    if (isPlaying) return;
    
    setActiveVibe(vibeId);
    setTimeout(() => setActiveVibe(null), 300);
    
    const newPlayerSequence = [...playerSequence, vibeId];
    setPlayerSequence(newPlayerSequence);
  };

  const checkSequence = () => {
    const isCorrect = playerSequence.every((vibe, index) => vibe === sequence[index]);
    
    if (isCorrect) {
      const points = level * 10;
      setScore(prev => prev + points);
      setLevel(prev => prev + 1);
      
      setTimeout(() => {
        addToSequence();
      }, 1000);
    } else {
      endGame();
    }
  };

  const endGame = async () => {
    setGameState('gameover');
    
    if (!currentUser) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const reward = Math.min(1.0, 0.3 + (score / 500) * 0.7);

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'vibe-match',
        score: score,
        level_reached: level,
        duration_seconds: duration,
        reward_earned: reward
      });

      await base44.auth.updateMe({
        soflo_coins: (currentUser.soflo_coins || 0) + reward
      });

      toast.success(`🎨 Perfect vibes! Earned ${reward.toFixed(2)} SFC`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative max-w-2xl w-full">
        <button onClick={onExit} className="absolute -top-12 right-0 p-2 bg-red-500 rounded-full hover:bg-red-600">
          <X className="w-6 h-6 text-white" />
        </button>

        {gameState === 'menu' && (
          <div className="text-center mb-6">
            <h2 className="text-5xl font-bold text-white mb-4">🎨 Vibe Match</h2>
            <p className="text-white mb-2">Watch the sequence, then repeat it</p>
            <p className="text-purple-200 mb-6">Each level adds one more vibe to remember</p>
            <Button onClick={startGame} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-6 text-lg">
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-3xl">
            <div className="text-center">
              <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-4xl font-bold text-white mb-2">Great Memory!</h3>
              <p className="text-gray-300 mb-2 text-2xl">Level: {level}</p>
              <p className="text-gray-400 mb-6 text-xl">Score: {score}</p>
              <Button onClick={startGame} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4">
                Play Again
              </Button>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="bg-black/30 backdrop-blur-sm p-8 rounded-3xl border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div className="text-white">
                <p className="text-sm text-gray-300">Level</p>
                <p className="text-3xl font-bold">{level}</p>
              </div>
              <div className="text-white text-center">
                <p className="text-sm text-gray-300">Score</p>
                <p className="text-3xl font-bold">{score}</p>
              </div>
              <div className="text-white">
                <p className="text-sm text-gray-300">Sequence</p>
                <p className="text-3xl font-bold">{sequence.length}</p>
              </div>
            </div>

            {isPlaying && (
              <div className="text-center mb-4">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white text-xl font-bold flex items-center justify-center gap-2"
                >
                  <Zap className="w-6 h-6 text-yellow-400" />
                  Watch the pattern...
                </motion.p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {vibes.map((vibe) => (
                <motion.button
                  key={vibe.id}
                  onClick={() => handleVibeClick(vibe.id)}
                  disabled={isPlaying}
                  animate={{
                    scale: activeVibe === vibe.id ? 1.1 : 1,
                    opacity: activeVibe === vibe.id ? 1 : (isPlaying ? 0.5 : 1)
                  }}
                  className={`h-32 rounded-2xl bg-gradient-to-br ${vibe.color} 
                    shadow-lg transform transition-all hover:scale-105 
                    disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2
                    ${activeVibe === vibe.id ? 'shadow-2xl ring-4 ring-white' : ''}`}
                >
                  <span className="text-white text-2xl font-bold capitalize">{vibe.name}</span>
                  <span className="text-white/80 text-sm">Click to match</span>
                </motion.button>
              ))}
            </div>

            {playerSequence.length > 0 && !isPlaying && (
              <div className="mt-6 text-center">
                <p className="text-white text-sm">
                  Progress: {playerSequence.length} / {sequence.length}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}