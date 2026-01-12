import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag, Zap, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import * as THREE from "three";
import VehicleGarage from "./VehicleGarage";
import GameSettings from "./GameSettings";

export default function Highway95Racing({ currentUser, onExit }) {
  const mountRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [turboBoost, setTurboBoost] = useState(100);
  const [showGarage, setShowGarage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState({ soundEnabled: true, visualEffects: true, controlSensitivity: 5 });

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const playerRef = useRef(null);
  const roadSegmentsRef = useRef([]);
  const trafficRef = useRef([]);
  const hazardsRef = useRef([]);
  const laneRef = useRef(1);
  const gasPressedRef = useRef(false);
  const brakePressedRef = useRef(false);
  const playerZRef = useRef(0);
  const worldSpeedRef = useRef(0);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (currentUser) loadCurrentVehicle();
  }, [currentUser]);

  const loadCurrentVehicle = async () => {
    try {
      const vehicles = await base44.entities.UserVehicle.filter({
        user_email: currentUser.email,
        is_equipped: true
      });
      if (vehicles.length > 0) {
        setCurrentVehicle(vehicles[0]);
      } else {
        const defaultCar = await base44.entities.UserVehicle.create({
          user_email: currentUser.email,
          vehicle_name: "Starter Sedan",
          vehicle_type: "car",
          top_speed: 120,
          acceleration: 5,
          handling: 7,
          color: "#3b82f6",
          price: 0,
          is_unlocked: true,
          is_equipped: true
        });
        setCurrentVehicle(defaultCar);
      }
    } catch (error) {
      console.error('Failed to load vehicle:', error);
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && mountRef.current && currentVehicle) {
      initThreeJS();
      return () => cleanupThreeJS();
    }
  }, [gameState, currentVehicle]);

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
        case 'crash': oscillator.frequency.value = 100; gainNode.gain.value = 0.3; break;
        case 'turbo': oscillator.frequency.value = 800; gainNode.gain.value = 0.2; break;
        case 'horn': oscillator.frequency.value = 440; gainNode.gain.value = 0.15; break;
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  const createVehicle = (type, color) => {
    const group = new THREE.Group();
    const colorNum = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
    
    if (type === 'motorcycle' || type === 'dirt_bike') {
      const bodyGeometry = new THREE.BoxGeometry(0.8, 1, 2);
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: colorNum, metalness: 0.6, roughness: 0.4 });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.5;
      body.castShadow = true;
      group.add(body);
      
      const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
      [0.8, -0.8].forEach(z => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(0, 0.4, z);
        wheel.rotation.z = Math.PI / 2;
        wheel.castShadow = true;
        group.add(wheel);
        group.userData.wheels = group.userData.wheels || [];
        group.userData.wheels.push(wheel);
      });
    } else if (type === '18_wheeler') {
      const cabGeometry = new THREE.BoxGeometry(3, 2.5, 4);
      const cabMaterial = new THREE.MeshStandardMaterial({ color: colorNum, metalness: 0.5, roughness: 0.5 });
      const cab = new THREE.Mesh(cabGeometry, cabMaterial);
      cab.position.y = 1.25;
      cab.castShadow = true;
      group.add(cab);
      
      const trailerGeometry = new THREE.BoxGeometry(2.8, 3, 12);
      const trailerMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
      const trailer = new THREE.Mesh(trailerGeometry, trailerMaterial);
      trailer.position.set(0, 1.5, -8);
      trailer.castShadow = true;
      group.add(trailer);
    } else {
      // Sleeker car design
      const bodyGeometry = new THREE.BoxGeometry(2, 1.2, 4.5);
      const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: colorNum, 
        metalness: 0.7, 
        roughness: 0.3 
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.6;
      body.castShadow = true;
      group.add(body);
      
      // Rounded roof
      const roofGeometry = new THREE.BoxGeometry(1.8, 0.8, 2.2);
      const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
      roof.position.set(0, 1.4, -0.2);
      roof.castShadow = true;
      group.add(roof);
      
      // Hood slope
      const hoodGeometry = new THREE.BoxGeometry(1.9, 0.3, 1.2);
      const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
      hood.position.set(0, 0.95, 1.8);
      hood.rotation.x = -0.2;
      group.add(hood);
      
      // Windows
      const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        transparent: true, 
        opacity: 0.6,
        metalness: 0.9
      });
      const windowGeometry = new THREE.BoxGeometry(1.7, 0.7, 2.1);
      const windows = new THREE.Mesh(windowGeometry, windowMaterial);
      windows.position.set(0, 1.4, -0.2);
      group.add(windows);
      
      // Wheels with better positioning
      const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const wheelPositions = [
        [-1.1, 0.4, 1.5],
        [1.1, 0.4, 1.5],
        [-1.1, 0.4, -1.5],
        [1.1, 0.4, -1.5]
      ];
      group.userData.wheels = [];
      wheelPositions.forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(x, y, z);
        wheel.rotation.z = Math.PI / 2;
        wheel.castShadow = true;
        group.add(wheel);
        group.userData.wheels.push(wheel);
      });
      
      // Headlights
      const lightGeometry = new THREE.SphereGeometry(0.15, 8, 8);
      const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffaa });
      [-0.7, 0.7].forEach(x => {
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(x, 0.7, 2.3);
        group.add(light);
      });
    }
    
    return group;
  };

  const initThreeJS = () => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 100, 800);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setClearColor(0x87ceeb);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(100, 200, 100);
    sun.castShadow = true;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    // Create initial road segments
    for (let i = 0; i < 20; i++) {
      createRoadSegment(-i * 50);
    }

    // Player vehicle
    const player = createVehicle(currentVehicle?.vehicle_type || 'car', currentVehicle?.color || '#3b82f6');
    player.position.set(0, 0, 0);
    scene.add(player);
    playerRef.current = player;

    // Scenery
    addScenery();

    handleControls();
    animate();
  };

  const createRoadSegment = (zPos) => {
    const roadWidth = 20;
    const segmentLength = 50;
    
    // Road surface
    const roadGeometry = new THREE.PlaneGeometry(roadWidth, segmentLength);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.9
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, zPos);
    road.receiveShadow = true;
    sceneRef.current.add(road);
    roadSegmentsRef.current.push({ mesh: road, z: zPos });
    
    // Lane lines
    for (let i = 0; i < 10; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.3, 0.01, 4);
      const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      
      [-5, 5].forEach(x => {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(x, 0.01, zPos - i * 5);
        sceneRef.current.add(line);
        roadSegmentsRef.current.push({ mesh: line, z: zPos - i * 5 });
      });
    }
  };

  const addScenery = () => {
    const types = ['building', 'tree', 'sign'];
    for (let i = 0; i < 50; i++) {
      const z = -i * 30;
      [-1, 1].forEach(side => {
        if (Math.random() > 0.3) {
          const type = types[Math.floor(Math.random() * types.length)];
          let obj;
          
          if (type === 'building') {
            const height = 10 + Math.random() * 30;
            const width = 5 + Math.random() * 5;
            const geometry = new THREE.BoxGeometry(width, height, width);
            const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
            obj = new THREE.Mesh(geometry, material);
            obj.position.set(side * (15 + Math.random() * 10), height / 2, z);
            obj.castShadow = true;
          } else if (type === 'tree') {
            const trunk = new THREE.Mesh(
              new THREE.CylinderGeometry(0.3, 0.5, 4),
              new THREE.MeshStandardMaterial({ color: 0x8b4513 })
            );
            trunk.position.set(side * 13, 2, z);
            sceneRef.current.add(trunk);
            
            const leaves = new THREE.Mesh(
              new THREE.SphereGeometry(2.5, 8, 8),
              new THREE.MeshStandardMaterial({ color: 0x228b22 })
            );
            leaves.position.set(side * 13, 5, z);
            obj = leaves;
          } else {
            const geometry = new THREE.BoxGeometry(2, 3, 0.5);
            const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            obj = new THREE.Mesh(geometry, material);
            obj.position.set(side * 11, 1.5, z);
          }
          
          if (obj) {
            obj.userData.scenery = true;
            sceneRef.current.add(obj);
          }
        }
      });
    }
  };

  const spawnTrafficVehicle = () => {
    const types = ['car', 'suv', 'truck', 'police'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3) - 1;
    const colors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0x00ffff];
    const color = type === 'police' ? 0x000000 : colors[Math.floor(Math.random() * colors.length)];
    
    const vehicle = createVehicle(type === 'truck' ? '18_wheeler' : type, color);
    vehicle.position.set(lane * 5, 0, playerZRef.current - 200);
    vehicle.userData.lane = lane;
    vehicle.userData.relativeSpeed = -2 - Math.random() * 3;
    vehicle.userData.type = type;
    
    sceneRef.current.add(vehicle);
    trafficRef.current.push(vehicle);
  };

  const handleControls = () => {
    const handleKeyDown = (e) => {
      const sensitivity = settings.controlSensitivity / 5;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') laneRef.current = Math.max(-1, laneRef.current - 1);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') laneRef.current = Math.min(1, laneRef.current + 1);
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') gasPressedRef.current = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') brakePressedRef.current = true;
      if (e.key === ' ') {
        e.preventDefault();
        if (turboBoost >= 20) {
          gasPressedRef.current = true;
          setTurboBoost(prev => Math.max(0, prev - 20));
          playSound('turbo');
          setTimeout(() => worldSpeedRef.current *= 1.5, 0);
          setTimeout(() => gasPressedRef.current = false, 1000);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') gasPressedRef.current = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') brakePressedRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  };

  const animate = () => {
    if (gameState !== 'playing' || !sceneRef.current) return;

    const maxSpeed = (currentVehicle?.top_speed || 120) / 15;
    const acceleration = (currentVehicle?.acceleration || 5) / 50;

    // Update speed
    if (gasPressedRef.current) {
      worldSpeedRef.current = Math.min(maxSpeed, worldSpeedRef.current + acceleration);
    } else if (brakePressedRef.current) {
      worldSpeedRef.current = Math.max(0, worldSpeedRef.current - 0.3);
    } else {
      worldSpeedRef.current = Math.max(0, worldSpeedRef.current - 0.05);
    }

    setSpeed(Math.floor(worldSpeedRef.current * 10));

    // Move player between lanes
    const targetX = laneRef.current * 5;
    if (playerRef.current) {
      playerRef.current.position.x += (targetX - playerRef.current.position.x) * 0.1;
      
      // Rotate wheels
      if (playerRef.current.userData.wheels) {
        playerRef.current.userData.wheels.forEach(wheel => {
          wheel.rotation.x -= worldSpeedRef.current * 0.1;
        });
      }
    }

    // Move world
    playerZRef.current -= worldSpeedRef.current;
    
    // Update camera
    if (cameraRef.current && playerRef.current) {
      cameraRef.current.position.z = playerRef.current.position.z + 8 + worldSpeedRef.current * 0.3;
      cameraRef.current.position.y = 5 + worldSpeedRef.current * 0.2;
      cameraRef.current.lookAt(playerRef.current.position.x, 0, playerRef.current.position.z - 10);
    }

    // Move road segments
    roadSegmentsRef.current.forEach((segment, idx) => {
      segment.mesh.position.z += worldSpeedRef.current;
      
      if (segment.mesh.position.z > 100) {
        sceneRef.current.remove(segment.mesh);
        roadSegmentsRef.current.splice(idx, 1);
        createRoadSegment(playerZRef.current - 500);
      }
    });

    // Spawn traffic
    if (Math.random() < 0.01) spawnTrafficVehicle();

    // Update traffic
    trafficRef.current.forEach((vehicle, idx) => {
      vehicle.position.z += worldSpeedRef.current + vehicle.userData.relativeSpeed;
      
      // Rotate wheels
      if (vehicle.userData.wheels) {
        vehicle.userData.wheels.forEach(wheel => {
          wheel.rotation.x -= (worldSpeedRef.current + vehicle.userData.relativeSpeed) * 0.1;
        });
      }
      
      if (vehicle.position.z > playerRef.current.position.z + 50) {
        sceneRef.current.remove(vehicle);
        trafficRef.current.splice(idx, 1);
        setTurboBoost(prev => Math.min(100, prev + 2));
      }

      // Collision
      if (Math.abs(vehicle.position.x - playerRef.current.position.x) < 2 &&
          Math.abs(vehicle.position.z - playerRef.current.position.z) < 4) {
        playSound('crash');
        endGame();
      }
    });

    setDistance(prev => prev + worldSpeedRef.current * 0.01);
    setScore(prev => prev + Math.floor(worldSpeedRef.current * 0.5));

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
    trafficRef.current = [];
    roadSegmentsRef.current = [];
  };

  const startGame = () => {
    setScore(0);
    setDistance(0);
    setSpeed(0);
    setTurboBoost(100);
    laneRef.current = 0;
    playerZRef.current = 0;
    worldSpeedRef.current = 0;
    gasPressedRef.current = false;
    brakePressedRef.current = false;
    setGameState('playing');
  };

  const endGame = async () => {
    setGameState('gameover');
    
    if (currentUser && currentVehicle) {
      try {
        await base44.entities.UserVehicle.update(currentVehicle.id, {
          total_distance: (currentVehicle.total_distance || 0) + distance
        });
        await base44.entities.GameScore.create({
          user_email: currentUser.email,
          game_name: 'i95-racing',
          score: score,
          duration_seconds: Math.floor(distance / worldSpeedRef.current),
          reward_earned: Math.floor(score / 50)
        });
      } catch (error) {
        console.error('Failed to save:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSettings(true)}
          className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition shadow-lg"
        >
          <Settings className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowGarage(true)}
          className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 transition shadow-lg"
        >
          <ShoppingBag className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onExit}
          className="p-3 bg-red-500 rounded-full hover:bg-red-600 transition shadow-lg"
        >
          <X className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-900/50 to-blue-900/50 backdrop-blur-xl z-10"
          >
            <div className="text-center">
              <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-7xl mb-6"
              >
                🏎️
              </motion.div>
              <motion.h2 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-6xl font-black text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600"
              >
                I-95 HIGHWAY RACING
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-300 mb-2 text-lg"
              >
                {isMobile ? '🎮 Use on-screen controls' : '⌨️ W/↑: Gas | S/↓: Brake | A/D/←/→: Change Lane'}
              </motion.p>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-cyan-400 mb-8 text-xl"
              >
                ⚡ SPACE for Turbo Boost!
              </motion.p>
              {currentVehicle && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-yellow-400 mb-8 text-lg"
                >
                  🚗 Driving: {currentVehicle.vehicle_name}
                </motion.p>
              )}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
              >
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 px-12 py-8 text-2xl shadow-2xl">
                  <Play className="w-8 h-8 mr-3" />
                  START RACING
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-10"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.8 }}
              >
                <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8" />
              </motion.div>
              <motion.h3 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-6xl font-bold text-white mb-6"
              >
                RACE COMPLETE!
              </motion.h3>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-2xl p-8 mb-8 border-2 border-cyan-500/30"
              >
                <p className="text-gray-300 text-xl mb-3">Final Score</p>
                <p className="text-7xl font-black text-cyan-400 mb-4">{score}</p>
                <p className="text-yellow-400 text-2xl">🛣️ Distance: {Math.floor(distance)}mi</p>
              </motion.div>
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 px-10 py-7 text-xl">
                  RACE AGAIN
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={mountRef} className="w-full h-full" />

      {gameState === 'playing' && (
        <>
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md rounded-2xl p-5 border border-cyan-500/30"
          >
            <div className="text-white space-y-3">
              <div className="text-sm font-bold">Score: <span className="text-cyan-400 text-xl">{score}</span></div>
              <div className="text-sm font-bold">Distance: <span className="text-yellow-400 text-xl">{Math.floor(distance)}mi</span></div>
              <div className="text-sm font-bold">Speed: <span className="text-green-400 text-xl">{speed}mph</span></div>
              <div className="text-sm font-bold">Turbo:</div>
              <div className="w-36 h-3 bg-gray-700 rounded-full overflow-hidden border border-yellow-500/30">
                <motion.div 
                  animate={{ width: `${turboBoost}%` }}
                  className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"
                />
              </div>
            </div>
          </motion.div>

          {isMobile && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-6 left-0 right-0 z-20 px-4"
            >
              <div className="flex justify-between items-center gap-3">
                <div className="flex flex-col gap-3">
                  <Button 
                    onTouchStart={() => laneRef.current = Math.max(-1, laneRef.current - 1)}
                    className="bg-cyan-600 hover:bg-cyan-700 h-16 px-10 text-3xl font-bold shadow-xl"
                  >
                    ←
                  </Button>
                  <Button 
                    onTouchStart={() => laneRef.current = Math.min(1, laneRef.current + 1)}
                    className="bg-cyan-600 hover:bg-cyan-700 h-16 px-10 text-3xl font-bold shadow-xl"
                  >
                    →
                  </Button>
                </div>
                <div className="flex flex-col gap-3">
                  <Button 
                    onTouchStart={() => gasPressedRef.current = true}
                    onTouchEnd={() => gasPressedRef.current = false}
                    className="bg-green-600 hover:bg-green-700 h-16 px-8 text-lg font-bold shadow-xl"
                  >
                    ⛽ GAS
                  </Button>
                  <Button 
                    onTouchStart={() => brakePressedRef.current = true}
                    onTouchEnd={() => brakePressedRef.current = false}
                    className="bg-red-600 hover:bg-red-700 h-16 px-8 text-lg font-bold shadow-xl"
                  >
                    🛑 BRAKE
                  </Button>
                </div>
                <Button 
                  onClick={() => {
                    if (turboBoost >= 20) {
                      gasPressedRef.current = true;
                      setTurboBoost(prev => Math.max(0, prev - 20));
                      playSound('turbo');
                      setTimeout(() => gasPressedRef.current = false, 1000);
                    }
                  }}
                  disabled={turboBoost < 20}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 h-16 px-6 shadow-xl"
                >
                  <Zap className="w-10 h-10" />
                </Button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {showGarage && (
        <VehicleGarage
          currentUser={currentUser}
          onClose={() => {
            setShowGarage(false);
            loadCurrentVehicle();
          }}
        />
      )}

      <GameSettings 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        gameName="i95-racing"
        onSettingsChange={setSettings}
      />
    </div>
  );
}