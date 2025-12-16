import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Pause, RotateCcw, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SnakeGame({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // menu, playing, paused, gameover
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const gameLoopRef = useRef(null);
  const snakeRef = useRef([{ x: 10, y: 10 }]);
  const directionRef = useRef({ x: 1, y: 0 });
  const foodRef = useRef({ x: 15, y: 15 });
  const speedRef = useRef(150);
  const startTimeRef = useRef(null);

  const GRID_SIZE = 20;
  const CELL_SIZE = 20;

  useEffect(() => {
    loadHighScore();
  }, []);

  const loadHighScore = async () => {
    if (!currentUser) return;
    const scores = await base44.entities.GameScore.filter({
      user_email: currentUser.email,
      game_name: 'snake'
    });
    if (scores.length > 0) {
      setHighScore(Math.max(...scores.map(s => s.score)));
    }
  };

  useEffect(() => {
    if (gameState === 'playing') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const gameLoop = setInterval(() => {
        updateGame();
        drawGame(ctx);
      }, speedRef.current);

      gameLoopRef.current = gameLoop;
      return () => clearInterval(gameLoop);
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameState !== 'playing') return;
      
      switch(e.key) {
        case 'ArrowUp':
          if (directionRef.current.y === 0) directionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (directionRef.current.y === 0) directionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (directionRef.current.x === 0) directionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (directionRef.current.x === 0) directionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);

  const startGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }];
    directionRef.current = { x: 1, y: 0 };
    setScore(0);
    spawnFood();
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const spawnFood = () => {
    foodRef.current = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
  };

  const updateGame = () => {
    const head = { ...snakeRef.current[0] };
    head.x += directionRef.current.x;
    head.y += directionRef.current.y;

    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      endGame();
      return;
    }

    // Check self collision
    if (snakeRef.current.some(segment => segment.x === head.x && segment.y === head.y)) {
      endGame();
      return;
    }

    snakeRef.current.unshift(head);

    // Check food collision
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      setScore(prev => prev + 10);
      spawnFood();
      speedRef.current = Math.max(50, speedRef.current - 2);
    } else {
      snakeRef.current.pop();
    }
  };

  const drawGame = (ctx) => {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

    // Draw grid
    ctx.strokeStyle = '#1a1a1a';
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw snake
    snakeRef.current.forEach((segment, idx) => {
      ctx.fillStyle = idx === 0 ? '#a855f7' : '#8b5cf6';
      ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);
    });

    // Draw food
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(foodRef.current.x * CELL_SIZE, foodRef.current.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);
  };

  const endGame = async () => {
    setGameState('gameover');
    
    if (!currentUser) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    
    // Calculate reward based on score (0.1 - 0.5 SFC)
    const baseReward = 0.05;
    const scoreBonus = Math.min(0.45, (score / 1000) * 0.45);
    const reward = baseReward + scoreBonus;

    try {
      // Save score
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'snake',
        score: score,
        duration_seconds: duration,
        reward_earned: reward
      });

      // Award SoFloCoin
      await base44.auth.updateMe({
        soflo_coins: (currentUser.soflo_coins || 0) + reward
      });

      toast.success(`🎮 Game Over! Earned ${reward.toFixed(2)} SFC`);
      
      if (score > highScore) {
        setHighScore(score);
        toast.success(`🏆 New High Score: ${score}!`);
      }
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="relative"
      >
        <button
          onClick={onExit}
          className="absolute -top-12 right-0 p-2 bg-red-500 rounded-full hover:bg-red-600 transition"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {gameState === 'menu' && (
          <div className="text-center mb-6">
            <h2 className="text-4xl font-bold text-white mb-2">🐍 Classic Snake</h2>
            <p className="text-gray-400 mb-4">Use arrow keys to control</p>
            <p className="text-purple-400 font-bold mb-4">High Score: {highScore}</p>
            <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700 px-8 py-6 text-lg">
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-white mb-2">Game Over!</h3>
              <p className="text-gray-400 mb-4">Score: {score}</p>
              <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700">
                <RotateCcw className="w-5 h-5 mr-2" />
                Play Again
              </Button>
            </div>
          </div>
        )}

        <div className="bg-gray-900 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white font-bold text-xl">Score: {score}</div>
            {gameState === 'playing' && (
              <Button
                onClick={() => setGameState('paused')}
                variant="outline"
                size="sm"
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
          </div>
          <canvas
            ref={canvasRef}
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
            className="border-2 border-purple-500 rounded"
          />
        </div>
      </motion.div>
    </div>
  );
}