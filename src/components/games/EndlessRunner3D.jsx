import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GameShop from "./GameShop";
import * as THREE from "three";

export default function EndlessRunner3D({ currentUser, onExit }) {
  const mountRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [equippedItems, setEquippedItems] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const playerRef = useRef(null);
  const obstaclesRef = useRef([]);
  const coinsRef = useRef([]);
  const speedRef = useRef(0.2);
  const laneRef = useRef(0); // -1, 0, 1

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
        game_name: 'endless-runner',
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

  const initThreeJS = () => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000428, 10, 50);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setClearColor(0x000428);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Player
    const playerColor = equippedItems.skin?.effect_data?.color || '#00ffff';
    const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
    const playerMaterial = new THREE.MeshPhongMaterial({ 
      color: playerColor,
      emissive: playerColor,
      emissiveIntensity: 0.3
    });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 0.5, 5);
    scene.add(player);
    playerRef.current = player;

    // Ground
    for (let i = 0; i < 60; i++) {
      const groundGeometry = new THREE.PlaneGeometry(10, 2);
      const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1a1a2e,
        side: THREE.DoubleSide
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.z = -i * 2;
      scene.add(ground);
    }

    animate();
    handleControls();
  };

  const handleControls = () => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') laneRef.current = Math.max(-1, laneRef.current - 1);
      if (e.key === 'ArrowRight' || e.key === 'd') laneRef.current = Math.min(1, laneRef.current + 1);
      if (e.key === ' ') jump();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  };

  const jump = () => {
    if (playerRef.current && playerRef.current.position.y <= 0.5) {
      playerRef.current.userData.jumping = true;
      playerRef.current.userData.jumpVelocity = 0.3;
    }
  };

  const moveLane = (dir) => {
    laneRef.current = Math.max(-1, Math.min(1, laneRef.current + dir));
  };

  const spawnObstacle = () => {
    const geometry = new THREE.BoxGeometry(1.5, 2, 1.5);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set((Math.random() * 3 - 1.5) * 3, 1, -50);
    sceneRef.current.add(obstacle);
    obstaclesRef.current.push(obstacle);
  };

  const spawnCoin = () => {
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.5
    });
    const coin = new THREE.Mesh(geometry, material);
    coin.rotation.x = Math.PI / 2;
    coin.position.set((Math.random() * 3 - 1.5) * 3, 1, -50);
    sceneRef.current.add(coin);
    coinsRef.current.push(coin);
  };

  const animate = () => {
    if (gameState !== 'playing') return;

    const speedBoost = equippedItems.boost?.effect_data?.speed_multiplier || 1;
    speedRef.current = 0.2 * speedBoost;

    // Move player between lanes
    const targetX = laneRef.current * 3;
    if (playerRef.current) {
      playerRef.current.position.x += (targetX - playerRef.current.position.x) * 0.1;

      // Handle jumping
      if (playerRef.current.userData.jumping) {
        playerRef.current.userData.jumpVelocity -= 0.02;
        playerRef.current.position.y += playerRef.current.userData.jumpVelocity;
        if (playerRef.current.position.y <= 0.5) {
          playerRef.current.position.y = 0.5;
          playerRef.current.userData.jumping = false;
        }
      }
    }

    // Move and spawn obstacles
    obstaclesRef.current.forEach((obs, idx) => {
      obs.position.z += speedRef.current;
      if (obs.position.z > 10) {
        sceneRef.current.remove(obs);
        obstaclesRef.current.splice(idx, 1);
      }

      // Collision detection
      if (playerRef.current &&
          Math.abs(obs.position.x - playerRef.current.position.x) < 1.5 &&
          Math.abs(obs.position.z - playerRef.current.position.z) < 1.5 &&
          playerRef.current.position.y < 1.5) {
        endGame();
      }
    });

    if (Math.random() < 0.02) spawnObstacle();

    // Move and collect coins
    coinsRef.current.forEach((coin, idx) => {
      coin.position.z += speedRef.current;
      coin.rotation.y += 0.1;

      if (coin.position.z > 10) {
        sceneRef.current.remove(coin);
        coinsRef.current.splice(idx, 1);
      }

      // Coin collection
      if (playerRef.current &&
          Math.abs(coin.position.x - playerRef.current.position.x) < 1 &&
          Math.abs(coin.position.z - playerRef.current.position.z) < 1) {
        const scoreMultiplier = equippedItems.boost?.effect_data?.score_multiplier || 1;
        setScore(prev => prev + Math.floor(10 * scoreMultiplier));
        sceneRef.current.remove(coin);
        coinsRef.current.splice(idx, 1);
      }
    });

    if (Math.random() < 0.03) spawnCoin();

    setDistance(prev => prev + 1);
    if (cameraRef.current) cameraRef.current.lookAt(playerRef.current?.position || new THREE.Vector3(0, 0, 0));
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    requestAnimationFrame(animate);
  };

  const cleanupThreeJS = () => {
    if (rendererRef.current && mountRef.current) {
      mountRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }
    obstaclesRef.current = [];
    coinsRef.current = [];
  };

  const startGame = () => {
    setScore(0);
    setDistance(0);
    speedRef.current = 0.2;
    laneRef.current = 0;
    setGameState('playing');
  };

  const endGame = async () => {
    setGameState('gameover');

    if (!currentUser) return;

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'endless-runner',
        score: score,
        duration_seconds: Math.floor(distance / 60),
        reward_earned: Math.floor(score / 100)
      });
      toast.success(`🏃 Game Over!`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button onClick={() => setShowShop(true)} className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 transition">
          <ShoppingBag className="w-6 h-6 text-white" />
        </button>
        <button onClick={onExit} className="p-3 bg-red-500 rounded-full hover:bg-red-600 transition">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {gameState !== 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          {gameState === 'menu' && (
            <div className="text-center">
              <div className="text-7xl mb-4">🏃</div>
              <h2 className="text-5xl font-bold text-white mb-3">Endless Runner 3D</h2>
              <p className="text-gray-300 mb-6">{isMobile ? 'Tap buttons to move' : 'Arrow Keys to Move, Space to Jump'}</p>
              <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 px-10 py-7 text-xl">
                <Play className="w-6 h-6 mr-3" />
                Start Running
              </Button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="text-center">
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
              <h3 className="text-5xl font-bold text-white mb-4">Run Complete!</h3>
              <div className="bg-cyan-600/20 rounded-xl p-6 mb-6">
                <p className="text-6xl font-bold text-cyan-400">{score}</p>
                <p className="text-yellow-400 mt-2">Distance: {Math.floor(distance / 10)}m</p>
              </div>
              <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-6 text-lg">
                Run Again
              </Button>
            </div>
          )}
        </div>
      )}

      <div ref={mountRef} className="w-full h-full" />

      {isMobile && gameState === 'playing' && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-4 z-20">
          <Button onClick={() => moveLane(-1)} className="bg-cyan-600 h-16 px-8 text-2xl">←</Button>
          <Button onClick={jump} className="bg-yellow-600 h-16 px-8 text-2xl">↑</Button>
          <Button onClick={() => moveLane(1)} className="bg-cyan-600 h-16 px-8 text-2xl">→</Button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-sm rounded-xl p-4">
          <div className="text-white">
            <div className="text-sm">Score</div>
            <div className="font-bold text-2xl text-cyan-400">{score}</div>
            <div className="text-sm mt-2">Distance</div>
            <div className="font-bold text-xl text-yellow-400">{Math.floor(distance / 10)}m</div>
          </div>
        </div>
      )}

      {showShop && (
        <GameShop
          currentUser={currentUser}
          gameName="endless-runner"
          onClose={() => {
            setShowShop(false);
            loadEquippedItems();
          }}
        />
      )}
    </div>
  );
}