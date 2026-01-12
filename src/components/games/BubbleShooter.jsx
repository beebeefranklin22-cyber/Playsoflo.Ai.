import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GameShop from "./GameShop";

export default function BubbleShooter({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [shots, setShots] = useState(15);
  const [showShop, setShowShop] = useState(false);
  const [equippedItems, setEquippedItems] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  const gameLoopRef = useRef(null);
  const bubblesRef = useRef([]);
  const currentBubbleRef = useRef(null);
  const nextBubbleRef = useRef(null);
  const shootingRef = useRef(false);
  const angleRef = useRef(0);
  const startTimeRef = useRef(null);

  const [canvasWidth, setCanvasWidth] = useState(600);
  const [canvasHeight, setCanvasHeight] = useState(700);

  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 100, 600);
      const maxHeight = Math.min(window.innerHeight - 250, 700);
      setCanvasWidth(maxWidth);
      setCanvasHeight(maxHeight);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (currentUser) loadEquippedItems();
  }, [currentUser]);

  const loadEquippedItems = async () => {
    try {
      const inventory = await base44.entities.UserInventory.filter({
        user_email: currentUser.email,
        game_name: 'bubble-shooter',
        is_equipped: true
      });
      const items = {};
      inventory.forEach(item => items[item.item_type] = item);
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
      if (gameState === 'playing' && canvasRef.current && !shootingRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const shooterX = canvasWidth / 2;
        const shooterY = canvasHeight - 50;
        angleRef.current = Math.atan2(y - shooterY, x - shooterX);
      }
    };

    const handleClick = () => {
      if (gameState === 'playing' && !shootingRef.current && shots > 0) {
        shoot();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [gameState, shots]);

  const createBubbles = (lvl) => {
    bubblesRef.current = [];
    const rows = 5 + Math.floor(lvl / 2);
    const cols = 12;
    const radius = 20;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (Math.random() > 0.3) {
          bubblesRef.current.push({
            x: col * (radius * 2) + (row % 2 === 0 ? 0 : radius) + radius,
            y: row * (radius * 1.8) + radius,
            radius: radius,
            color: colors[Math.floor(Math.random() * colors.length)],
            row,
            col
          });
        }
      }
    }
    
    currentBubbleRef.current = createRandomBubble();
    nextBubbleRef.current = createRandomBubble();
  };

  const createRandomBubble = () => {
    return {
      x: canvasWidth / 2,
      y: canvasHeight - 50,
      vx: 0,
      vy: 0,
      radius: 20,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  };

  const shoot = () => {
    if (shootingRef.current || !currentBubbleRef.current) return;
    
    shootingRef.current = true;
    const speed = 10;
    currentBubbleRef.current.vx = Math.cos(angleRef.current) * speed;
    currentBubbleRef.current.vy = Math.sin(angleRef.current) * speed;
    
    setShots(prev => prev - 1);
  };

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setShots(15);
    shootingRef.current = false;
    angleRef.current = -Math.PI / 2;
    createBubbles(1);
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const updateGame = () => {
    if (shootingRef.current && currentBubbleRef.current) {
      currentBubbleRef.current.x += currentBubbleRef.current.vx;
      currentBubbleRef.current.y += currentBubbleRef.current.vy;

      // Wall collision
      if (currentBubbleRef.current.x <= currentBubbleRef.current.radius || 
          currentBubbleRef.current.x >= canvasWidth - currentBubbleRef.current.radius) {
        currentBubbleRef.current.vx *= -1;
      }

      // Top collision
      if (currentBubbleRef.current.y <= currentBubbleRef.current.radius) {
        snapBubbleToGrid();
      }

      // Bubble collision
      bubblesRef.current.forEach(bubble => {
        const dx = bubble.x - currentBubbleRef.current.x;
        const dy = bubble.y - currentBubbleRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < bubble.radius + currentBubbleRef.current.radius) {
          snapBubbleToGrid();
        }
      });
    }
  };

  const snapBubbleToGrid = () => {
    if (!currentBubbleRef.current) return;
    
    const bubble = currentBubbleRef.current;
    const row = Math.floor(bubble.y / (bubble.radius * 1.8));
    const col = Math.floor((bubble.x - (row % 2 === 0 ? 0 : bubble.radius)) / (bubble.radius * 2));
    
    bubblesRef.current.push({
      x: col * (bubble.radius * 2) + (row % 2 === 0 ? 0 : bubble.radius) + bubble.radius,
      y: row * (bubble.radius * 1.8) + bubble.radius,
      radius: bubble.radius,
      color: bubble.color,
      row,
      col
    });

    checkMatches(bubblesRef.current.length - 1);
    
    currentBubbleRef.current = nextBubbleRef.current;
    currentBubbleRef.current.x = canvasWidth / 2;
    currentBubbleRef.current.y = canvasHeight - 50;
    currentBubbleRef.current.vx = 0;
    currentBubbleRef.current.vy = 0;
    nextBubbleRef.current = createRandomBubble();
    shootingRef.current = false;

    // Check win/lose
    if (bubblesRef.current.length === 0) {
      setLevel(prev => {
        const newLevel = prev + 1;
        createBubbles(newLevel);
        setShots(15);
        toast.success(`Level ${newLevel}! 🎯`);
        return newLevel;
      });
    }

    if (shots <= 0 && bubblesRef.current.length > 0) {
      endGame();
    }
  };

  const checkMatches = (index) => {
    const matches = [];
    const checked = new Set();
    const toCheck = [index];
    const targetColor = bubblesRef.current[index].color;

    while (toCheck.length > 0) {
      const i = toCheck.pop();
      if (checked.has(i)) continue;
      checked.add(i);
      
      const bubble = bubblesRef.current[i];
      if (bubble.color === targetColor) {
        matches.push(i);
        
        // Check neighbors
        bubblesRef.current.forEach((b, idx) => {
          if (!checked.has(idx)) {
            const dx = b.x - bubble.x;
            const dy = b.y - bubble.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bubble.radius * 2.5) {
              toCheck.push(idx);
            }
          }
        });
      }
    }

    if (matches.length >= 3) {
      const scoreMultiplier = equippedItems.boost?.effect_data?.score_multiplier || 1;
      setScore(prev => prev + Math.floor(matches.length * 10 * scoreMultiplier));
      bubblesRef.current = bubblesRef.current.filter((_, i) => !matches.includes(i));
    }
  };

  const drawGame = (ctx) => {
    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#1a0a3e');
    gradient.addColorStop(1, '#0f0528');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Bubbles
    bubblesRef.current.forEach(bubble => {
      ctx.shadowColor = bubble.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = bubble.color;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Current bubble
    if (currentBubbleRef.current) {
      const bubbleColor = equippedItems.trail?.effect_data?.color || currentBubbleRef.current.color;
      ctx.shadowColor = bubbleColor;
      ctx.shadowBlur = 20;
      ctx.fillStyle = bubbleColor;
      ctx.beginPath();
      ctx.arc(currentBubbleRef.current.x, currentBubbleRef.current.y, currentBubbleRef.current.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Aim line
      if (!shootingRef.current) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(currentBubbleRef.current.x, currentBubbleRef.current.y);
        ctx.lineTo(
          currentBubbleRef.current.x + Math.cos(angleRef.current) * 200,
          currentBubbleRef.current.y + Math.sin(angleRef.current) * 200
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Next bubble preview
    if (nextBubbleRef.current) {
      ctx.shadowColor = nextBubbleRef.current.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = nextBubbleRef.current.color;
      ctx.beginPath();
      ctx.arc(50, canvasHeight - 50, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  const endGame = async () => {
    setGameState('gameover');

    if (!currentUser) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'bubble-shooter',
        score: score,
        duration_seconds: duration,
        reward_earned: Math.floor(score / 100)
      });
      toast.success(`🫧 Game Over!`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-950 via-pink-950 to-purple-950 flex items-center justify-center p-4 overflow-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative max-w-full"
      >
        <div className="absolute top-2 right-2 z-50 flex gap-2">
          <button onClick={() => setShowShop(true)} className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 transition">
            <ShoppingBag className="w-6 h-6 text-white" />
          </button>
          <button onClick={onExit} className="p-3 bg-red-500 rounded-full hover:bg-red-600 transition">
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
                <div className="text-7xl mb-4">🫧</div>
                <h2 className="text-5xl font-bold text-white mb-3">Bubble Shooter</h2>
                <p className="text-gray-300 mb-6">{isMobile ? 'Tap to shoot' : 'Click to shoot bubbles'}</p>
                <Button onClick={startGame} className="bg-gradient-to-r from-purple-600 to-pink-600 px-10 py-7 text-xl">
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
                  <p className="text-6xl font-bold text-purple-400">{score}</p>
                  <p className="text-yellow-400 mt-2">Level: {level}</p>
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
                <div className="text-sm text-gray-400">Shots Left</div>
                <div className="font-bold text-2xl text-pink-400">{shots}</div>
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
          gameName="bubble-shooter"
          onClose={() => {
            setShowShop(false);
            loadEquippedItems();
          }}
        />
      )}
    </div>
  );
}