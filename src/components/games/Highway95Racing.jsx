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
  const sceneryRef = useRef([]);
  const laneRef = useRef(0);
  const gasPressedRef = useRef(false);
  const brakePressedRef = useRef(false);
  const worldSpeedRef = useRef(0);
  const goodDrivingRef = useRef(0);

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
        case 'pass': oscillator.frequency.value = 600; gainNode.gain.value = 0.1; break;
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  const createVehicle = (type, color) => {
    const group = new THREE.Group();
    const colorNum = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
    
    if (type === 'motorcycle' || type === 'dirt_bike') {
      const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.5, 8, 16);
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: colorNum, metalness: 0.7, roughness: 0.3 });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.8;
      body.rotation.z = Math.PI / 2;
      body.castShadow = true;
      group.add(body);
      
      const wheelGeometry = new THREE.TorusGeometry(0.35, 0.15, 16, 32);
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
      [0.7, -0.7].forEach(z => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(0, 0.35, z);
        wheel.rotation.y = Math.PI / 2;
        wheel.castShadow = true;
        group.add(wheel);
        group.userData.wheels = group.userData.wheels || [];
        group.userData.wheels.push(wheel);
      });
    } else if (type === '18_wheeler') {
      const cabGeometry = new THREE.BoxGeometry(2.8, 2.8, 3.5);
      const cabMaterial = new THREE.MeshStandardMaterial({ color: colorNum, metalness: 0.6, roughness: 0.4 });
      const cab = new THREE.Mesh(cabGeometry, cabMaterial);
      cab.position.y = 1.4;
      cab.castShadow = true;
      group.add(cab);
      
      const trailerGeometry = new THREE.BoxGeometry(2.8, 3.2, 10);
      const trailerMaterial = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.5, roughness: 0.5 });
      const trailer = new THREE.Mesh(trailerGeometry, trailerMaterial);
      trailer.position.set(0, 1.6, -7);
      trailer.castShadow = true;
      group.add(trailer);
      
      const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
      group.userData.wheels = [];
      [2, 0, -2, -5, -7, -9].forEach((z, i) => {
        [-1.5, 1.5].forEach(x => {
          const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
          wheel.position.set(x, 0.5, z);
          wheel.rotation.z = Math.PI / 2;
          wheel.castShadow = true;
          group.add(wheel);
          group.userData.wheels.push(wheel);
        });
      });
    } else {
      // Modern sports car
      const bodyLower = new THREE.BoxGeometry(2.2, 0.8, 4.8);
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: colorNum, metalness: 0.8, roughness: 0.2 });
      const lower = new THREE.Mesh(bodyLower, bodyMaterial);
      lower.position.y = 0.4;
      lower.castShadow = true;
      group.add(lower);
      
      const cabinGeometry = new THREE.BoxGeometry(1.9, 0.9, 2.5);
      const cabin = new THREE.Mesh(cabinGeometry, bodyMaterial);
      cabin.position.set(0, 1.1, -0.3);
      cabin.castShadow = true;
      group.add(cabin);
      
      const hoodGeometry = new THREE.BoxGeometry(2, 0.4, 1.5);
      const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
      hood.position.set(0, 0.7, 2);
      hood.rotation.x = -0.15;
      group.add(hood);
      
      const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.7, metalness: 0.9, roughness: 0.1 });
      const windshield = new THREE.BoxGeometry(1.8, 0.8, 1.8);
      const windshieldMesh = new THREE.Mesh(windshield, windowMaterial);
      windshieldMesh.position.set(0, 1.1, 0.5);
      windshieldMesh.rotation.x = -0.1;
      group.add(windshieldMesh);
      
      const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 20);
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8 });
      const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
      
      group.userData.wheels = [];
      [[-1.2, 1.8], [1.2, 1.8], [-1.2, -1.8], [1.2, -1.8]].forEach(([x, z]) => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(x, 0.4, z);
        wheel.rotation.z = Math.PI / 2;
        wheel.castShadow = true;
        
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.12, 8, 16), tireMaterial);
        tire.position.set(x, 0.4, z);
        tire.rotation.y = Math.PI / 2;
        
        group.add(wheel, tire);
        group.userData.wheels.push(wheel);
      });
      
      const headlightGeometry = new THREE.SphereGeometry(0.18, 12, 12);
      const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffee });
      [-0.8, 0.8].forEach(x => {
        const light = new THREE.Mesh(headlightGeometry, headlightMaterial);
        light.position.set(x, 0.6, 2.5);
        group.add(light);
      });
    }
    
    return group;
  };

  const initThreeJS = () => {
    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x87ceeb);
    scene.background = skyColor;
    scene.fog = new THREE.Fog(0x87ceeb, 100, 400);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 6, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    // Create road
    for (let i = 0; i < 30; i++) {
      createRoadSegment(-i * 40);
    }

    // Player vehicle
    const player = createVehicle(currentVehicle?.vehicle_type || 'car', currentVehicle?.color || '#3b82f6');
    player.position.set(0, 0, 0);
    scene.add(player);
    playerRef.current = player;

    // Add scenery
    addScenery();

    handleControls();
    animate();
  };

  const createRoadSegment = (zPos) => {
    const roadWidth = 16;
    const segmentLength = 40;
    
    const roadGeometry = new THREE.PlaneGeometry(roadWidth, segmentLength);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, zPos);
    road.receiveShadow = true;
    sceneRef.current.add(road);
    roadSegmentsRef.current.push(road);
    
    // Lane markings
    for (let i = 0; i < 8; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.25, 0.02, 3);
      const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      
      [-4, 4].forEach(x => {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(x, 0.02, zPos - i * 5);
        sceneRef.current.add(line);
        roadSegmentsRef.current.push(line);
      });
    }
    
    // Road edges
    [-8.5, 8.5].forEach(x => {
      const edgeGeometry = new THREE.BoxGeometry(1, 0.3, segmentLength);
      const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
      const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edge.position.set(x, 0.15, zPos);
      sceneRef.current.add(edge);
      roadSegmentsRef.current.push(edge);
    });
  };

  const addScenery = () => {
    for (let i = 0; i < 60; i++) {
      const z = -i * 25;
      [-1, 1].forEach(side => {
        if (Math.random() > 0.2) {
          const isBigCity = i % 10 < 5;
          const height = isBigCity ? 15 + Math.random() * 40 : 5 + Math.random() * 15;
          const width = 4 + Math.random() * 6;
          
          const building = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, width),
            new THREE.MeshStandardMaterial({ color: isBigCity ? 0x505050 : 0x8b7355, metalness: 0.3, roughness: 0.7 })
          );
          building.position.set(side * (12 + Math.random() * 8), height / 2, z);
          building.castShadow = true;
          building.receiveShadow = true;
          sceneRef.current.add(building);
          sceneryRef.current.push(building);
        }
        
        if (Math.random() > 0.5) {
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.5, 5),
            new THREE.MeshStandardMaterial({ color: 0x654321 })
          );
          trunk.position.set(side * (10 + Math.random() * 2), 2.5, z);
          trunk.castShadow = true;
          
          const leaves = new THREE.Mesh(
            new THREE.SphereGeometry(2.5, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0x228b22 })
          );
          leaves.position.set(side * (10 + Math.random() * 2), 6, z);
          leaves.castShadow = true;
          
          sceneRef.current.add(trunk, leaves);
          sceneryRef.current.push(trunk, leaves);
        }
      });
    }
  };

  const spawnTrafficVehicle = () => {
    const types = ['car', 'suv', '18_wheeler', 'police', 'motorcycle'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3) - 1;
    const colors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0xffffff, 0x808080];
    const color = type === 'police' ? 0x000000 : colors[Math.floor(Math.random() * colors.length)];
    
    const vehicle = createVehicle(type, color);
    vehicle.position.set(lane * 5, 0, -150);
    vehicle.userData.lane = lane;
    vehicle.userData.speed = 0.5 + Math.random() * 1.5;
    vehicle.userData.type = type;
    
    if (type === 'police') {
      const light1 = new THREE.PointLight(0xff0000, 3, 15);
      light1.position.set(-0.6, 2, 0);
      const light2 = new THREE.PointLight(0x0000ff, 3, 15);
      light2.position.set(0.6, 2, 0);
      vehicle.add(light1, light2);
      vehicle.userData.lights = [light1, light2];
    }
    
    if (Math.random() > 0.7) {
      vehicle.userData.veering = true;
      vehicle.userData.veerPhase = Math.random() * Math.PI * 2;
    }
    
    sceneRef.current.add(vehicle);
    trafficRef.current.push(vehicle);
  };

  const spawnHazard = (type) => {
    const lane = Math.floor(Math.random() * 3) - 1;
    let hazard;
    
    if (type === 'deer') {
      const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1, 8, 16);
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b6914 });
      hazard = new THREE.Mesh(bodyGeometry, bodyMaterial);
      hazard.position.set(lane * 5, 0.8, -120);
      hazard.rotation.z = Math.PI / 2;
      hazard.userData.speed = Math.random() * 0.5;
      hazard.userData.crossing = true;
    } else if (type === 'cone') {
      const coneGeometry = new THREE.ConeGeometry(0.4, 1.5, 8);
      const coneMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.3 });
      hazard = new THREE.Mesh(coneGeometry, coneMaterial);
      hazard.position.set(lane * 5, 0.75, -120);
      hazard.userData.speed = 0;
    }
    
    if (hazard) {
      hazard.castShadow = true;
      hazard.userData.type = type;
      sceneRef.current.add(hazard);
      trafficRef.current.push(hazard);
    }
  };

  const handleControls = () => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') laneRef.current = Math.max(-1, laneRef.current - 1);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') laneRef.current = Math.min(1, laneRef.current + 1);
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') gasPressedRef.current = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') brakePressedRef.current = true;
      if (e.key === ' ') {
        e.preventDefault();
        if (turboBoost >= 20) {
          setTurboBoost(prev => Math.max(0, prev - 20));
          worldSpeedRef.current = Math.min(worldSpeedRef.current * 1.8, 20);
          playSound('turbo');
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

    const maxSpeed = (currentVehicle?.top_speed || 120) / 12;
    const acceleration = (currentVehicle?.acceleration || 5) / 40;

    if (gasPressedRef.current) {
      worldSpeedRef.current = Math.min(maxSpeed, worldSpeedRef.current + acceleration);
    } else if (brakePressedRef.current) {
      worldSpeedRef.current = Math.max(0, worldSpeedRef.current - 0.25);
    } else {
      worldSpeedRef.current = Math.max(2, worldSpeedRef.current - 0.03);
    }

    setSpeed(Math.floor(worldSpeedRef.current * 8));

    // Move player between lanes smoothly
    const targetX = laneRef.current * 5;
    if (playerRef.current) {
      const handling = (currentVehicle?.handling || 7) / 50;
      playerRef.current.position.x += (targetX - playerRef.current.position.x) * handling;
      playerRef.current.rotation.y = (targetX - playerRef.current.position.x) * 0.05;
      
      if (playerRef.current.userData.wheels) {
        playerRef.current.userData.wheels.forEach(wheel => {
          wheel.rotation.x -= worldSpeedRef.current * 0.15;
        });
      }
    }

    // Update camera
    if (cameraRef.current && playerRef.current) {
      cameraRef.current.position.x += (playerRef.current.position.x - cameraRef.current.position.x) * 0.1;
      cameraRef.current.position.z = playerRef.current.position.z + 10 + worldSpeedRef.current * 0.4;
      cameraRef.current.position.y = 6 + worldSpeedRef.current * 0.15;
      cameraRef.current.lookAt(playerRef.current.position.x, 1, playerRef.current.position.z - 15);
    }

    // Move road
    roadSegmentsRef.current.forEach((segment, idx) => {
      segment.position.z += worldSpeedRef.current;
      
      if (segment.position.z > 60) {
        const minZ = Math.min(...roadSegmentsRef.current.map(s => s.position.z));
        segment.position.z = minZ - 40;
      }
    });

    // Spawn traffic/hazards
    if (Math.random() < 0.015) spawnTrafficVehicle();
    if (Math.random() < 0.003) spawnHazard(Math.random() > 0.5 ? 'deer' : 'cone');

    // Update traffic
    trafficRef.current.forEach((vehicle, idx) => {
      vehicle.position.z += worldSpeedRef.current - (vehicle.userData.speed || 0);
      
      if (vehicle.userData.veering) {
        vehicle.userData.veerPhase = (vehicle.userData.veerPhase || 0) + 0.03;
        vehicle.position.x += Math.sin(vehicle.userData.veerPhase) * 0.05;
      }
      
      if (vehicle.userData.crossing) {
        vehicle.position.x += vehicle.userData.speed * 0.3 * (vehicle.position.x < 0 ? 1 : -1);
      }
      
      if (vehicle.userData.wheels) {
        vehicle.userData.wheels.forEach(wheel => {
          wheel.rotation.x -= worldSpeedRef.current * 0.15;
        });
      }
      
      if (vehicle.userData.lights) {
        const flash = Math.floor(Date.now() / 250) % 2;
        vehicle.userData.lights[0].visible = flash === 0;
        vehicle.userData.lights[1].visible = flash === 1;
      }
      
      if (vehicle.position.z > 40) {
        sceneRef.current.remove(vehicle);
        trafficRef.current.splice(idx, 1);
        goodDrivingRef.current++;
        playSound('pass');
        
        if (goodDrivingRef.current % 8 === 0) {
          setTurboBoost(prev => Math.min(100, prev + 15));
          toast.success('Turbo recharged! ⚡', { duration: 1000 });
        }
      }

      const dx = Math.abs(vehicle.position.x - playerRef.current.position.x);
      const dz = Math.abs(vehicle.position.z - playerRef.current.position.z);
      if (dx < 2.5 && dz < 5) {
        playSound('crash');
        endGame();
      }
    });

    setDistance(prev => prev + worldSpeedRef.current * 0.015);
    setScore(prev => prev + Math.floor(worldSpeedRef.current * 0.8));

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
    trafficRef.current = [];
    roadSegmentsRef.current = [];
    sceneryRef.current = [];
  };

  const startGame = () => {
    setScore(0);
    setDistance(0);
    setSpeed(0);
    setTurboBoost(100);
    laneRef.current = 0;
    worldSpeedRef.current = 2;
    gasPressedRef.current = false;
    brakePressedRef.current = false;
    goodDrivingRef.current = 0;
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
          duration_seconds: Math.floor(distance * 2),
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
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(true)} className="p-3 bg-gray-700/80 backdrop-blur-sm rounded-full hover:bg-gray-600 transition shadow-lg">
          <Settings className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowGarage(true)} className="p-3 bg-purple-600/80 backdrop-blur-sm rounded-full hover:bg-purple-700 transition shadow-lg">
          <ShoppingBag className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onExit} className="p-3 bg-red-500/80 backdrop-blur-sm rounded-full hover:bg-red-600 transition shadow-lg">
          <X className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.5 }} className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-900/60 via-blue-900/60 to-purple-900/40 backdrop-blur-xl z-10">
            <div className="text-center px-4">
              <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, type: "spring" }} className="text-8xl mb-6">🏎️</motion.div>
              <motion.h2 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-2xl">I-95 HIGHWAY RACING</motion.h2>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-8 space-y-2">
                <p className="text-white text-lg md:text-xl">{isMobile ? '🎮 On-screen controls' : '⌨️ W/↑: Gas • S/↓: Brake • A/D/←/→: Lane'}</p>
                <p className="text-cyan-300 text-xl md:text-2xl font-bold">⚡ SPACE for Turbo!</p>
                {currentVehicle && <p className="text-yellow-400 text-lg">🚗 {currentVehicle.vehicle_name}</p>}
              </motion.div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }}>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 px-12 py-8 text-xl md:text-2xl shadow-2xl">
                  <Play className="w-8 h-8 mr-3" />
                  START RACING
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-10">
            <div className="text-center px-4">
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", duration: 0.8 }}>
                <Trophy className="w-24 h-24 md:w-32 md:h-32 text-yellow-400 mx-auto mb-8" />
              </motion.div>
              <motion.h3 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-4xl md:text-6xl font-bold text-white mb-6">RACE COMPLETE!</motion.h3>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }} className="bg-gradient-to-r from-cyan-600/30 to-blue-600/30 rounded-3xl p-8 mb-8 border-2 border-cyan-400/50 backdrop-blur-sm">
                <p className="text-gray-200 text-xl mb-3">Final Score</p>
                <p className="text-6xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">{score}</p>
                <p className="text-yellow-400 text-xl md:text-2xl">🛣️ {Math.floor(distance)} miles driven</p>
              </motion.div>
              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 px-10 py-7 text-xl">RACE AGAIN</Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={mountRef} className="w-full h-full" />

      {gameState === 'playing' && (
        <>
          <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-cyan-500/40">
            <div className="text-white space-y-2">
              <div className="text-xs md:text-sm font-bold">Score: <span className="text-cyan-400 text-lg md:text-xl">{score}</span></div>
              <div className="text-xs md:text-sm font-bold">Distance: <span className="text-yellow-400 text-lg md:text-xl">{Math.floor(distance)}mi</span></div>
              <div className="text-xs md:text-sm font-bold">Speed: <span className="text-green-400 text-lg md:text-xl">{speed}mph</span></div>
              <div className="text-xs md:text-sm font-bold">Turbo:</div>
              <div className="w-28 md:w-36 h-2 md:h-3 bg-gray-800 rounded-full overflow-hidden border border-yellow-500/40">
                <motion.div animate={{ width: `${turboBoost}%` }} className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" />
              </div>
            </div>
          </motion.div>

          {isMobile && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-6 left-0 right-0 z-20 px-3">
              <div className="flex justify-center items-end gap-3">
                <div className="flex flex-col gap-2">
                  <Button onTouchStart={() => laneRef.current = Math.max(-1, laneRef.current - 1)} className="bg-cyan-600/90 backdrop-blur-sm hover:bg-cyan-700 h-14 w-14 text-2xl font-bold shadow-xl">←</Button>
                  <Button onTouchStart={() => laneRef.current = Math.min(1, laneRef.current + 1)} className="bg-cyan-600/90 backdrop-blur-sm hover:bg-cyan-700 h-14 w-14 text-2xl font-bold shadow-xl">→</Button>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onTouchStart={() => gasPressedRef.current = true} onTouchEnd={() => gasPressedRef.current = false} className="bg-green-600/90 backdrop-blur-sm hover:bg-green-700 h-14 px-6 text-sm font-bold shadow-xl">⛽<br/>GAS</Button>
                  <Button onTouchStart={() => brakePressedRef.current = true} onTouchEnd={() => brakePressedRef.current = false} className="bg-red-600/90 backdrop-blur-sm hover:bg-red-700 h-14 px-6 text-sm font-bold shadow-xl">🛑<br/>BRAKE</Button>
                </div>
                <Button onClick={() => { if (turboBoost >= 20) { setTurboBoost(prev => Math.max(0, prev - 20)); worldSpeedRef.current = Math.min(worldSpeedRef.current * 1.8, 20); playSound('turbo'); }}} disabled={turboBoost < 20} className="bg-yellow-600/90 backdrop-blur-sm hover:bg-yellow-700 disabled:opacity-50 h-14 w-14 shadow-xl"><Zap className="w-8 h-8" /></Button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {showGarage && <VehicleGarage currentUser={currentUser} onClose={() => { setShowGarage(false); loadCurrentVehicle(); }} />}
      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} gameName="i95-racing" onSettingsChange={setSettings} />
    </div>
  );
}