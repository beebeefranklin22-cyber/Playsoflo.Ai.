import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GameShop from "./GameShop";
import GameSettings from "./GameSettings";

export default function TowerDefense({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [gold, setGold] = useState(200);
  const [lives, setLives] = useState(10);
  const [wave, setWave] = useState(1);
  const [selectedTower, setSelectedTower] = useState(null);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [equippedItems, setEquippedItems] = useState({});
  const [settings, setSettings] = useState({ soundEnabled: true, visualEffects: true });

  const towersRef = useRef([]);
  const enemiesRef = useRef([]);
  const projectilesRef = useRef([]);
  const gameLoopRef = useRef(null);
  const waveTimerRef = useRef(0);

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
        game_name: 'tower-defense',
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
        case 'shoot': oscillator.frequency.value = 400; gainNode.gain.value = 0.08; break;
        case 'hit': oscillator.frequency.value = 200; gainNode.gain.value = 0.12; break;
        case 'build': oscillator.frequency.value = 600; gainNode.gain.value = 0.1; break;
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.06);
    } catch (e) {}
  };

  const spawnEnemy = () => {
    const health = wave * 10;
    enemiesRef.current.push({
      x: 0,
      y: canvasHeight / 2,
      health,
      maxHealth: health,
      speed: 0.5 + wave * 0.1,
      reward: 10 + wave * 2
    });
  };

  const updateGame = () => {
    waveTimerRef.current++;
    
    if (waveTimerRef.current % 120 === 0 && enemiesRef.current.length < wave * 5) {
      spawnEnemy();
    }

    // Move enemies
    enemiesRef.current.forEach((enemy, idx) => {
      enemy.x += enemy.speed;
      
      if (enemy.x >= canvasWidth) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) endGame();
          return newLives;
        });
        enemiesRef.current.splice(idx, 1);
      }
    });

    // Towers shoot
    towersRef.current.forEach(tower => {
      tower.cooldown = (tower.cooldown || 0) - 1;
      
      if (tower.cooldown <= 0) {
        const target = enemiesRef.current.find(e => {
          const dist = Math.sqrt((e.x - tower.x) ** 2 + (e.y - tower.y) ** 2);
          return dist < tower.range;
        });
        
        if (target) {
          const damageMultiplier = equippedItems.boost?.effect_data?.score_multiplier || 1;
          projectilesRef.current.push({
            x: tower.x,
            y: tower.y,
            targetX: target.x,
            targetY: target.y,
            damage: tower.damage * damageMultiplier,
            speed: 8,
            color: tower.color
          });
          tower.cooldown = tower.fireRate;
          playSound('shoot');
        }
      }
    });

    // Move projectiles
    projectilesRef.current.forEach((proj, idx) => {
      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < proj.speed) {
        const enemy = enemiesRef.current.find(e => Math.abs(e.x - proj.targetX) < 20 && Math.abs(e.y - proj.targetY) < 20);
        if (enemy) {
          enemy.health -= proj.damage;
          playSound('hit');
          if (enemy.health <= 0) {
            setGold(prev => prev + enemy.reward);
            setScore(prev => prev + enemy.reward);
            enemiesRef.current = enemiesRef.current.filter(e => e !== enemy);
          }
        }
        projectilesRef.current.splice(idx, 1);
      } else {
        proj.x += (dx / dist) * proj.speed;
        proj.y += (dy / dist) * proj.speed;
      }
    });

    // Check wave complete
    if (waveTimerRef.current > 600 && enemiesRef.current.length === 0) {
      setWave(prev => prev + 1);
      waveTimerRef.current = 0;
      setGold(prev => prev + 50);
      toast.success(`Wave ${wave + 1}! 🎯`);
    }
  };

  const drawGame = (ctx) => {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Path
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 60;
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight / 2);
    ctx.lineTo(canvasWidth, canvasHeight / 2);
    ctx.stroke();

    // Towers
    towersRef.current.forEach(tower => {
      ctx.shadowColor = tower.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = tower.color;
      ctx.fillRect(tower.x - 15, tower.y - 15, 30, 30);
      ctx.shadowBlur = 0;
      
      // Range indicator if selected
      if (selectedTower === tower) {
        ctx.strokeStyle = tower.color + '40';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Enemies
    enemiesRef.current.forEach(enemy => {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(enemy.x - 12, enemy.y - 12, 24, 24);
      
      // Health bar
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(enemy.x - 12, enemy.y - 20, 24, 4);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(enemy.x - 12, enemy.y - 20, 24 * (enemy.health / enemy.maxHealth), 4);
    });

    // Projectiles
    projectilesRef.current.forEach(proj => {
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const placeTower = (type) => {
    const towerTypes = {
      basic: { cost: 50, damage: 10, range: 100, fireRate: 60, color: '#00ffff' },
      strong: { cost: 100, damage: 25, range: 120, fireRate: 90, color: '#ff00ff' },
      fast: { cost: 75, damage: 8, range: 80, fireRate: 30, color: '#ffff00' }
    };
    
    const tower = towerTypes[type];
    if (gold < tower.cost) {
      toast.error('Not enough gold!');
      return;
    }
    
    setGold(prev => prev - tower.cost);
    towersRef.current.push({
      x: 150 + towersRef.current.length * 100,
      y: canvasHeight / 2 - 100,
      ...tower
    });
    playSound('build');
  };

  const startGame = () => {
    setScore(0);
    setGold(200);
    setLives(10);
    setWave(1);
    towersRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    waveTimerRef.current = 0;
    setGameState('playing');
  };

  const endGame = async () => {
    setGameState('gameover');

    if (!currentUser) return;

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'tower-defense',
        score: score,
        duration_seconds: wave * 30,
        reward_earned: Math.floor(score / 10)
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center p-4 overflow-auto">
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

      {gameState === 'menu' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl mb-6">🗼</motion.div>
          <motion.h2 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-7xl font-black text-white mb-4">TOWER DEFENSE</motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-purple-200 text-xl mb-8">Build towers to stop the invasion!</motion.p>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }}>
            <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-purple-600 px-12 py-8 text-2xl shadow-2xl">
              <Play className="w-8 h-8 mr-3" />
              START DEFENSE
            </Button>
          </motion.div>
        </motion.div>
      )}

      {gameState === 'gameover' && (
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8" />
          <h3 className="text-6xl font-bold text-white mb-6">DEFENSE COMPLETE!</h3>
          <div className="bg-purple-600/30 rounded-3xl p-8 mb-8 border-2 border-purple-400/50">
            <p className="text-6xl font-black text-purple-400 mb-2">{score}</p>
            <p className="text-yellow-400 text-xl">Waves Survived: {wave}</p>
          </div>
          <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-purple-600 px-10 py-7 text-xl">DEFEND AGAIN</Button>
        </motion.div>
      )}

      {gameState === 'playing' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-full">
          <div className="bg-black/60 backdrop-blur-md rounded-3xl p-6 border-2 border-purple-500/40">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              <div className="text-white space-x-6">
                <span className="font-bold text-yellow-400">Gold: {gold}</span>
                <span className="font-bold text-red-400">Lives: {lives}</span>
                <span className="font-bold text-cyan-400">Wave: {wave}</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => placeTower('basic')} size="sm" className="bg-cyan-600">Basic ($50)</Button>
                <Button onClick={() => placeTower('strong')} size="sm" className="bg-purple-600">Strong ($100)</Button>
                <Button onClick={() => placeTower('fast')} size="sm" className="bg-yellow-600">Fast ($75)</Button>
              </div>
            </div>

            <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} onClick={(e) => {
              const rect = canvasRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const tower = towersRef.current.find(t => Math.abs(t.x - x) < 15 && Math.abs(t.y - y) < 15);
              setSelectedTower(tower || null);
            }} className="border-4 border-purple-500/50 rounded-xl shadow-2xl max-w-full" />
          </div>
        </motion.div>
      )}

      {showShop && <GameShop currentUser={currentUser} gameName="tower-defense" onClose={() => { setShowShop(false); loadEquippedItems(); }} />}
      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} gameName="tower-defense" onSettingsChange={setSettings} />
    </div>
  );
}