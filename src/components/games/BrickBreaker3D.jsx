import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GameShop from "./GameShop";

export default function BrickBreaker3D({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [showShop, setShowShop] = useState(false);
  const [equippedItems, setEquippedItems] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  
  const gameLoopRef = useRef(null);
  const paddleRef = useRef({ x: 250, y: 550, width: 100, height: 15 });
  const ballRef = useRef({ x: 300, y: 540, vx: 4, vy: -4, radius: 8 });
  const bricksRef = useRef([]);
  const particlesRef = useRef([]);
  const startTimeRef = useRef(null);
  const mouseXRef = useRef(300);

  const [canvasWidth, setCanvasWidth] = useState(600);
  const [canvasHeight, setCanvasHeight] = useState(600);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 100, 600);
      const maxHeight = Math.min(window.innerHeight - 300, 600);
      setCanvasWidth(maxWidth);
      setCanvasHeight(maxHeight);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadEquippedItems();
    }
  }, [currentUser]);

  const loadEquippedItems = async () => {
    try {
      const inventory = await base44.entities.UserInventory.filter({
        user_email: currentUser.email,
        game_name: 'brick-breaker',
        is_equipped: true
      });
      const items = {};
      inventory.forEach(item => {
        items[item.item_type] = item;
      });
      setEquippedItems(items);
    } catch (error) {
      console.error('Failed to load equipped items:', error);
    }
  };

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
  }, [gameState, equippedItems]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (gameState === 'playing' && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        mouseXRef.current = e.clientX - rect.left;
      }
    };

    const handleTouchMove = (e) => {
      if (gameState === 'playing' && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        mouseXRef.current = e.touches[0].clientX - rect.left;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gameState]);

  const createBricks = (lvl) => {
    bricksRef.current = [];
    const rows = 5 + lvl;
    const cols = 10;
    const brickWidth = 55;
    const brickHeight = 20;
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        bricksRef.current.push({
          x: col * brickWidth + 5,
          y: row * brickHeight + 50,
          width: brickWidth - 2,
          height: brickHeight - 2,
          color: colors[row % colors.length],
          hits: 1 + Math.floor(lvl / 2),
          maxHits: 1 + Math.floor(lvl / 2),
          depth: Math.random() * 20
        });
      }
    }
  };

  const startGame = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    paddleRef.current = { x: 250, y: 550, width: 100, height: 15 };
    ballRef.current = { x: 300, y: 540, vx: 4, vy: -4, radius: 8 };
    particlesRef.current = [];
    createBricks(1);
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const createParticles = (x, y, color) => {
    for (let i = 0; i < 15; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 30,
        color
      });
    }
  };

  const updateGame = () => {
    const ball = ballRef.current;
    const paddle = paddleRef.current;

    // Apply boost multiplier if equipped
    const speedBoost = equippedItems.boost?.effect_data?.speed_multiplier || 1;
    
    // Update paddle position
    paddle.x = Math.max(0, Math.min(canvasWidth - paddle.width, mouseXRef.current - paddle.width / 2));

    // Update ball
    ball.x += ball.vx * speedBoost;
    ball.y += ball.vy * speedBoost;

    // Wall collisions
    if (ball.x <= ball.radius || ball.x >= canvasWidth - ball.radius) {
      ball.vx *= -1;
    }
    if (ball.y <= ball.radius) {
      ball.vy *= -1;
    }

    // Paddle collision
    if (ball.y + ball.radius >= paddle.y &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.width &&
        ball.vy > 0) {
      ball.vy *= -1;
      const hitPos = (ball.x - paddle.x) / paddle.width;
      ball.vx = (hitPos - 0.5) * 10;
    }

    // Bottom collision (lose life)
    if (ball.y >= canvasHeight) {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          endGame();
        } else {
          ball.x = 300;
          ball.y = 540;
          ball.vx = 4;
          ball.vy = -4;
        }
        return newLives;
      });
    }

    // Brick collisions
    bricksRef.current = bricksRef.current.filter(brick => {
      if (ball.x + ball.radius >= brick.x &&
          ball.x - ball.radius <= brick.x + brick.width &&
          ball.y + ball.radius >= brick.y &&
          ball.y - ball.radius <= brick.y + brick.height) {
        
        brick.hits--;
        ball.vy *= -1;
        
        const scoreMultiplier = equippedItems.boost?.effect_data?.score_multiplier || 1;
        setScore(prev => prev + Math.floor(10 * scoreMultiplier));
        
        createParticles(ball.x, ball.y, brick.color);
        
        if (brick.hits <= 0) {
          return false;
        }
      }
      return true;
    });

    // Level complete
    if (bricksRef.current.length === 0) {
      setLevel(prev => {
        const newLevel = prev + 1;
        createBricks(newLevel);
        ball.x = 300;
        ball.y = 540;
        ball.vx = 4 + newLevel * 0.5;
        ball.vy = -4 - newLevel * 0.5;
        toast.success(`Level ${newLevel}! 🎯`);
        return newLevel;
      });
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
    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Apply equipped skin color to paddle
    const paddleColor = equippedItems.skin?.effect_data?.color || '#22d3ee';
    
    // Paddle with 3D effect
    ctx.shadowColor = paddleColor;
    ctx.shadowBlur = 15;
    const paddleGradient = ctx.createLinearGradient(
      paddleRef.current.x,
      paddleRef.current.y,
      paddleRef.current.x,
      paddleRef.current.y + paddleRef.current.height
    );
    paddleGradient.addColorStop(0, paddleColor);
    paddleGradient.addColorStop(1, paddleColor + '99');
    ctx.fillStyle = paddleGradient;
    ctx.fillRect(
      paddleRef.current.x,
      paddleRef.current.y,
      paddleRef.current.width,
      paddleRef.current.height
    );
    ctx.shadowBlur = 0;

    // Ball with trail
    const ballColor = equippedItems.trail?.effect_data?.color || '#fbbf24';
    ctx.shadowColor = ballColor;
    ctx.shadowBlur = 20;
    ctx.fillStyle = ballColor;
    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bricks with 3D depth
    bricksRef.current.forEach(brick => {
      ctx.save();
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 10;
      
      const alpha = brick.hits / brick.maxHits;
      ctx.fillStyle = brick.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      
      // 3D effect
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height / 3);
      
      ctx.restore();
    });

    // Particles
    particlesRef.current.forEach(p => {
      const alpha = p.life / 30;
      ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      ctx.fillRect(p.x, p.y, 4, 4);
    });
  };

  const endGame = async () => {
    setGameState('gameover');
    
    if (!currentUser) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'brick-breaker',
        score: score,
        duration_seconds: duration,
        reward_earned: Math.floor(score / 100)
      });

      toast.success(`🎮 Game Over! Score: ${score}`);
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
        <div className="absolute top-2 right-2 z-50 flex gap-2">
          <button
            onClick={() => setShowShop(true)}
            className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 transition shadow-lg"
          >
            <ShoppingBag className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={onExit}
            className="p-3 bg-red-500 rounded-full hover:bg-red-600 transition shadow-lg"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-lg rounded-2xl z-10"
            >
              <div className="text-center">
                <div className="text-7xl mb-4">🧱</div>
                <h2 className="text-5xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Brick Breaker 3D
                </h2>
                <p className="text-gray-300 mb-6">{isMobile ? 'Touch to move paddle' : 'Move mouse to control paddle'}</p>
                <Button onClick={startGame} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-10 py-7 text-xl shadow-2xl">
                  <Play className="w-6 h-6 mr-3" />
                  Start Game
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
                <h3 className="text-5xl font-bold text-white mb-4">Game Over!</h3>
                <div className="bg-purple-600/20 rounded-xl p-6 mb-6">
                  <p className="text-gray-300 text-lg mb-2">Final Score</p>
                  <p className="text-6xl font-bold text-purple-400">{score}</p>
                  <p className="text-yellow-400 mt-2">Level Reached: {level}</p>
                </div>
                <Button onClick={startGame} className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6 text-lg">
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
              <div className="text-white">
                <div className="text-sm text-gray-400">Level</div>
                <div className="font-bold text-2xl text-pink-400">{level}</div>
              </div>
              <div className="text-white">
                <div className="text-sm text-gray-400">Lives</div>
                <div className="font-bold text-2xl text-red-400">{"❤️".repeat(lives)}</div>
              </div>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="border-4 border-purple-500/50 rounded-xl shadow-2xl max-w-full h-auto"
          />
        </div>
      </motion.div>

      {showShop && (
        <GameShop
          currentUser={currentUser}
          gameName="brick-breaker"
          onClose={() => {
            setShowShop(false);
            loadEquippedItems();
          }}
        />
      )}
    </div>
  );
}