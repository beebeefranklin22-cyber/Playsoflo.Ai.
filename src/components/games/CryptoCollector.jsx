import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CryptoCollector({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const gameLoopRef = useRef(null);
  const playerRef = useRef({ x: 200, width: 60, height: 20 });
  const coinsRef = useRef([]);
  const bombsRef = useRef([]);
  const startTimeRef = useRef(null);

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 500;

  useEffect(() => {
    if (gameState === 'playing') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const gameLoop = setInterval(() => {
        updateGame();
        drawGame(ctx);
      }, 1000 / 60);

      gameLoopRef.current = gameLoop;
      return () => clearInterval(gameLoop);
    }
  }, [gameState, lives]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (gameState !== 'playing') return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      playerRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - playerRef.current.width, x - playerRef.current.width / 2));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [gameState]);

  const startGame = () => {
    setScore(0);
    setLives(3);
    coinsRef.current = [];
    bombsRef.current = [];
    playerRef.current.x = 200;
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const spawnCoin = () => {
    coinsRef.current.push({
      x: Math.random() * (CANVAS_WIDTH - 30),
      y: 0,
      width: 30,
      height: 30,
      speed: 2 + Math.random() * 2,
      type: Math.random() > 0.7 ? 'special' : 'normal' // 30% special coins worth more
    });
  };

  const spawnBomb = () => {
    bombsRef.current.push({
      x: Math.random() * (CANVAS_WIDTH - 30),
      y: 0,
      width: 30,
      height: 30,
      speed: 3 + Math.random()
    });
  };

  const updateGame = () => {
    const player = playerRef.current;

    // Spawn items
    if (Math.random() < 0.03) spawnCoin();
    if (Math.random() < 0.015) spawnBomb();

    // Update coins
    coinsRef.current = coinsRef.current.filter(coin => {
      coin.y += coin.speed;

      // Check collision with player
      if (coin.y + coin.height >= CANVAS_HEIGHT - 40 &&
          coin.y < CANVAS_HEIGHT &&
          coin.x + coin.width > player.x &&
          coin.x < player.x + player.width) {
        setScore(prev => prev + (coin.type === 'special' ? 20 : 10));
        return false;
      }

      return coin.y < CANVAS_HEIGHT;
    });

    // Update bombs
    bombsRef.current = bombsRef.current.filter(bomb => {
      bomb.y += bomb.speed;

      // Check collision with player
      if (bomb.y + bomb.height >= CANVAS_HEIGHT - 40 &&
          bomb.y < CANVAS_HEIGHT &&
          bomb.x + bomb.width > player.x &&
          bomb.x < player.x + player.width) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            endGame();
          }
          return newLives;
        });
        return false;
      }

      return bomb.y < CANVAS_HEIGHT;
    });
  };

  const drawGame = (ctx) => {
    // Clear canvas
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f1e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw player (basket)
    const player = playerRef.current;
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(player.x, CANVAS_HEIGHT - 40, player.width, player.height);
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(player.x, CANVAS_HEIGHT - 40, player.width, 5);

    // Draw coins
    coinsRef.current.forEach(coin => {
      if (coin.type === 'special') {
        ctx.fillStyle = '#fbbf24'; // Gold
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = '#eab308'; // Yellow
        ctx.shadowBlur = 5;
      }
      ctx.beginPath();
      ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw coin symbol
      ctx.fillStyle = '#000';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('$', coin.x + coin.width / 2, coin.y + coin.height / 2 + 6);
    });

    // Draw bombs
    bombsRef.current.forEach(bomb => {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(bomb.x + bomb.width / 2, bomb.y + bomb.height / 2, bomb.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw X
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bomb.x + 8, bomb.y + 8);
      ctx.lineTo(bomb.x + bomb.width - 8, bomb.y + bomb.height - 8);
      ctx.moveTo(bomb.x + bomb.width - 8, bomb.y + 8);
      ctx.lineTo(bomb.x + 8, bomb.y + bomb.height - 8);
      ctx.stroke();
    });
  };

  const endGame = async () => {
    setGameState('gameover');
    
    if (!currentUser) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'crypto-collector',
        score: score,
        duration_seconds: duration,
        reward_earned: 0
      });

      toast.success(`💰 Game Over! Final Score: ${score}`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative">
        <button onClick={onExit} className="absolute -top-12 right-0 p-2 bg-red-500 rounded-full hover:bg-red-600">
          <X className="w-6 h-6 text-white" />
        </button>

        {gameState === 'menu' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">💰 Crypto Collector</h2>
              <p className="text-gray-400 mb-2">Move mouse to control basket</p>
              <p className="text-yellow-400 mb-4">Collect coins • Avoid bombs</p>
              <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700 px-8 py-6 text-lg">
                <Play className="w-5 h-5 mr-2" />
                Start Game
              </Button>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-white mb-2">Collection Complete!</h3>
              <p className="text-gray-400 mb-4">Final Score: {score}</p>
              <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700">
                Play Again
              </Button>
            </div>
          </div>
        )}

        <div className="bg-gray-900 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white font-bold text-xl">Score: {score}</div>
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full ${
                    i < lives ? 'bg-red-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-purple-500 rounded cursor-none"
          />
        </div>
      </motion.div>
    </div>
  );
}