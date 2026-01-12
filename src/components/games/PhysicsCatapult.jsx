import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GameShop from "./GameShop";
import GameSettings from "./GameSettings";

export default function PhysicsCatapult({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [shots, setShots] = useState(5);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [equippedItems, setEquippedItems] = useState({});
  const [settings, setSettings] = useState({ soundEnabled: true, visualEffects: true });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const projectileRef = useRef(null);
  const targetsRef = useRef([]);
  const particlesRef = useRef([]);
  const gameLoopRef = useRef(null);

  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);

  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 50, 800);
      const maxHeight = Math.min(window.innerHeight - 250, 600);
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
        game_name: 'physics-catapult',
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
      
      gameLoopRef.current = setInterval(() => {
        updateGame();
        drawGame(ctx);
      }, 1000 / 60);

      return () => clearInterval(gameLoopRef.current);
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
        case 'launch': oscillator.frequency.value = 300; gainNode.gain.value = 0.15; break;
        case 'hit': oscillator.frequency.value = 150; gainNode.gain.value = 0.2; break;
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  const createTargets = (lvl) => {
    targetsRef.current = [];
    const startX = canvasWidth * 0.6;
    
    for (let i = 0; i < 3 + lvl; i++) {
      targetsRef.current.push({
        x: startX + (i % 3) * 80,
        y: canvasHeight - 100 - Math.floor(i / 3) * 80,
        width: 40,
        height: 40,
        hit: false,
        color: '#00ff00'
      });
    }
  };

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setShots(5);
    projectileRef.current = null;
    particlesRef.current = [];
    createTargets(1);
    setGameState('playing');
  };

  const shoot = (power, angle) => {
    if (shots <= 0 || projectileRef.current) return;
    
    const powerMultiplier = equippedItems.boost?.effect_data?.speed_multiplier || 1;
    projectileRef.current = {
      x: 100,
      y: canvasHeight - 50,
      vx: Math.cos(angle) * power * powerMultiplier,
      vy: Math.sin(angle) * power * powerMultiplier,
      radius: 12
    };
    
    setShots(prev => prev - 1);
    playSound('launch');
  };

  const updateGame = () => {
    if (projectileRef.current) {
      projectileRef.current.x += projectileRef.current.vx;
      projectileRef.current.y += projectileRef.current.vy;
      projectileRef.current.vy += 0.3; // Gravity
      
      // Check collisions
      targetsRef.current.forEach(target => {
        if (!target.hit &&
            projectileRef.current.x > target.x && projectileRef.current.x < target.x + target.width &&
            projectileRef.current.y > target.y && projectileRef.current.y < target.y + target.height) {
          target.hit = true;
          const scoreMultiplier = equippedItems.boost?.effect_data?.score_multiplier || 1;
          setScore(prev => prev + Math.floor(100 * scoreMultiplier));
          
          // Particles
          for (let i = 0; i < 20; i++) {
            particlesRef.current.push({
              x: target.x + target.width / 2,
              y: target.y + target.height / 2,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 30,
              color: target.color
            });
          }
          
          playSound('hit');
          projectileRef.current = null;
        }
      });
      
      // Out of bounds
      if (projectileRef.current && (projectileRef.current.y > canvasHeight || projectileRef.current.x > canvasWidth)) {
        projectileRef.current = null;
      }
    }

    // Update particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life--;
      return p.life > 0;
    });

    // Check level complete
    if (targetsRef.current.every(t => t.hit)) {
      setLevel(prev => {
        const newLevel = prev + 1;
        createTargets(newLevel);
        setShots(5);
        toast.success(`Level ${newLevel}! 🎯`);
        return newLevel;
      });
    }

    // Check game over
    if (shots === 0 && !projectileRef.current && !targetsRef.current.every(t => t.hit)) {
      endGame();
    }
  };

  const drawGame = (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#1a0a3e');
    gradient.addColorStop(1, '#0f0528');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Ground
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, canvasHeight - 30, canvasWidth, 30);

    // Catapult
    const catapultColor = equippedItems.skin?.effect_data?.color || '#8b4513';
    ctx.fillStyle = catapultColor;
    ctx.fillRect(80, canvasHeight - 80, 40, 50);
    ctx.fillRect(70, canvasHeight - 30, 60, 10);

    // Targets
    targetsRef.current.forEach(target => {
      if (!target.hit) {
        ctx.fillStyle = target.color;
        ctx.fillRect(target.x, target.y, target.width, target.height);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(target.x, target.y, target.width, target.height);
      }
    });

    // Projectile
    if (projectileRef.current) {
      const projColor = equippedItems.trail?.effect_data?.color || '#ff0000';
      ctx.shadowColor = projColor;
      ctx.shadowBlur = 20;
      ctx.fillStyle = projColor;
      ctx.beginPath();
      ctx.arc(projectileRef.current.x, projectileRef.current.y, projectileRef.current.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color + Math.floor((p.life / 30) * 255).toString(16).padStart(2, '0');
      ctx.fillRect(p.x, p.y, 4, 4);
    });

    // Trajectory preview
    if (isDragging && !projectileRef.current) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(100, canvasHeight - 50);
      ctx.lineTo(dragStart.x, dragStart.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const handleMouseDown = (e) => {
    if (shots > 0 && !projectileRef.current) {
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
      
      const dx = 100 - endX;
      const dy = (canvasHeight - 50) - endY;
      const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 20, 15);
      const angle = Math.atan2(dy, dx);
      
      shoot(power, angle);
      setIsDragging(false);
    }
  };

  const endGame = async () => {
    setGameState('gameover');

    if (!currentUser) return;

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'physics-catapult',
        score: score,
        duration_seconds: level * 20,
        reward_earned: Math.floor(score / 50)
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
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl mb-6">🎯</motion.div>
            <motion.h2 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-7xl font-black text-white mb-4">PHYSICS CATAPULT</motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-orange-200 text-xl mb-8">Drag and launch to destroy targets!</motion.p>
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
            <h3 className="text-6xl font-bold text-white mb-6">GAME COMPLETE!</h3>
            <div className="bg-orange-600/30 rounded-3xl p-8 mb-8 border-2 border-orange-400/50">
              <p className="text-6xl font-black text-orange-400 mb-2">{score}</p>
              <p className="text-yellow-400 text-xl">Level Reached: {level}</p>
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
                <span className="font-bold text-cyan-400">Level: {level}</span>
                <span className="font-bold text-yellow-400">Shots: {shots}</span>
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

      {showShop && <GameShop currentUser={currentUser} gameName="physics-catapult" onClose={() => { setShowShop(false); loadEquippedItems(); }} />}
      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} gameName="physics-catapult" onSettingsChange={setSettings} />
    </div>
  );
}