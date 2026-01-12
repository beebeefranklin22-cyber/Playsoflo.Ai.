import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag, Settings, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import * as THREE from "three";
import GameShop from "./GameShop";
import GameSettings from "./GameSettings";

export default function SkyRunner3D({ currentUser, onExit }) {
  const mountRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [equippedItems, setEquippedItems] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState({ soundEnabled: true, visualEffects: true, controlSensitivity: 5 });

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const playerRef = useRef(null);
  const platformsRef = useRef([]);
  const coinsObjRef = useRef([]);
  const obstaclesRef = useRef([]);
  const playerVelocityRef = useRef({ x: 0, y: 0, z: 0 });
  const isJumpingRef = useRef(false);
  const keysRef = useRef({});
  const worldZRef = useRef(0);
  const startTimeRef = useRef(null);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (currentUser) loadEquippedItems();
  }, [currentUser]);

  const loadEquippedItems = async () => {
    try {
      const inventory = await base44.entities.UserInventory.filter({
        user_email: currentUser.email,
        game_name: 'sky-runner',
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
    if (gameState === 'playing' && mountRef.current) {
      initThreeJS();
      return () => cleanupThreeJS();
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
        case 'jump': oscillator.frequency.value = 400; gainNode.gain.value = 0.2; break;
        case 'coin': oscillator.frequency.value = 800; gainNode.gain.value = 0.15; break;
        case 'hit': oscillator.frequency.value = 150; gainNode.gain.value = 0.3; break;
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  const createPlayer = () => {
    const group = new THREE.Group();
    const playerColor = equippedItems.skin?.effect_data?.color || '#00ffff';
    const colorNum = parseInt(playerColor.replace('#', ''), 16);
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: colorNum, 
      metalness: 0.6, 
      roughness: 0.3,
      emissive: colorNum,
      emissiveIntensity: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.y = 2;
    head.castShadow = true;
    group.add(head);
    
    // Trail effect
    if (settings.visualEffects && equippedItems.trail) {
      const trailColor = equippedItems.trail.effect_data?.color || '#ff00ff';
      const trailGeometry = new THREE.ConeGeometry(0.3, 2, 8);
      const trailMaterial = new THREE.MeshBasicMaterial({ 
        color: parseInt(trailColor.replace('#', ''), 16),
        transparent: true,
        opacity: 0.6
      });
      const trail = new THREE.Mesh(trailGeometry, trailMaterial);
      trail.position.set(0, 0.5, 0.5);
      trail.rotation.x = Math.PI;
      group.add(trail);
    }
    
    return group;
  };

  const createPlatform = (x, y, z, width = 4, depth = 4) => {
    const geometry = new THREE.BoxGeometry(width, 0.5, depth);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x4a5568,
      metalness: 0.3,
      roughness: 0.7
    });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, y, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    return platform;
  };

  const createCoin = (x, y, z) => {
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xffd700,
      emissiveIntensity: 0.5
    });
    const coin = new THREE.Mesh(geometry, material);
    coin.position.set(x, y, z);
    coin.rotation.x = Math.PI / 2;
    coin.userData.isCoin = true;
    return coin;
  };

  const createObstacle = (x, y, z) => {
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      metalness: 0.5,
      emissive: 0xff0000,
      emissiveIntensity: 0.3
    });
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set(x, y, z);
    obstacle.castShadow = true;
    obstacle.userData.isObstacle = true;
    return obstacle;
  };

  const generateLevel = (startZ) => {
    const platforms = [];
    const coins = [];
    const obstacles = [];
    
    for (let i = 0; i < 15; i++) {
      const z = startZ - i * 8;
      const x = (Math.random() - 0.5) * 10;
      const y = Math.random() * 3;
      const width = 3 + Math.random() * 3;
      
      const platform = createPlatform(x, y, z, width, 4);
      platforms.push(platform);
      sceneRef.current.add(platform);
      
      // Add coins
      if (Math.random() > 0.4) {
        const coin = createCoin(x, y + 1, z);
        coins.push(coin);
        sceneRef.current.add(coin);
      }
      
      // Add obstacles
      if (Math.random() > 0.7) {
        const obstacle = createObstacle(x + (Math.random() - 0.5) * 2, y + 1, z);
        obstacles.push(obstacle);
        sceneRef.current.add(obstacle);
      }
    }
    
    platformsRef.current.push(...platforms);
    coinsObjRef.current.push(...coins);
    obstaclesRef.current.push(...obstacles);
  };

  const initThreeJS = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 10, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(20, 30, 20);
    sun.castShadow = true;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    scene.add(sun);

    // Starting platform
    const startPlatform = createPlatform(0, 0, 0, 6, 6);
    platformsRef.current.push(startPlatform);
    scene.add(startPlatform);

    // Player
    const player = createPlayer();
    player.position.set(0, 2, 0);
    scene.add(player);
    playerRef.current = player;

    // Generate initial level
    generateLevel(-10);

    handleControls();
    animate();
  };

  const handleControls = () => {
    const handleKeyDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && !isJumpingRef.current) {
        isJumpingRef.current = true;
        playerVelocityRef.current.y = 0.4;
        playSound('jump');
      }
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  };

  const jump = () => {
    if (!isJumpingRef.current) {
      isJumpingRef.current = true;
      playerVelocityRef.current.y = 0.4;
      playSound('jump');
    }
  };

  const animate = () => {
    if (gameState !== 'playing' || !sceneRef.current) return;

    const sensitivity = settings.controlSensitivity / 5;
    
    // Movement
    if (keysRef.current['a'] || keysRef.current['arrowleft']) {
      playerVelocityRef.current.x = Math.max(-0.3 * sensitivity, playerVelocityRef.current.x - 0.02);
    } else if (keysRef.current['d'] || keysRef.current['arrowright']) {
      playerVelocityRef.current.x = Math.min(0.3 * sensitivity, playerVelocityRef.current.x + 0.02);
    } else {
      playerVelocityRef.current.x *= 0.9;
    }

    // Gravity
    playerVelocityRef.current.y -= 0.02;
    
    // Auto forward movement
    const speedBoost = equippedItems.boost?.effect_data?.speed_multiplier || 1;
    playerVelocityRef.current.z = -0.3 * speedBoost;

    // Update player position
    if (playerRef.current) {
      playerRef.current.position.x += playerVelocityRef.current.x;
      playerRef.current.position.y += playerVelocityRef.current.y;
      playerRef.current.position.z += playerVelocityRef.current.z;

      // Rotate player based on movement
      if (Math.abs(playerVelocityRef.current.x) > 0.01) {
        playerRef.current.rotation.z = -playerVelocityRef.current.x * 0.5;
      }
    }

    worldZRef.current = playerRef.current.position.z;

    // Platform collision
    let onPlatform = false;
    platformsRef.current.forEach(platform => {
      const px = playerRef.current.position.x;
      const py = playerRef.current.position.y;
      const pz = playerRef.current.position.z;
      
      const platX = platform.position.x;
      const platY = platform.position.y;
      const platZ = platform.position.z;
      const platWidth = platform.geometry.parameters.width / 2;
      const platDepth = platform.geometry.parameters.depth / 2;
      
      if (px > platX - platWidth && px < platX + platWidth &&
          pz > platZ - platDepth && pz < platZ + platDepth &&
          py > platY && py < platY + 1 &&
          playerVelocityRef.current.y <= 0) {
        playerRef.current.position.y = platY + 0.25;
        playerVelocityRef.current.y = 0;
        isJumpingRef.current = false;
        onPlatform = true;
      }
    });

    // Coin collection
    coinsObjRef.current.forEach((coin, idx) => {
      coin.rotation.y += 0.05;
      
      const dist = playerRef.current.position.distanceTo(coin.position);
      if (dist < 1) {
        sceneRef.current.remove(coin);
        coinsObjRef.current.splice(idx, 1);
        const scoreMultiplier = equippedItems.boost?.effect_data?.score_multiplier || 1;
        setCoins(prev => prev + 1);
        setScore(prev => prev + Math.floor(10 * scoreMultiplier));
        playSound('coin');
      }
    });

    // Obstacle collision
    obstaclesRef.current.forEach(obstacle => {
      const dist = playerRef.current.position.distanceTo(obstacle.position);
      if (dist < 1.5) {
        playSound('hit');
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            endGame();
          } else {
            // Reset position
            playerRef.current.position.set(0, 5, playerRef.current.position.z - 5);
            playerVelocityRef.current = { x: 0, y: 0, z: 0 };
          }
          return newLives;
        });
        sceneRef.current.remove(obstacle);
        obstaclesRef.current = obstaclesRef.current.filter(o => o !== obstacle);
      }
    });

    // Clean up old platforms
    platformsRef.current = platformsRef.current.filter(platform => {
      if (platform.position.z > playerRef.current.position.z + 50) {
        sceneRef.current.remove(platform);
        return false;
      }
      return true;
    });

    // Generate new platforms
    if (platformsRef.current.length < 20) {
      const lastZ = Math.min(...platformsRef.current.map(p => p.position.z));
      generateLevel(lastZ - 10);
    }

    // Fall off
    if (playerRef.current.position.y < -10) {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          endGame();
        } else {
          playerRef.current.position.set(0, 5, playerRef.current.position.z);
          playerVelocityRef.current = { x: 0, y: 0, z: 0 };
        }
        return newLives;
      });
    }

    // Camera follow
    if (cameraRef.current && playerRef.current) {
      cameraRef.current.position.x = playerRef.current.position.x;
      cameraRef.current.position.y = playerRef.current.position.y + 8;
      cameraRef.current.position.z = playerRef.current.position.z + 12;
      cameraRef.current.lookAt(playerRef.current.position);
    }

    setScore(prev => prev + 1);

    if (rendererRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const cleanupThreeJS = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (rendererRef.current && mountRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
      mountRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }
    platformsRef.current = [];
    coinsObjRef.current = [];
    obstaclesRef.current = [];
  };

  const startGame = () => {
    setScore(0);
    setCoins(0);
    setLives(3);
    worldZRef.current = 0;
    playerVelocityRef.current = { x: 0, y: 0, z: 0 };
    isJumpingRef.current = false;
    keysRef.current = {};
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const endGame = async () => {
    setGameState('gameover');

    if (!currentUser) return;

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'sky-runner',
        score: score,
        duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        reward_earned: coins
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-sky-400 to-blue-600">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(true)} className="p-3 bg-gray-700/80 backdrop-blur-sm rounded-full hover:bg-gray-600 transition shadow-lg">
          <Settings className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowShop(true)} className="p-3 bg-purple-600/80 backdrop-blur-sm rounded-full hover:bg-purple-700 transition shadow-lg">
          <ShoppingBag className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onExit} className="p-3 bg-red-500/80 backdrop-blur-sm rounded-full hover:bg-red-600 transition shadow-lg">
          <X className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-500/30 via-blue-500/30 to-purple-500/30 backdrop-blur-xl z-10">
            <div className="text-center">
              <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl mb-6">🏃</motion.div>
              <motion.h2 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-7xl font-black text-white mb-4 drop-shadow-2xl">SKY RUNNER 3D</motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-white text-xl mb-2 drop-shadow-lg">{isMobile ? '🎮 Tap to Jump • Tilt to Move' : '⌨️ W/↑/SPACE: Jump • A/D/←/→: Move'}</motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-cyan-200 mb-8 text-lg drop-shadow-lg">🪙 Collect coins • 🚫 Avoid obstacles • 🏆 Beat your high score!</motion.p>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: "spring" }}>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-12 py-8 text-2xl shadow-2xl">
                  <Play className="w-8 h-8 mr-3" />
                  START RUNNING
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-10">
            <div className="text-center">
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", duration: 0.8 }}>
                <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8" />
              </motion.div>
              <motion.h3 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-6xl font-bold text-white mb-6">GAME OVER!</motion.h3>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }} className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-2xl p-8 mb-8 border-2 border-cyan-500/50">
                <p className="text-gray-300 text-xl mb-3">Final Score</p>
                <p className="text-7xl font-black text-cyan-400 mb-4">{score}</p>
                <p className="text-yellow-400 text-2xl">🪙 Coins: {coins}</p>
              </motion.div>
              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-500 to-blue-600 px-10 py-7 text-xl">RUN AGAIN</Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={mountRef} className="w-full h-full" />

      {gameState === 'playing' && (
        <>
          <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-md rounded-2xl p-5 border border-cyan-400/50">
            <div className="text-white space-y-3">
              <div className="text-sm font-bold">Score: <span className="text-cyan-400 text-xl">{score}</span></div>
              <div className="text-sm font-bold">Coins: <span className="text-yellow-400 text-xl">{coins} 🪙</span></div>
              <div className="text-sm font-bold">Lives: <span className="text-red-400 text-xl">{"❤️".repeat(lives)}</span></div>
            </div>
          </motion.div>

          {isMobile && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-6 left-0 right-0 z-20 px-4">
              <div className="flex justify-center items-center gap-4">
                <Button onTouchStart={() => keysRef.current['a'] = true} onTouchEnd={() => keysRef.current['a'] = false} className="bg-cyan-600/80 backdrop-blur-sm hover:bg-cyan-700 h-20 px-10 text-3xl font-bold shadow-xl">←</Button>
                <Button onTouchStart={jump} className="bg-green-600/80 backdrop-blur-sm hover:bg-green-700 h-20 px-10 text-3xl font-bold shadow-xl">JUMP</Button>
                <Button onTouchStart={() => keysRef.current['d'] = true} onTouchEnd={() => keysRef.current['d'] = false} className="bg-cyan-600/80 backdrop-blur-sm hover:bg-cyan-700 h-20 px-10 text-3xl font-bold shadow-xl">→</Button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {showShop && (
        <GameShop currentUser={currentUser} gameName="sky-runner" onClose={() => { setShowShop(false); loadEquippedItems(); }} />
      )}

      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} gameName="sky-runner" onSettingsChange={setSettings} />
    </div>
  );
}