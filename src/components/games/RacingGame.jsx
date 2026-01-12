import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function RacingGame({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [isMobile, setIsMobile] = useState(false);
  const gameLoopRef = useRef(null);
  const playerRef = useRef({ x: 180, y: 450, width: 40, height: 70 });
  const carsRef = useRef([]);
  const roadLinesRef = useRef([]);
  const distanceRef = useRef(0);
  const startTimeRef = useRef(null);
  const keysRef = useRef({});

  const [canvasWidth, setCanvasWidth] = useState(400);
  const [canvasHeight, setCanvasHeight] = useState(600);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 100, 400);
      const maxHeight = Math.min(window.innerHeight - 250, 600);
      setCanvasWidth(maxWidth);
      setCanvasHeight(maxHeight);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Initialize road lines
      for (let i = 0; i < 10; i++) {
        roadLinesRef.current.push({ x: canvasWidth / 2 - 2, y: i * 60, height: 40 });
      }

      const gameLoop = setInterval(() => {
        updateGame();
        drawGame(ctx);
      }, 1000 / 60);

      gameLoopRef.current = gameLoop;
      return () => clearInterval(gameLoop);
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState === 'playing') {
        keysRef.current[e.key] = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const startGame = () => {
    setScore(0);
    setSpeed(5);
    distanceRef.current = 0;
    playerRef.current = { x: 180, y: 450, width: 40, height: 70 };
    carsRef.current = [];
    roadLinesRef.current = [];
    keysRef.current = {};
    
    for (let i = 0; i < 10; i++) {
      roadLinesRef.current.push({ x: canvasWidth / 2 - 2, y: i * 60, height: 40 });
    }
    
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const updateGame = () => {
    const player = playerRef.current;
    const currentSpeed = speed + Math.floor(score / 100) * 0.5;

    // Player movement
    if (keysRef.current['ArrowLeft'] || keysRef.current['a']) {
      player.x = Math.max(50, player.x - 6);
    }
    if (keysRef.current['ArrowRight'] || keysRef.current['d']) {
      player.x = Math.min(canvasWidth - 90, player.x + 6);
    }

    // Update road lines
    roadLinesRef.current.forEach(line => {
      line.y += currentSpeed;
      if (line.y > canvasHeight) {
        line.y = -40;
      }
    });

    // Spawn cars
    if (Math.random() < 0.02) {
      const lanes = [80, 180, 280];
      carsRef.current.push({
        x: lanes[Math.floor(Math.random() * lanes.length)] - 20,
        y: -100,
        width: 40,
        height: 70,
        color: ['#ef4444', '#10b981', '#fbbf24', '#3b82f6'][Math.floor(Math.random() * 4)]
      });
    }

    // Update cars and check collisions
    carsRef.current = carsRef.current.filter(car => {
      car.y += currentSpeed;

      // Check collision
      if (car.x < player.x + player.width &&
          car.x + car.width > player.x &&
          car.y < player.y + player.height &&
          car.y + car.height > player.y) {
        endGame();
        return false;
      }

      // Remove off-screen cars and add score
      if (car.y > canvasHeight) {
        setScore(prev => prev + 10);
        distanceRef.current += 10;
        return false;
      }

      return true;
    });
  };

  const drawGame = (ctx) => {
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#1e3a8a');
    skyGradient.addColorStop(1, '#7c3aed');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Road
    const roadWidth = canvasWidth * 0.75;
    const roadStart = (canvasWidth - roadWidth) / 2;
    ctx.fillStyle = '#374151';
    ctx.fillRect(roadStart, 0, roadWidth, canvasHeight);

    // Road edges
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(roadStart, 0, 8, canvasHeight);
    ctx.fillRect(roadStart + roadWidth - 8, 0, 8, canvasHeight);

    // Road lines
    ctx.fillStyle = '#ffffff';
    roadLinesRef.current.forEach(line => {
      ctx.fillRect(line.x, line.y, 4, line.height);
    });

    // Other cars
    carsRef.current.forEach(car => {
      ctx.shadowColor = car.color;
      ctx.shadowBlur = 15;
      
      // Car body
      ctx.fillStyle = car.color;
      ctx.fillRect(car.x, car.y, car.width, car.height);
      
      // Windows
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(car.x + 5, car.y + 10, car.width - 10, 20);
      ctx.fillRect(car.x + 5, car.y + 40, car.width - 10, 20);
      
      ctx.shadowBlur = 0;
    });

    // Player car
    const player = playerRef.current;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 20;
    
    // Car body
    const gradient = ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.height);
    gradient.addColorStop(0, '#22d3ee');
    gradient.addColorStop(1, '#06b6d4');
    ctx.fillStyle = gradient;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Windows
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(player.x + 5, player.y + 10, player.width - 10, 20);
    ctx.fillRect(player.x + 5, player.y + 40, player.width - 10, 20);
    
    // Wheels glow
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(player.x, player.y + player.height - 8, 8, 8);
    ctx.fillRect(player.x + player.width - 8, player.y + player.height - 8, 8, 8);
    
    ctx.shadowBlur = 0;
  };

  const endGame = async () => {
    setGameState('gameover');
    
    if (!currentUser) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'racing',
        score: score,
        duration_seconds: duration,
        reward_earned: 0
      });

      toast.success(`🏁 Race Complete!`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-blue-950 via-purple-950 to-pink-950 flex items-center justify-center p-4 overflow-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative max-w-full"
      >
        <button
          onClick={onExit}
          className="absolute top-2 right-2 z-50 p-3 bg-red-500 rounded-full hover:bg-red-600 transition shadow-lg"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-lg rounded-2xl z-10"
            >
              <div className="text-center">
                <div className="text-7xl mb-4">🏎️</div>
                <h2 className="text-5xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-pink-600">
                  Neon Racer
                </h2>
                <p className="text-gray-300 mb-6">{isMobile ? 'Tap to steer' : 'Arrow Keys or A-D to Steer'}</p>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-700 hover:to-pink-700 px-10 py-7 text-xl shadow-2xl">
                  <Play className="w-6 h-6 mr-3" />
                  Start Race
                </Button>
              </div>
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-10 rounded-2xl"
            >
              <div className="text-center">
                <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
                <h3 className="text-5xl font-bold text-white mb-4">Race Over!</h3>
                <div className="bg-cyan-600/20 rounded-xl p-6 mb-6">
                  <p className="text-gray-300 text-lg mb-2">Final Score</p>
                  <p className="text-6xl font-bold text-cyan-400">{score}</p>
                  <p className="text-yellow-400 mt-2">Distance: {distanceRef.current}m</p>
                </div>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-pink-600 px-8 py-6 text-lg">
                  Race Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-3xl shadow-2xl border border-cyan-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white">
              <div className="text-sm text-gray-400">Score</div>
              <div className="font-bold text-2xl text-cyan-400">{score}</div>
            </div>
            <div className="text-white">
              <div className="text-sm text-gray-400">Distance</div>
              <div className="font-bold text-2xl text-yellow-400">{distanceRef.current}m</div>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="border-4 border-cyan-500/50 rounded-xl shadow-2xl max-w-full h-auto"
          />
          
          {/* Mobile Controls */}
          {isMobile && gameState === 'playing' && (
            <div className="mt-4 flex gap-4 justify-center">
              <Button
                onTouchStart={() => keysRef.current['ArrowLeft'] = true}
                onTouchEnd={() => keysRef.current['ArrowLeft'] = false}
                className="bg-cyan-600 hover:bg-cyan-700 h-20 px-12 text-3xl"
              >
                ←
              </Button>
              <Button
                onTouchStart={() => keysRef.current['ArrowRight'] = true}
                onTouchEnd={() => keysRef.current['ArrowRight'] = false}
                className="bg-cyan-600 hover:bg-cyan-700 h-20 px-12 text-3xl"
              >
                →
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}