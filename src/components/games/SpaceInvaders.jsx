import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SpaceInvaders({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const gameLoopRef = useRef(null);
  const playerRef = useRef({ x: 280, y: 520, width: 40, height: 30 });
  const bulletsRef = useRef([]);
  const aliensRef = useRef([]);
  const alienBulletsRef = useRef([]);
  const particlesRef = useRef([]);
  const startTimeRef = useRef(null);

  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 600;

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
  }, [gameState]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameState !== 'playing') return;
      const player = playerRef.current;
      
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        player.x = Math.max(0, player.x - 15);
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        player.x = Math.min(CANVAS_WIDTH - player.width, player.x + 15);
      }
      if (e.key === ' ' && bulletsRef.current.length < 3) {
        bulletsRef.current.push({
          x: player.x + player.width / 2 - 2,
          y: player.y,
          width: 4,
          height: 15,
          speed: 10
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);

  const startGame = () => {
    setScore(0);
    setLives(3);
    setWave(1);
    playerRef.current = { x: 280, y: 520, width: 40, height: 30 };
    bulletsRef.current = [];
    alienBulletsRef.current = [];
    particlesRef.current = [];
    spawnAliens(1);
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const spawnAliens = (waveNum) => {
    aliensRef.current = [];
    const rows = 3 + Math.floor(waveNum / 2);
    const cols = 8;
    const spacing = 60;
    const startX = 80;
    const startY = 50;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        aliensRef.current.push({
          x: startX + col * spacing,
          y: startY + row * spacing,
          width: 35,
          height: 35,
          speed: 1 + waveNum * 0.2,
          direction: 1,
          type: row % 3
        });
      }
    }
  };

  const createExplosion = (x, y, color) => {
    for (let i = 0; i < 20; i++) {
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
    // Update bullets
    bulletsRef.current = bulletsRef.current.filter(bullet => {
      bullet.y -= bullet.speed;
      return bullet.y > 0;
    });

    // Update alien bullets
    alienBulletsRef.current = alienBulletsRef.current.filter(bullet => {
      bullet.y += bullet.speed;
      
      // Check player hit
      const player = playerRef.current;
      if (bullet.x > player.x && bullet.x < player.x + player.width &&
          bullet.y > player.y && bullet.y < player.y + player.height) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) endGame();
          return newLives;
        });
        createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ef4444');
        return false;
      }
      
      return bullet.y < CANVAS_HEIGHT;
    });

    // Update aliens
    let moveDown = false;
    aliensRef.current.forEach(alien => {
      alien.x += alien.speed * alien.direction;
      if (alien.x <= 0 || alien.x + alien.width >= CANVAS_WIDTH) {
        moveDown = true;
      }

      // Random shooting
      if (Math.random() < 0.001) {
        alienBulletsRef.current.push({
          x: alien.x + alien.width / 2,
          y: alien.y + alien.height,
          speed: 5
        });
      }
    });

    if (moveDown) {
      aliensRef.current.forEach(alien => {
        alien.direction *= -1;
        alien.y += 20;
      });
    }

    // Check bullet collisions
    bulletsRef.current = bulletsRef.current.filter(bullet => {
      let hit = false;
      aliensRef.current = aliensRef.current.filter(alien => {
        if (bullet.x > alien.x && bullet.x < alien.x + alien.width &&
            bullet.y > alien.y && bullet.y < alien.y + alien.height) {
          setScore(prev => prev + (10 + alien.type * 5));
          createExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, '#10b981');
          hit = true;
          return false;
        }
        return true;
      });
      return !hit;
    });

    // Check wave complete
    if (aliensRef.current.length === 0) {
      setWave(prev => {
        const newWave = prev + 1;
        spawnAliens(newWave);
        toast.success(`Wave ${newWave}! 🚀`);
        return newWave;
      });
    }

    // Update particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      return p.life > 0;
    });

    // Check game over (aliens reached bottom)
    if (aliensRef.current.some(a => a.y + a.height > 500)) {
      endGame();
    }
  };

  const drawGame = (ctx) => {
    // Space background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a0118');
    gradient.addColorStop(1, '#1a0533');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137) % CANVAS_WIDTH;
      const y = (i * 197) % CANVAS_HEIGHT;
      ctx.fillRect(x, y, 2, 2);
    }

    // Player ship
    const player = playerRef.current;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Player bullets
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 10;
    bulletsRef.current.forEach(bullet => {
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    ctx.shadowBlur = 0;

    // Aliens
    aliensRef.current.forEach(alien => {
      const colors = ['#10b981', '#f59e0b', '#ef4444'];
      ctx.shadowColor = colors[alien.type];
      ctx.shadowBlur = 15;
      ctx.fillStyle = colors[alien.type];
      ctx.fillRect(alien.x, alien.y, alien.width, alien.height);
      
      // Eyes
      ctx.fillStyle = '#000000';
      ctx.fillRect(alien.x + 8, alien.y + 10, 6, 6);
      ctx.fillRect(alien.x + 21, alien.y + 10, 6, 6);
    });
    ctx.shadowBlur = 0;

    // Alien bullets
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    alienBulletsRef.current.forEach(bullet => {
      ctx.fillRect(bullet.x, bullet.y, 4, 12);
    });
    ctx.shadowBlur = 0;

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
        game_name: 'space-invaders',
        score: score,
        duration_seconds: duration,
        reward_earned: 0
      });

      toast.success(`🎮 Game Over! Score: ${score}`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-purple-950 via-blue-950 to-black flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <button
          onClick={onExit}
          className="absolute -top-14 right-0 p-3 bg-red-500 rounded-full hover:bg-red-600 transition shadow-lg"
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
                <div className="text-7xl mb-4">👾</div>
                <h2 className="text-5xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
                  Space Invaders
                </h2>
                <p className="text-gray-300 mb-2">Arrow Keys / A-D to Move</p>
                <p className="text-cyan-400 mb-6">Space to Shoot</p>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 px-10 py-7 text-xl shadow-2xl">
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
                <h3 className="text-5xl font-bold text-white mb-4">Mission Complete!</h3>
                <div className="bg-cyan-600/20 rounded-xl p-6 mb-6">
                  <p className="text-gray-300 text-lg mb-2">Final Score</p>
                  <p className="text-6xl font-bold text-cyan-400">{score}</p>
                  <p className="text-yellow-400 mt-2">Waves Cleared: {wave - 1}</p>
                </div>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-6 text-lg">
                  Play Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-3xl shadow-2xl border border-cyan-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-6">
              <div className="text-white">
                <div className="text-sm text-gray-400">Score</div>
                <div className="font-bold text-2xl text-cyan-400">{score}</div>
              </div>
              <div className="text-white">
                <div className="text-sm text-gray-400">Wave</div>
                <div className="font-bold text-2xl text-yellow-400">{wave}</div>
              </div>
            </div>
            <div className="flex gap-2">
              {[...Array(lives)].map((_, i) => (
                <Heart key={i} className="w-6 h-6 text-red-500 fill-red-500" />
              ))}
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-4 border-cyan-500/50 rounded-xl shadow-2xl bg-black"
          />
        </div>
      </motion.div>
    </div>
  );
}