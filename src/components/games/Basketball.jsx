import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GameShop from "./GameShop";
import GameSettings from "./GameSettings";

export default function Basketball({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [time, setTime] = useState(60);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [equippedItems, setEquippedItems] = useState({});
  const [settings, setSettings] = useState({ soundEnabled: true, visualEffects: true });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const ballRef = useRef(null);
  const hoopRef = useRef({ x: 0, y: 0 });
  const gameLoopRef = useRef(null);
  const timerRef = useRef(null);

  const [canvasWidth, setCanvasWidth] = useState(600);
  const [canvasHeight, setCanvasHeight] = useState(800);

  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 50, 600);
      const maxHeight = Math.min(window.innerHeight - 200, 800);
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
        game_name: 'basketball',
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
      
      timerRef.current = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      gameLoopRef.current = setInterval(() => {
        updateGame();
        drawGame(ctx);
      }, 1000 / 60);

      return () => {
        clearInterval(gameLoopRef.current);
        clearInterval(timerRef.current);
      };
    }
  }, [gameState, equippedItems]);

  const playSound = (type) => {
    if (!settings.soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      switch(type) {
        case 'swish': oscillator.frequency.value = 800; gainNode.gain.value = 0.15; break;
        case 'bounce': oscillator.frequency.value = 300; gainNode.gain.value = 0.1; break;
        case 'miss': oscillator.frequency.value = 150; gainNode.gain.value = 0.12; break;
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  const resetBall = () => {
    ballRef.current = {
      x: canvasWidth / 2,
      y: canvasHeight - 80,
      vx: 0,
      vy: 0,
      radius: 20,
      isFlying: false
    };
  };

  const resetHoop = () => {
    hoopRef.current = {
      x: canvasWidth / 2 + (Math.random() - 0.5) * (canvasWidth * 0.4),
      y: 120,
      width: 80,
      height: 10
    };
  };

  const shoot = (power, angle) => {
    if (ballRef.current.isFlying) return;
    
    const powerMultiplier = equippedItems.boost?.effect_data?.speed_multiplier || 1;
    ballRef.current.vx = Math.cos(angle) * power * powerMultiplier;
    ballRef.current.vy = Math.sin(angle) * power * powerMultiplier;
    ballRef.current.isFlying = true;
    playSound('bounce');
  };

  const updateGame = () => {
    if (ballRef.current.isFlying) {
      ballRef.current.x += ballRef.current.vx;
      ballRef.current.y += ballRef.current.vy;
      ballRef.current.vy += 0.5; // Gravity

      // Check hoop collision
      if (ballRef.current.y - ballRef.current.radius < hoopRef.current.y + hoopRef.current.height &&
          ballRef.current.y + ballRef.current.radius > hoopRef.current.y &&
          ballRef.current.x > hoopRef.current.x - hoopRef.current.width / 2 &&
          ballRef.current.x < hoopRef.current.x + hoopRef.current.width / 2 &&
          ballRef.current.vy > 0) {
        
        const scoreMultiplier = equippedItems.boost?.effect_data?.score_multiplier || 1;
        const points = Math.floor((2 + streak) * scoreMultiplier);
        setScore(prev => prev + points);
        setStreak(prev => prev + 1);
        playSound('swish');
        toast.success(`+${points} points! 🏀 Streak: ${streak + 1}`);
        resetBall();
        resetHoop();
      }

      // Out of bounds
      if (ballRef.current.y > canvasHeight || ballRef.current.x < 0 || ballRef.current.x > canvasWidth) {
        setStreak(0);
        playSound('miss');
        resetBall();
        resetHoop();
      }
    }
  };

  const drawGame = (ctx) => {
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    bgGradient.addColorStop(0, '#1a0a3e');
    bgGradient.addColorStop(1, '#0f0528');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Court lines
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(canvasWidth / 2, canvasHeight - 200, 100, 0, Math.PI * 2);
    ctx.stroke();

    // Backboard
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(hoopRef.current.x - 50, hoopRef.current.y - 60, 100, 5);

    // Hoop
    ctx.strokeStyle = '#ff3300';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(hoopRef.current.x, hoopRef.current.y, hoopRef.current.width / 2, 0, Math.PI);
    ctx.stroke();

    // Net
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 7;
      const x = hoopRef.current.x + Math.cos(angle) * (hoopRef.current.width / 2);
      const y = hoopRef.current.y;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 30);
      ctx.stroke();
    }

    // Ball
    const ballColor = equippedItems.skin?.effect_data?.color || '#ff8800';
    ctx.shadowColor = ballColor;
    ctx.shadowBlur = 20;
    ctx.fillStyle = ballColor;
    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ball details
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ballRef.current.x - ballRef.current.radius, ballRef.current.y);
    ctx.lineTo(ballRef.current.x + ballRef.current.radius, ballRef.current.y);
    ctx.moveTo(ballRef.current.x, ballRef.current.y - ballRef.current.radius);
    ctx.lineTo(ballRef.current.x, ballRef.current.y + ballRef.current.radius);
    ctx.stroke();

    // Trajectory preview
    if (isDragging && !ballRef.current.isFlying) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ballRef.current.x, ballRef.current.y);
      ctx.lineTo(dragStart.x, dragStart.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const handleMouseDown = (e) => {
    if (!ballRef.current.isFlying) {
      setIsDragging(true);
      const rect = canvasRef.current.getBoundingClientRect();
      setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      const rect = canvasRef.current.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      
      const dx = ballRef.current.x - endX;
      const dy = ballRef.current.y - endY;
      const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 30, 12);
      const angle = Math.atan2(dy, dx);
      
      shoot(power, angle);
      setIsDragging(false);
    }
  };

  const startGame = () => {
    setScore(0);
    setStreak(0);
    setTime(60);
    resetBall();
    resetHoop();
    setGameState('playing');
  };

  const endGame = async () => {
    setGameState('gameover');

    if (!currentUser) return;

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'basketball',
        score: score,
        duration_seconds: 60,
        reward_earned: Math.floor(score / 10)
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-orange-950 via-red-950 to-orange-950 flex items-center justify-center p-4 overflow-auto">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(true)} className="p-3 bg-gray-700/80 backdrop-blur-sm rounded-full shadow-lg">
          <Settings className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowShop(true)} className="p-3 bg-purple-600/80 backdrop-blur-sm rounded-full shadow-lg">
          <ShoppingBag className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onExit} className="p-3 bg-red-500/80 backdrop-blur-sm rounded-full shadow-lg">
          <X className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl mb-6">🏀</motion.div>
            <motion.h2 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-7xl font-black text-white mb-4">BASKETBALL</motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-orange-200 text-xl mb-8">Drag and shoot to score!</motion.p>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }}>
              <Button onClick={startGame} className="bg-gradient-to-r from-orange-600 to-red-600 px-12 py-8 text-2xl shadow-2xl">
                <Play className="w-8 h-8 mr-3" />
                START GAME
              </Button>
            </motion.div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8" />
            <h3 className="text-6xl font-bold text-white mb-6">GAME OVER!</h3>
            <div className="bg-orange-600/30 rounded-3xl p-8 mb-8 border-2 border-orange-400/50">
              <p className="text-6xl font-black text-orange-400 mb-2">{score}</p>
              <p className="text-yellow-400 text-xl">Best Streak: {streak}</p>
            </div>
            <Button onClick={startGame} className="bg-gradient-to-r from-orange-600 to-red-600 px-10 py-7 text-xl">PLAY AGAIN</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {gameState === 'playing' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-full">
          <div className="bg-black/60 backdrop-blur-md rounded-3xl p-6 border-2 border-orange-500/40">
            <div className="flex justify-between items-center mb-4">
              <div className="text-white space-x-6">
                <span className="font-bold text-orange-400">Score: {score}</span>
                <span className="font-bold text-yellow-400">Time: {time}s</span>
                <span className="font-bold text-green-400">Streak: {streak}</span>
              </div>
            </div>

            <canvas 
              ref={canvasRef} 
              width={canvasWidth} 
              height={canvasHeight}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onTouchStart={(e) => {
                const rect = canvasRef.current.getBoundingClientRect();
                setIsDragging(true);
                setDragStart({ x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top });
              }}
              onTouchEnd={(e) => handleMouseUp({ clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY })}
              className="border-4 border-orange-500/50 rounded-xl shadow-2xl max-w-full cursor-crosshair" 
            />
          </div>
        </motion.div>
      )}

      {showShop && <GameShop currentUser={currentUser} gameName="basketball" onClose={() => { setShowShop(false); loadEquippedItems(); }} />}
      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} gameName="basketball" onSettingsChange={setSettings} />
    </div>
  );
}