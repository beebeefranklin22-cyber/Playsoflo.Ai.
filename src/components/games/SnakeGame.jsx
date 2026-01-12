import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Pause, RotateCcw, Trophy, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SnakeGame({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const gameLoopRef = useRef(null);
  const snakeRef = useRef([{ x: 10, y: 10 }]);
  const directionRef = useRef({ x: 1, y: 0 });
  const nextDirectionRef = useRef({ x: 1, y: 0 });
  const foodRef = useRef({ x: 15, y: 15 });
  const specialFoodRef = useRef(null);
  const speedRef = useRef(120);
  const startTimeRef = useRef(null);
  const particlesRef = useRef([]);

  const [gridSize, setGridSize] = useState(24);
  const [cellSize, setCellSize] = useState(24);

  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 100, 600);
      const maxHeight = Math.min(window.innerHeight - 300, 600);
      const size = Math.min(maxWidth, maxHeight);
      const newCellSize = Math.floor(size / 24);
      setCellSize(newCellSize);
      setGridSize(24);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    loadHighScore();
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const loadHighScore = async () => {
    if (!currentUser) return;
    try {
      const scores = await base44.entities.GameScore.filter({
        user_email: currentUser.email,
        game_name: 'snake'
      });
      if (scores.length > 0) {
        setHighScore(Math.max(...scores.map(s => s.score)));
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (gameState === 'playing') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const gameLoop = setInterval(() => {
        directionRef.current = nextDirectionRef.current;
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
      e.preventDefault();
      
      const current = directionRef.current;
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (current.y === 0) nextDirectionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (current.y === 0) nextDirectionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (current.x === 0) nextDirectionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (current.x === 0) nextDirectionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);

  const startGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }];
    directionRef.current = { x: 1, y: 0 };
    nextDirectionRef.current = { x: 1, y: 0 };
    setScore(0);
    setCombo(0);
    speedRef.current = 120;
    particlesRef.current = [];
    spawnFood();
    spawnSpecialFood();
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const spawnFood = () => {
    let newPos;
    do {
      newPos = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize)
      };
    } while (snakeRef.current.some(s => s.x === newPos.x && s.y === newPos.y));
    foodRef.current = newPos;
  };

  const spawnSpecialFood = () => {
    if (Math.random() < 0.3) {
      let newPos;
      do {
        newPos = {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize),
          timer: 50
        };
      } while (snakeRef.current.some(s => s.x === newPos.x && s.y === newPos.y));
      specialFoodRef.current = newPos;
    }
  };

  const createParticles = (x, y, color) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x: x * cellSize + cellSize / 2,
        y: y * cellSize + cellSize / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 20,
        color
      });
    }
  };

  const updateGame = () => {
    const head = { ...snakeRef.current[0] };
    head.x += directionRef.current.x;
    head.y += directionRef.current.y;

    // Wrap around walls
    if (head.x < 0) head.x = gridSize - 1;
    if (head.x >= gridSize) head.x = 0;
    if (head.y < 0) head.y = gridSize - 1;
    if (head.y >= gridSize) head.y = 0;

    // Check self collision
    if (snakeRef.current.some(segment => segment.x === head.x && segment.y === head.y)) {
      endGame();
      return;
    }

    snakeRef.current.unshift(head);

    // Check regular food
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      const comboPoints = 10 + (combo * 2);
      setScore(prev => prev + comboPoints);
      setCombo(prev => prev + 1);
      createParticles(head.x, head.y, '#10b981');
      spawnFood();
      speedRef.current = Math.max(40, speedRef.current - 1);
      if (Math.random() < 0.4) spawnSpecialFood();
    } else {
      snakeRef.current.pop();
    }

    // Check special food
    if (specialFoodRef.current && 
        head.x === specialFoodRef.current.x && 
        head.y === specialFoodRef.current.y) {
      setScore(prev => prev + 50);
      setCombo(prev => prev + 5);
      createParticles(head.x, head.y, '#fbbf24');
      specialFoodRef.current = null;
      toast.success('⚡ Bonus +50!');
    }

    // Update special food timer
    if (specialFoodRef.current) {
      specialFoodRef.current.timer--;
      if (specialFoodRef.current.timer <= 0) {
        specialFoodRef.current = null;
      }
    }

    // Update particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      return p.life > 0;
    });
  };

  const drawGame = (ctx) => {
    // Modern gradient background
    const gradient = ctx.createLinearGradient(0, 0, gridSize * cellSize, gridSize * cellSize);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gridSize * cellSize, gridSize * cellSize);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, gridSize * cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(gridSize * cellSize, i * cellSize);
      ctx.stroke();
    }

    // Draw snake with gradient and glow
    snakeRef.current.forEach((segment, idx) => {
      const alpha = 1 - (idx / snakeRef.current.length) * 0.3;
      
      // Glow effect
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 15;
      
      const gradient = ctx.createRadialGradient(
        segment.x * cellSize + cellSize/2, 
        segment.y * cellSize + cellSize/2, 
        0,
        segment.x * cellSize + cellSize/2, 
        segment.y * cellSize + cellSize/2, 
        cellSize
      );
      
      if (idx === 0) {
        gradient.addColorStop(0, '#c084fc');
        gradient.addColorStop(1, '#a855f7');
      } else {
        gradient.addColorStop(0, `rgba(168, 85, 247, ${alpha})`);
        gradient.addColorStop(1, `rgba(139, 92, 246, ${alpha})`);
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(
        segment.x * cellSize + 2, 
        segment.y * cellSize + 2, 
        cellSize - 4, 
        cellSize - 4
      );
      
      ctx.shadowBlur = 0;
    });

    // Draw regular food with glow
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 20;
    const foodGradient = ctx.createRadialGradient(
      foodRef.current.x * cellSize + cellSize/2,
      foodRef.current.y * cellSize + cellSize/2,
      0,
      foodRef.current.x * cellSize + cellSize/2,
      foodRef.current.y * cellSize + cellSize/2,
      cellSize
    );
    foodGradient.addColorStop(0, '#34d399');
    foodGradient.addColorStop(1, '#10b981');
    ctx.fillStyle = foodGradient;
    ctx.fillRect(
      foodRef.current.x * cellSize + 3, 
      foodRef.current.y * cellSize + 3, 
      cellSize - 6, 
      cellSize - 6
    );
    ctx.shadowBlur = 0;

    // Draw special food with pulsing effect
    if (specialFoodRef.current) {
      const pulse = Math.sin(Date.now() / 100) * 3;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 25;
      const specialGradient = ctx.createRadialGradient(
        specialFoodRef.current.x * cellSize + cellSize/2,
        specialFoodRef.current.y * cellSize + cellSize/2,
        0,
        specialFoodRef.current.x * cellSize + cellSize/2,
        specialFoodRef.current.y * cellSize + cellSize/2,
        cellSize
      );
      specialGradient.addColorStop(0, '#fde047');
      specialGradient.addColorStop(1, '#fbbf24');
      ctx.fillStyle = specialGradient;
      ctx.fillRect(
        specialFoodRef.current.x * cellSize + 3 - pulse, 
        specialFoodRef.current.y * cellSize + 3 - pulse, 
        cellSize - 6 + pulse * 2, 
        cellSize - 6 + pulse * 2
      );
      ctx.shadowBlur = 0;
    }

    // Draw particles
    particlesRef.current.forEach(p => {
      const alpha = p.life / 20;
      ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
  };

  const endGame = async () => {
    setGameState('gameover');
    
    if (!currentUser) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'snake',
        score: score,
        duration_seconds: duration,
        reward_earned: 0
      });

      if (score > highScore) {
        setHighScore(score);
        toast.success(`🏆 New High Score: ${score}!`);
      }
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center p-4 overflow-auto">
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
                <div className="text-7xl mb-4 animate-bounce">🐍</div>
                <h2 className="text-5xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Neon Snake
                </h2>
                <p className="text-gray-300 mb-2">{isMobile ? 'Tap buttons to move' : 'Arrow Keys or WASD'}</p>
                <p className="text-purple-400 font-bold text-xl mb-6">High Score: {highScore}</p>
                <Button onClick={startGame} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-10 py-7 text-xl shadow-2xl">
                  <Play className="w-6 h-6 mr-3" />
                  Start Game
                </Button>
              </div>
            </motion.div>
          )}

          {gameState === 'paused' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl"
            >
              <div className="text-center">
                <Pause className="w-20 h-20 text-purple-400 mx-auto mb-4" />
                <h3 className="text-4xl font-bold text-white mb-6">Paused</h3>
                <Button onClick={() => setGameState('playing')} className="bg-purple-600 hover:bg-purple-700 px-8 py-6 text-lg">
                  <Play className="w-5 h-5 mr-2" />
                  Resume
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
                <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6 animate-pulse" />
                <h3 className="text-5xl font-bold text-white mb-4">Game Over!</h3>
                <div className="bg-purple-600/20 rounded-xl p-6 mb-6">
                  <p className="text-gray-300 text-lg mb-2">Final Score</p>
                  <p className="text-6xl font-bold text-purple-400">{score}</p>
                  {combo > 5 && (
                    <p className="text-yellow-400 mt-2">🔥 Max Combo: {combo}x</p>
                  )}
                </div>
                <Button onClick={startGame} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-6 text-lg">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Play Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-3xl shadow-2xl border border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-6">
              <div className="text-white">
                <div className="text-sm text-gray-400">Score</div>
                <div className="font-bold text-2xl text-purple-400">{score}</div>
              </div>
              {combo > 1 && (
                <div className="text-white">
                  <div className="text-sm text-gray-400">Combo</div>
                  <div className="font-bold text-2xl text-yellow-400 flex items-center gap-1">
                    <Zap className="w-5 h-5" />{combo}x
                  </div>
                </div>
              )}
            </div>
            {gameState === 'playing' && (
              <Button
                onClick={() => setGameState('paused')}
                variant="outline"
                size="sm"
                className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
          </div>
          <canvas
            ref={canvasRef}
            width={gridSize * cellSize}
            height={gridSize * cellSize}
            className="border-4 border-purple-500/50 rounded-xl shadow-2xl max-w-full h-auto"
          />
          
          {/* Mobile Controls */}
          {isMobile && gameState === 'playing' && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div />
              <Button
                onTouchStart={() => nextDirectionRef.current = { x: 0, y: -1 }}
                className="bg-purple-600 hover:bg-purple-700 h-16 text-2xl"
              >
                ↑
              </Button>
              <div />
              <Button
                onTouchStart={() => nextDirectionRef.current = { x: -1, y: 0 }}
                className="bg-purple-600 hover:bg-purple-700 h-16 text-2xl"
              >
                ←
              </Button>
              <Button
                onTouchStart={() => nextDirectionRef.current = { x: 0, y: 1 }}
                className="bg-purple-600 hover:bg-purple-700 h-16 text-2xl"
              >
                ↓
              </Button>
              <Button
                onTouchStart={() => nextDirectionRef.current = { x: 1, y: 0 }}
                className="bg-purple-600 hover:bg-purple-700 h-16 text-2xl"
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