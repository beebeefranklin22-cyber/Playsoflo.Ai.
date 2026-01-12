import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag, Settings, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GameShop from "./GameShop";
import GameSettings from "./GameSettings";

export default function HiddenObjects({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [foundObjects, setFoundObjects] = useState([]);
  const [targetObjects, setTargetObjects] = useState([]);
  const [objects, setObjects] = useState([]);
  const [time, setTime] = useState(60);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [equippedItems, setEquippedItems] = useState({});
  const [settings, setSettings] = useState({ soundEnabled: true, visualEffects: true });

  const timerRef = useRef(null);
  const objectsRef = useRef([]);

  const [canvasWidth, setCanvasWidth] = useState(900);
  const [canvasHeight, setCanvasHeight] = useState(600);

  const emojis = ['🌟', '🎨', '🎭', '🎪', '🎸', '🎹', '🎺', '🎻', '🏆', '👑', '💎', '🔮', '🎯', '🎲', '🧩', '🎮', '🕹️', '🎰', '🃏', '🎴'];

  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 50, 900);
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
        game_name: 'hidden-objects',
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
      timerRef.current = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      drawScene(ctx);

      return () => clearInterval(timerRef.current);
    }
  }, [gameState, objects]);

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
        case 'found': oscillator.frequency.value = 700; gainNode.gain.value = 0.15; break;
        case 'complete': oscillator.frequency.value = 1000; gainNode.gain.value = 0.2; break;
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  const generateLevel = (lvl) => {
    const newObjects = [];
    const objectCount = 15 + lvl * 3;
    
    for (let i = 0; i < objectCount; i++) {
      newObjects.push({
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: 30 + Math.random() * (canvasWidth - 60),
        y: 30 + Math.random() * (canvasHeight - 60),
        size: 24 + Math.random() * 12,
        rotation: Math.random() * Math.PI * 2
      });
    }
    
    objectsRef.current = newObjects;
    setObjects(newObjects);
    
    const uniqueEmojis = [...new Set(newObjects.map(o => o.emoji))];
    const toFind = uniqueEmojis.slice(0, Math.min(5 + lvl, uniqueEmojis.length)).sort();
    setTargetObjects(toFind);
    setFoundObjects([]);
  };

  const drawScene = (ctx) => {
    const bgColor = equippedItems.environment?.effect_data?.color || '#1a1a2e';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw pattern background
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 15; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(i * 45, j * 40, 40, 35);
        }
      }
    }

    // Draw objects
    objects.forEach(obj => {
      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.rotation);
      ctx.font = `${obj.size}px Arial`;
      ctx.fillText(obj.emoji, -obj.size / 2, obj.size / 2);
      ctx.restore();
    });
  };

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clicked = objects.find(obj => 
      x > obj.x - obj.size / 2 && x < obj.x + obj.size / 2 &&
      y > obj.y - obj.size / 2 && y < obj.y + obj.size / 2
    );

    if (clicked && targetObjects.includes(clicked.emoji) && !foundObjects.includes(clicked.emoji)) {
      setFoundObjects(prev => [...prev, clicked.emoji]);
      const scoreMultiplier = equippedItems.boost?.effect_data?.score_multiplier || 1;
      setScore(prev => prev + Math.floor(100 * scoreMultiplier));
      playSound('found');
      
      if (foundObjects.length + 1 === targetObjects.length) {
        playSound('complete');
        setTimeout(() => {
          setLevel(prev => prev + 1);
          generateLevel(level + 1);
          setTime(60);
          toast.success(`Level ${level + 1}! 🎯`);
        }, 500);
      }
    }
  };

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setTime(60);
    generateLevel(1);
    setGameState('playing');
  };

  const endGame = async () => {
    setGameState('gameover');

    if (!currentUser) return;

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'hidden-objects',
        score: score,
        duration_seconds: (60 - time),
        reward_earned: Math.floor(score / 50)
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-teal-950 via-cyan-950 to-teal-950 flex items-center justify-center p-4 overflow-auto">
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
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl mb-6">🔍</motion.div>
            <motion.h2 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-7xl font-black text-white mb-4">HIDDEN OBJECTS</motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-teal-200 text-xl mb-8">Find all the hidden items before time runs out!</motion.p>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }}>
              <Button onClick={startGame} className="bg-gradient-to-r from-teal-600 to-cyan-600 px-12 py-8 text-2xl shadow-2xl">
                <Play className="w-8 h-8 mr-3" />
                START SEARCH
              </Button>
            </motion.div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8" />
            <h3 className="text-6xl font-bold text-white mb-6">SEARCH COMPLETE!</h3>
            <div className="bg-teal-600/30 rounded-3xl p-8 mb-8 border-2 border-teal-400/50">
              <p className="text-6xl font-black text-teal-400 mb-2">{score}</p>
              <p className="text-yellow-400 text-xl">Level: {level}</p>
            </div>
            <Button onClick={startGame} className="bg-gradient-to-r from-teal-600 to-cyan-600 px-10 py-7 text-xl">SEARCH AGAIN</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {gameState === 'playing' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-full">
          <div className="bg-black/60 backdrop-blur-md rounded-3xl p-6 border-2 border-teal-500/40">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              <div className="text-white space-x-6">
                <span className="font-bold text-teal-400">Score: {score}</span>
                <span className="font-bold text-yellow-400">Time: {time}s</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {targetObjects.map((emoji, idx) => (
                  <div key={idx} className={`text-2xl px-3 py-2 rounded-lg ${foundObjects.includes(emoji) ? 'bg-green-600' : 'bg-gray-700'}`}>
                    {emoji}
                  </div>
                ))}
              </div>
            </div>

            <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} onClick={handleCanvasClick} className="border-4 border-teal-500/50 rounded-xl shadow-2xl max-w-full cursor-pointer" />
          </div>
        </motion.div>
      )}

      {showShop && <GameShop currentUser={currentUser} gameName="hidden-objects" onClose={() => { setShowShop(false); loadEquippedItems(); }} />}
      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} gameName="hidden-objects" onSettingsChange={setSettings} />
    </div>
  );
}