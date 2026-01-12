import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag, Settings } from "lucide-react";
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
  const isGroundedRef = useRef(false);
  const keysRef = useRef({});
  const animationMixerRef = useRef(null);

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
        case 'jump': oscillator.frequency.value = 500; gainNode.gain.value = 0.15; break;
        case 'coin': oscillator.frequency.value = 900; gainNode.gain.value = 0.12; break;
        case 'hit': oscillator.frequency.value = 150; gainNode.gain.value = 0.25; break;
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}
  };

  const createPlayer = () => {
    const group = new THREE.Group();
    const playerColor = equippedItems.skin?.effect_data?.color || '#00ffff';
    const colorNum = parseInt(playerColor.replace('#', ''), 16);
    
    // Torso (capsule for smoother look)
    const torsoGeometry = new THREE.CapsuleGeometry(0.35, 1.2, 12, 24);
    const torsoMaterial = new THREE.MeshStandardMaterial({ 
      color: colorNum, 
      metalness: 0.4, 
      roughness: 0.5,
      emissive: colorNum,
      emissiveIntensity: 0.15
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 1.2;
    torso.castShadow = true;
    group.add(torso);
    group.userData.torso = torso;
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const head = new THREE.Mesh(headGeometry, torsoMaterial);
    head.position.y = 2.2;
    head.castShadow = true;
    group.add(head);
    
    // Arms
    const armGeometry = new THREE.CapsuleGeometry(0.12, 0.7, 8, 16);
    const leftArm = new THREE.Mesh(armGeometry, torsoMaterial);
    leftArm.position.set(-0.5, 1.3, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    const rightArm = new THREE.Mesh(armGeometry, torsoMaterial);
    rightArm.position.set(0.5, 1.3, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = true;
    group.add(leftArm, rightArm);
    group.userData.arms = [leftArm, rightArm];
    
    // Legs
    const legGeometry = new THREE.CapsuleGeometry(0.15, 0.8, 8, 16);
    const leftLeg = new THREE.Mesh(legGeometry, torsoMaterial);
    leftLeg.position.set(-0.25, 0.4, 0);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(legGeometry, torsoMaterial);
    rightLeg.position.set(0.25, 0.4, 0);
    rightLeg.castShadow = true;
    group.add(leftLeg, rightLeg);
    group.userData.legs = [leftLeg, rightLeg];
    
    // Trail effect
    if (settings.visualEffects && equippedItems.trail) {
      const trailColor = equippedItems.trail.effect_data?.color || '#ff00ff';
      const trailGeometry = new THREE.ConeGeometry(0.4, 2, 8);
      const trailMaterial = new THREE.MeshBasicMaterial({ 
        color: parseInt(trailColor.replace('#', ''), 16),
        transparent: true,
        opacity: 0.5
      });
      const trail = new THREE.Mesh(trailGeometry, trailMaterial);
      trail.position.set(0, 0.8, 0.6);
      trail.rotation.x = Math.PI;
      group.add(trail);
      group.userData.trail = trail;
    }
    
    return group;
  };

  const createPlatform = (x, y, z, width = 5, depth = 5) => {
    const geometry = new THREE.BoxGeometry(width, 0.6, depth);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x3b4a6b,
      metalness: 0.3,
      roughness: 0.6
    });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, y, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    
    // Edge glow
    if (settings.visualEffects) {
      const edgeGeometry = new THREE.BoxGeometry(width + 0.2, 0.1, depth + 0.2);
      const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });
      const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edge.position.y = 0.35;
      platform.add(edge);
    }
    
    return platform;
  };

  const createCoin = (x, y, z) => {
    const geometry = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 20);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6
    });
    const coin = new THREE.Mesh(geometry, material);
    coin.position.set(x, y, z);
    coin.rotation.x = Math.PI / 2;
    coin.userData.isCoin = true;
    return coin;
  };

  const createObstacle = (x, y, z) => {
    const geometry = new THREE.BoxGeometry(1.2, 2.5, 1.2);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xff1a1a,
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0xff0000,
      emissiveIntensity: 0.4
    });
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set(x, y, z);
    obstacle.castShadow = true;
    return obstacle;
  };

  const generateLevel = (startZ) => {
    for (let i = 0; i < 12; i++) {
      const z = startZ - i * 10;
      const x = (Math.random() - 0.5) * 12;
      const y = i * 0.5 + Math.random() * 2;
      const width = 4 + Math.random() * 3;
      
      const platform = createPlatform(x, y, z, width, 5);
      platformsRef.current.push(platform);
      sceneRef.current.add(platform);
      
      if (Math.random() > 0.3) {
        const coin = createCoin(x, y + 1.5, z);
        coinsObjRef.current.push(coin);
        sceneRef.current.add(coin);
      }
      
      if (Math.random() > 0.65) {
        const obstacle = createObstacle(x + (Math.random() - 0.5) * 2, y + 1.3, z);
        obstaclesRef.current.push(obstacle);
        sceneRef.current.add(obstacle);
      }
    }
  };

  const initThreeJS = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 80, 250);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 12, 18);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(30, 50, 30);
    sun.castShadow = true;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    scene.add(sun);

    const startPlatform = createPlatform(0, 0, 0, 8, 8);
    platformsRef.current.push(startPlatform);
    scene.add(startPlatform);

    const player = createPlayer();
    player.position.set(0, 1.5, 0);
    scene.add(player);
    playerRef.current = player;

    generateLevel(-15);

    handleControls();
    animate();
  };

  const handleControls = () => {
    const handleKeyDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && isGroundedRef.current) {
        playerVelocityRef.current.y = 0.3;
        isGroundedRef.current = false;
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
    if (isGroundedRef.current) {
      playerVelocityRef.current.y = 0.3;
      isGroundedRef.current = false;
      playSound('jump');
    }
  };

  const animate = () => {
    if (gameState !== 'playing' || !sceneRef.current) return;

    const sensitivity = settings.controlSensitivity / 5;
    
    // Horizontal movement
    if (keysRef.current['a'] || keysRef.current['arrowleft']) {
      playerVelocityRef.current.x = Math.max(-0.15 * sensitivity, playerVelocityRef.current.x - 0.015);
    } else if (keysRef.current['d'] || keysRef.current['arrowright']) {
      playerVelocityRef.current.x = Math.min(0.15 * sensitivity, playerVelocityRef.current.x + 0.015);
    } else {
      playerVelocityRef.current.x *= 0.88;
    }

    // Gravity
    playerVelocityRef.current.y -= 0.015;
    
    // Forward movement (slower)
    const speedBoost = equippedItems.boost?.effect_data?.speed_multiplier || 1;
    playerVelocityRef.current.z = -0.12 * speedBoost;

    // Update position
    if (playerRef.current) {
      playerRef.current.position.x += playerVelocityRef.current.x;
      playerRef.current.position.y += playerVelocityRef.current.y;
      playerRef.current.position.z += playerVelocityRef.current.z;

      // Running animation
      if (isGroundedRef.current && Math.abs(playerVelocityRef.current.z) > 0.01) {
        const runPhase = Date.now() * 0.01;
        if (playerRef.current.userData.legs) {
          playerRef.current.userData.legs[0].rotation.x = Math.sin(runPhase) * 0.5;
          playerRef.current.userData.legs[1].rotation.x = Math.sin(runPhase + Math.PI) * 0.5;
        }
        if (playerRef.current.userData.arms) {
          playerRef.current.userData.arms[0].rotation.x = Math.sin(runPhase + Math.PI) * 0.4;
          playerRef.current.userData.arms[1].rotation.x = Math.sin(runPhase) * 0.4;
        }
        if (playerRef.current.userData.torso) {
          playerRef.current.userData.torso.rotation.y = Math.sin(runPhase * 2) * 0.08;
        }
      }

      // Tilt based on movement
      playerRef.current.rotation.z = -playerVelocityRef.current.x * 1.5;
      
      // Trail animation
      if (playerRef.current.userData.trail) {
        playerRef.current.userData.trail.material.opacity = 0.3 + Math.abs(playerVelocityRef.current.z) * 2;
      }
    }

    // Platform collision
    isGroundedRef.current = false;
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
          py > platY + 0.3 && py < platY + 2 &&
          playerVelocityRef.current.y <= 0) {
        playerRef.current.position.y = platY + 0.3;
        playerVelocityRef.current.y = 0;
        isGroundedRef.current = true;
      }
    });

    // Coin collection
    coinsObjRef.current.forEach((coin, idx) => {
      coin.rotation.y += 0.08;
      coin.position.y += Math.sin(Date.now() * 0.003 + idx) * 0.003;
      
      const dist = playerRef.current.position.distanceTo(coin.position);
      if (dist < 1.2) {
        sceneRef.current.remove(coin);
        coinsObjRef.current.splice(idx, 1);
        const scoreMultiplier = equippedItems.boost?.effect_data?.score_multiplier || 1;
        setCoins(prev => prev + 1);
        setScore(prev => prev + Math.floor(15 * scoreMultiplier));
        playSound('coin');
      }
    });

    // Obstacle collision
    obstaclesRef.current.forEach((obstacle, idx) => {
      obstacle.rotation.y += 0.02;
      
      const dist = playerRef.current.position.distanceTo(obstacle.position);
      if (dist < 1.3) {
        playSound('hit');
        sceneRef.current.remove(obstacle);
        obstaclesRef.current.splice(idx, 1);
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            endGame();
          } else {
            toast.error('Hit obstacle! 💥', { duration: 1000 });
          }
          return newLives;
        });
      }
    });

    // Clean old platforms
    platformsRef.current = platformsRef.current.filter(platform => {
      if (platform.position.z > playerRef.current.position.z + 40) {
        sceneRef.current.remove(platform);
        return false;
      }
      return true;
    });

    coinsObjRef.current = coinsObjRef.current.filter(coin => {
      if (coin.position.z > playerRef.current.position.z + 40) {
        sceneRef.current.remove(coin);
        return false;
      }
      return true;
    });

    obstaclesRef.current = obstaclesRef.current.filter(obs => {
      if (obs.position.z > playerRef.current.position.z + 40) {
        sceneRef.current.remove(obs);
        return false;
      }
      return true;
    });

    // Generate new platforms
    if (platformsRef.current.length < 18) {
      const lastZ = Math.min(...platformsRef.current.map(p => p.position.z), playerRef.current.position.z);
      generateLevel(lastZ - 15);
    }

    // Fall off
    if (playerRef.current.position.y < -15) {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          endGame();
        } else {
          const nearestPlatform = platformsRef.current.reduce((nearest, p) => 
            Math.abs(p.position.z - playerRef.current.position.z) < Math.abs(nearest.position.z - playerRef.current.position.z) ? p : nearest
          );
          playerRef.current.position.set(nearestPlatform.position.x, nearestPlatform.position.y + 5, nearestPlatform.position.z);
          playerVelocityRef.current = { x: 0, y: 0, z: 0 };
          toast.error('Fell off! 💀', { duration: 1000 });
        }
        return newLives;
      });
    }

    // Camera follow
    if (cameraRef.current && playerRef.current) {
      cameraRef.current.position.x += (playerRef.current.position.x - cameraRef.current.position.x) * 0.08;
      cameraRef.current.position.y = playerRef.current.position.y + 10;
      cameraRef.current.position.z = playerRef.current.position.z + 16;
      cameraRef.current.lookAt(playerRef.current.position.x, playerRef.current.position.y, playerRef.current.position.z - 5);
    }

    if (rendererRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const cleanupThreeJS = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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
    playerVelocityRef.current = { x: 0, y: 0, z: 0 };
    isGroundedRef.current = false;
    keysRef.current = {};
    setGameState('playing');
  };

  const endGame = async () => {
    setGameState('gameover');

    if (!currentUser) return;

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'sky-runner',
        score: score,
        duration_seconds: Math.floor(score / 10),
        reward_earned: coins
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-sky-300 via-sky-400 to-blue-500">
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }} className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-400/40 via-blue-500/40 to-purple-600/40 backdrop-blur-xl z-10">
            <div className="text-center px-4">
              <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 100 }} className="text-8xl mb-6">🏃</motion.div>
              <motion.h2 initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-6xl md:text-7xl font-black text-white mb-4 drop-shadow-2xl">SKY RUNNER 3D</motion.h2>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-8 space-y-2">
                <p className="text-white text-lg md:text-xl drop-shadow-lg">{isMobile ? '🎮 Tap JUMP • Tilt to move' : '⌨️ SPACE/W/↑: Jump • A/D/←/→: Move'}</p>
                <p className="text-cyan-100 text-base md:text-lg drop-shadow-lg">🪙 Collect coins • 🚫 Avoid red obstacles • 🏆 Don't fall!</p>
              </motion.div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }}>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-12 py-8 text-xl md:text-2xl shadow-2xl">
                  <Play className="w-8 h-8 mr-3" />
                  START RUNNING
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 bg-black/85 backdrop-blur-2xl flex items-center justify-center z-10">
            <div className="text-center px-4">
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", duration: 0.9 }}>
                <Trophy className="w-28 h-28 md:w-36 md:h-36 text-yellow-400 mx-auto mb-8 drop-shadow-2xl" />
              </motion.div>
              <motion.h3 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-5xl md:text-6xl font-bold text-white mb-6">GAME OVER!</motion.h3>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }} className="bg-gradient-to-r from-cyan-500/30 to-blue-600/30 rounded-3xl p-8 mb-8 border-2 border-cyan-400/60 backdrop-blur-sm">
                <p className="text-gray-200 text-xl mb-3">Final Score</p>
                <p className="text-6xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-400 mb-4">{score}</p>
                <p className="text-yellow-300 text-xl md:text-2xl">🪙 Coins Collected: {coins}</p>
              </motion.div>
              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-10 py-7 text-xl">RUN AGAIN</Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={mountRef} className="w-full h-full" />

      {gameState === 'playing' && (
        <>
          <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-cyan-400/50">
            <div className="text-white space-y-2 md:space-y-3">
              <div className="text-xs md:text-sm font-bold">Score: <span className="text-cyan-400 text-lg md:text-xl">{score}</span></div>
              <div className="text-xs md:text-sm font-bold">Coins: <span className="text-yellow-400 text-lg md:text-xl">{coins} 🪙</span></div>
              <div className="text-xs md:text-sm font-bold">Lives: <span className="text-red-400 text-lg md:text-xl">{"❤️".repeat(lives)}</span></div>
            </div>
          </motion.div>

          {isMobile && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-6 left-0 right-0 z-20 px-4">
              <div className="flex justify-center items-center gap-4">
                <Button onTouchStart={() => keysRef.current['a'] = true} onTouchEnd={() => keysRef.current['a'] = false} className="bg-cyan-600/90 backdrop-blur-sm hover:bg-cyan-700 h-16 w-16 text-3xl font-bold shadow-xl">←</Button>
                <Button onTouchStart={jump} className="bg-green-600/90 backdrop-blur-sm hover:bg-green-700 h-20 px-8 text-lg font-bold shadow-xl">JUMP</Button>
                <Button onTouchStart={() => keysRef.current['d'] = true} onTouchEnd={() => keysRef.current['d'] = false} className="bg-cyan-600/90 backdrop-blur-sm hover:bg-cyan-700 h-16 w-16 text-3xl font-bold shadow-xl">→</Button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {showShop && <GameShop currentUser={currentUser} gameName="sky-runner" onClose={() => { setShowShop(false); loadEquippedItems(); }} />}
      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} gameName="sky-runner" onSettingsChange={setSettings} />
    </div>
  );
}