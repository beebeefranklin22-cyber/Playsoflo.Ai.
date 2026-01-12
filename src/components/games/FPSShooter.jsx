import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag, Settings, Crosshair } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import * as THREE from "three";
import GameShop from "./GameShop";
import GameSettings from "./GameSettings";

export default function FPSShooter({ currentUser, onExit }) {
  const mountRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(30);
  const [kills, setKills] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [equippedItems, setEquippedItems] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState({ soundEnabled: true, visualEffects: true, controlSensitivity: 5 });

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const targetsRef = useRef([]);
  const bulletsRef = useRef([]);
  const keysRef = useRef({});
  const mouseRef = useRef({ x: 0, y: 0 });

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
        game_name: 'fps-shooter',
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
        case 'shoot': oscillator.frequency.value = 200; gainNode.gain.value = 0.15; break;
        case 'hit': oscillator.frequency.value = 150; gainNode.gain.value = 0.2; break;
        case 'reload': oscillator.frequency.value = 400; gainNode.gain.value = 0.1; break;
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}
  };

  const initThreeJS = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(20, 30, 20);
    sun.castShadow = true;
    scene.add(sun);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x2a2a3a })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls/Cover
    for (let i = 0; i < 10; i++) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(2, 3, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x505060 })
      );
      wall.position.set(
        (Math.random() - 0.5) * 40,
        1.5,
        (Math.random() - 0.5) * 40
      );
      wall.castShadow = true;
      scene.add(wall);
    }

    spawnTargets();
    handleControls();
    animate();
  };

  const spawnTargets = () => {
    for (let i = 0; i < 5; i++) {
      const target = new THREE.Mesh(
        new THREE.BoxGeometry(1, 2, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      );
      target.position.set(
        (Math.random() - 0.5) * 30,
        1,
        -10 - Math.random() * 20
      );
      target.castShadow = true;
      target.userData.isTarget = true;
      sceneRef.current.add(target);
      targetsRef.current.push(target);
    }
  };

  const shoot = () => {
    if (ammo <= 0) {
      toast.error('Out of ammo! Press R to reload');
      return;
    }

    setAmmo(prev => prev - 1);
    playSound('shoot');

    const bullet = {
      position: cameraRef.current.position.clone(),
      direction: new THREE.Vector3(0, 0, -1).applyQuaternion(cameraRef.current.quaternion),
      speed: 2
    };
    bulletsRef.current.push(bullet);

    // Muzzle flash
    if (settings.visualEffects) {
      const flash = new THREE.PointLight(0xffaa00, 5, 10);
      flash.position.copy(cameraRef.current.position);
      flash.position.add(bullet.direction.clone().multiplyScalar(0.5));
      sceneRef.current.add(flash);
      setTimeout(() => sceneRef.current.remove(flash), 50);
    }
  };

  const reload = () => {
    setAmmo(30);
    playSound('reload');
    toast.success('Reloaded!');
  };

  const handleControls = () => {
    const handleKeyDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === ' ') shoot();
      if (e.key.toLowerCase() === 'r') reload();
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e) => {
      if (document.pointerLockElement === rendererRef.current.domElement) {
        mouseRef.current.x += e.movementX * 0.002;
        mouseRef.current.y -= e.movementY * 0.002;
        mouseRef.current.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseRef.current.y));
      }
    };

    const handleClick = () => {
      if (gameState === 'playing') {
        rendererRef.current.domElement.requestPointerLock();
        shoot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    rendererRef.current.domElement.addEventListener('click', handleClick);
  };

  const animate = () => {
    if (gameState !== 'playing' || !sceneRef.current) return;

    const moveSpeed = 0.1;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraRef.current.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraRef.current.quaternion);

    if (keysRef.current['w']) cameraRef.current.position.add(forward.clone().multiplyScalar(moveSpeed));
    if (keysRef.current['s']) cameraRef.current.position.add(forward.clone().multiplyScalar(-moveSpeed));
    if (keysRef.current['a']) cameraRef.current.position.add(right.clone().multiplyScalar(-moveSpeed));
    if (keysRef.current['d']) cameraRef.current.position.add(right.clone().multiplyScalar(moveSpeed));

    cameraRef.current.rotation.set(mouseRef.current.y, mouseRef.current.x, 0, 'YXZ');

    // Update bullets
    bulletsRef.current.forEach((bullet, idx) => {
      bullet.position.add(bullet.direction.clone().multiplyScalar(bullet.speed));

      // Check hit
      targetsRef.current.forEach((target, tIdx) => {
        if (bullet.position.distanceTo(target.position) < 1) {
          sceneRef.current.remove(target);
          targetsRef.current.splice(tIdx, 1);
          bulletsRef.current.splice(idx, 1);
          setKills(prev => prev + 1);
          setScore(prev => prev + 100);
          playSound('hit');

          if (targetsRef.current.length === 0) spawnTargets();
        }
      });

      if (bullet.position.distanceTo(cameraRef.current.position) > 100) {
        bulletsRef.current.splice(idx, 1);
      }
    });

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
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
    targetsRef.current = [];
    bulletsRef.current = [];
  };

  const startGame = () => {
    setScore(0);
    setAmmo(30);
    setKills(0);
    targetsRef.current = [];
    bulletsRef.current = [];
    mouseRef.current = { x: 0, y: 0 };
    setGameState('playing');
  };

  const endGame = async () => {
    setGameState('gameover');
    if (document.pointerLockElement) document.exitPointerLock();

    if (!currentUser) return;

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'fps-shooter',
        score: score,
        duration_seconds: 0,
        reward_earned: Math.floor(score / 50)
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-900/50 to-orange-900/50 backdrop-blur-xl z-10">
            <div className="text-center">
              <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl mb-6">🔫</motion.div>
              <motion.h2 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-7xl font-black text-white mb-4">FPS SHOOTER</motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-red-200 text-xl mb-2">{isMobile ? '🎮 Use controls' : '⌨️ WASD: Move • Mouse: Aim • Click/Space: Shoot • R: Reload'}</motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-orange-400 text-lg mb-8">Click to lock cursor and start!</motion.p>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }}>
                <Button onClick={startGame} className="bg-gradient-to-r from-red-600 to-orange-600 px-12 py-8 text-2xl shadow-2xl">
                  <Play className="w-8 h-8 mr-3" />
                  START MISSION
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-10">
            <div className="text-center">
              <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8" />
              <h3 className="text-6xl font-bold text-white mb-6">MISSION COMPLETE!</h3>
              <div className="bg-red-600/30 rounded-3xl p-8 mb-8 border-2 border-red-400/50">
                <p className="text-6xl font-black text-red-400 mb-2">{score}</p>
                <p className="text-yellow-400 text-xl">Kills: {kills}</p>
              </div>
              <Button onClick={startGame} className="bg-gradient-to-r from-red-600 to-orange-600 px-10 py-7 text-xl">PLAY AGAIN</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={mountRef} className="w-full h-full" />

      {gameState === 'playing' && (
        <>
          <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-red-500/40">
            <div className="text-white space-y-2">
              <div className="text-sm font-bold">Score: <span className="text-red-400 text-xl">{score}</span></div>
              <div className="text-sm font-bold">Ammo: <span className="text-yellow-400 text-xl">{ammo}/30</span></div>
              <div className="text-sm font-bold">Kills: <span className="text-green-400 text-xl">{kills}</span></div>
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <Crosshair className="w-8 h-8 text-red-500" strokeWidth={3} />
          </div>

          {isMobile && (
            <div className="absolute bottom-6 left-0 right-0 z-20 px-4">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-2">
                  <Button onTouchStart={() => keysRef.current['w'] = true} onTouchEnd={() => keysRef.current['w'] = false} className="bg-red-600/90 h-16 w-16">↑</Button>
                  <div className="flex gap-2">
                    <Button onTouchStart={() => keysRef.current['a'] = true} onTouchEnd={() => keysRef.current['a'] = false} className="bg-red-600/90 h-16 w-16">←</Button>
                    <Button onTouchStart={() => keysRef.current['s'] = true} onTouchEnd={() => keysRef.current['s'] = false} className="bg-red-600/90 h-16 w-16">↓</Button>
                    <Button onTouchStart={() => keysRef.current['d'] = true} onTouchEnd={() => keysRef.current['d'] = false} className="bg-red-600/90 h-16 w-16">→</Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={shoot} className="bg-orange-600/90 h-20 w-20 text-2xl">🔫</Button>
                  <Button onClick={reload} className="bg-yellow-600/90 h-16 w-20">R</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showShop && <GameShop currentUser={currentUser} gameName="fps-shooter" onClose={() => { setShowShop(false); loadEquippedItems(); }} />}
      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} gameName="fps-shooter" onSettingsChange={setSettings} />
    </div>
  );
}