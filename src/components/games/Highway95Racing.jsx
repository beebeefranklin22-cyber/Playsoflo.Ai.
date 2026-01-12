import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import * as THREE from "three";
import VehicleGarage from "./VehicleGarage";

export default function Highway95Racing({ currentUser, onExit }) {
  const mountRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [turboBoost, setTurboBoost] = useState(100);
  const [showGarage, setShowGarage] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const playerRef = useRef(null);
  const trafficRef = useRef([]);
  const hazardsRef = useRef([]);
  const laneRef = useRef(1); // 0, 1, 2 (3 lanes)
  const gasPressedRef = useRef(false);
  const brakePressedRef = useRef(false);
  const sceneryRef = useRef('urban');
  const sceneryChangeRef = useRef(0);
  const goodDrivingRef = useRef(0);
  const startTimeRef = useRef(null);

  // Sound effects
  const soundsRef = useRef({
    engine: null,
    brake: null,
    crash: null,
    turbo: null,
    horn: null
  });

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
        // Create default car
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
      initSounds();
      return () => cleanupThreeJS();
    }
  }, [gameState, currentVehicle]);

  const initSounds = () => {
    // Create audio context for sound effects
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      soundsRef.current.context = audioCtx;
    } catch (e) {
      console.log('Web Audio API not supported');
    }
  };

  const playSound = (type) => {
    // Simple beep sounds using oscillator
    if (!soundsRef.current.context) return;
    
    const oscillator = soundsRef.current.context.createOscillator();
    const gainNode = soundsRef.current.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(soundsRef.current.context.destination);
    
    switch(type) {
      case 'crash':
        oscillator.frequency.value = 100;
        gainNode.gain.value = 0.3;
        break;
      case 'turbo':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.2;
        break;
      case 'horn':
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.15;
        break;
    }
    
    oscillator.start();
    oscillator.stop(soundsRef.current.context.currentTime + 0.1);
  };

  const initThreeJS = () => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 50, 500);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setClearColor(0x87ceeb);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Highway road
    const roadGeometry = new THREE.PlaneGeometry(30, 1000);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.8
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.receiveShadow = true;
    scene.add(road);

    // Lane markings
    for (let i = 0; i < 100; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.3, 0.05, 5);
      const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      
      // Left lane line
      const line1 = new THREE.Mesh(lineGeometry, lineMaterial);
      line1.position.set(-7.5, 0.1, -i * 12);
      scene.add(line1);
      
      // Right lane line
      const line2 = new THREE.Mesh(lineGeometry, lineMaterial);
      line2.position.set(7.5, 0.1, -i * 12);
      scene.add(line2);
    }

    // Player vehicle
    const vehicleColor = currentVehicle?.color || '#3b82f6';
    const vehicleType = currentVehicle?.vehicle_type || 'car';
    const player = createVehicle(vehicleType, vehicleColor);
    player.position.set(0, 1, 10);
    scene.add(player);
    playerRef.current = player;

    // Scenery
    createScenery(scene, 'urban');

    animate();
    handleControls();
  };

  const createVehicle = (type, color) => {
    const group = new THREE.Group();
    
    if (type === 'motorcycle' || type === 'dirt_bike') {
      // Motorcycle body
      const bodyGeometry = new THREE.BoxGeometry(0.8, 1, 2);
      const bodyMaterial = new THREE.MeshPhongMaterial({ color: color });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.5;
      body.castShadow = true;
      group.add(body);
      
      // Wheels
      const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
      const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
      const wheel1 = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel1.position.set(0, 0.4, 0.8);
      wheel1.rotation.z = Math.PI / 2;
      const wheel2 = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel2.position.set(0, 0.4, -0.8);
      wheel2.rotation.z = Math.PI / 2;
      group.add(wheel1, wheel2);
    } else if (type === '18_wheeler') {
      // Truck cab
      const cabGeometry = new THREE.BoxGeometry(3, 2.5, 4);
      const cabMaterial = new THREE.MeshPhongMaterial({ color: color });
      const cab = new THREE.Mesh(cabGeometry, cabMaterial);
      cab.position.set(0, 1.25, 4);
      cab.castShadow = true;
      group.add(cab);
      
      // Trailer
      const trailerGeometry = new THREE.BoxGeometry(2.8, 3, 12);
      const trailerMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
      const trailer = new THREE.Mesh(trailerGeometry, trailerMaterial);
      trailer.position.set(0, 1.5, -4);
      trailer.castShadow = true;
      group.add(trailer);
      
      // Wheels
      for (let i = 0; i < 6; i++) {
        const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(i % 2 === 0 ? -1.5 : 1.5, 0.6, 2 - i * 2.5);
        wheel.rotation.z = Math.PI / 2;
        group.add(wheel);
      }
    } else {
      // Standard car
      const bodyGeometry = new THREE.BoxGeometry(2, 1.5, 4);
      const bodyMaterial = new THREE.MeshPhongMaterial({ color: color, metalness: 0.5 });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.75;
      body.castShadow = true;
      group.add(body);
      
      // Roof
      const roofGeometry = new THREE.BoxGeometry(1.8, 0.8, 2.5);
      const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
      roof.position.set(0, 1.55, -0.3);
      roof.castShadow = true;
      group.add(roof);
      
      // Windows
      const windowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x222222, 
        transparent: true, 
        opacity: 0.7 
      });
      const windowGeometry = new THREE.BoxGeometry(1.7, 0.7, 2.4);
      const windows = new THREE.Mesh(windowGeometry, windowMaterial);
      windows.position.set(0, 1.55, -0.3);
      group.add(windows);
      
      // Wheels
      const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
      const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
      [-1, 1].forEach(x => {
        [-1.2, 1.2].forEach(z => {
          const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
          wheel.position.set(x * 1.1, 0.5, z);
          wheel.rotation.z = Math.PI / 2;
          wheel.castShadow = true;
          group.add(wheel);
        });
      });
    }
    
    return group;
  };

  const createScenery = (scene, type) => {
    // Clear old scenery
    scene.children = scene.children.filter(child => !child.userData.scenery);
    
    const colors = {
      urban: { building: 0x808080, tree: 0x228b22 },
      suburban: { building: 0xa0a0a0, tree: 0x2f4f2f },
      rural: { building: 0x8b4513, tree: 0x006400 }
    };
    
    const palette = colors[type] || colors.urban;
    
    // Buildings/Trees on sides
    for (let i = 0; i < 30; i++) {
      const z = -i * 40;
      
      [-1, 1].forEach(side => {
        if (Math.random() > 0.3) {
          const height = 5 + Math.random() * (type === 'urban' ? 25 : 10);
          const width = 3 + Math.random() * 5;
          const geometry = new THREE.BoxGeometry(width, height, width);
          const material = new THREE.MeshPhongMaterial({ color: palette.building });
          const building = new THREE.Mesh(geometry, material);
          building.position.set(side * (20 + Math.random() * 10), height / 2, z);
          building.castShadow = true;
          building.userData.scenery = true;
          scene.add(building);
        }
        
        // Trees
        if (Math.random() > 0.5) {
          const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3);
          const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
          const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
          trunk.position.set(side * (18 + Math.random() * 5), 1.5, z - 5);
          trunk.userData.scenery = true;
          
          const leavesGeometry = new THREE.SphereGeometry(2, 8, 8);
          const leavesMaterial = new THREE.MeshPhongMaterial({ color: palette.tree });
          const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
          leaves.position.set(side * (18 + Math.random() * 5), 4, z - 5);
          leaves.userData.scenery = true;
          
          scene.add(trunk, leaves);
        }
      });
    }
  };

  const spawnTraffic = () => {
    const types = ['car', 'suv', 'truck', 'police', 'motorcycle'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);
    const colors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff];
    const color = type === 'police' ? 0x000000 : colors[Math.floor(Math.random() * colors.length)];
    
    const vehicle = createVehicle(type === 'truck' ? '18_wheeler' : type, `#${color.toString(16).padStart(6, '0')}`);
    vehicle.position.set((lane - 1) * 7.5, 1, -100);
    vehicle.userData.lane = lane;
    vehicle.userData.speed = 0.3 + Math.random() * 0.3;
    vehicle.userData.type = type;
    
    // Police lights
    if (type === 'police') {
      const light1 = new THREE.PointLight(0xff0000, 2, 10);
      light1.position.set(-0.5, 2, 0);
      vehicle.add(light1);
      const light2 = new THREE.PointLight(0x0000ff, 2, 10);
      light2.position.set(0.5, 2, 0);
      vehicle.add(light2);
      vehicle.userData.lights = [light1, light2];
    }
    
    sceneRef.current.add(vehicle);
    trafficRef.current.push(vehicle);
  };

  const spawnHazard = () => {
    const hazards = ['deer', 'roadwork', 'sleepy_driver', 'road_rage'];
    const type = hazards[Math.floor(Math.random() * hazards.length)];
    const lane = Math.floor(Math.random() * 3);
    
    let hazard;
    
    if (type === 'deer') {
      // Simple deer representation
      const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 1.5);
      const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
      hazard = new THREE.Mesh(bodyGeometry, bodyMaterial);
      hazard.position.set((lane - 1) * 7.5, 0.6, -100);
      hazard.userData.speed = 0.1;
    } else if (type === 'roadwork') {
      // Construction cone
      const coneGeometry = new THREE.ConeGeometry(0.5, 2, 8);
      const coneMaterial = new THREE.MeshPhongMaterial({ color: 0xff6600 });
      hazard = new THREE.Mesh(coneGeometry, coneMaterial);
      hazard.position.set((lane - 1) * 7.5, 1, -100);
      hazard.userData.speed = 0;
    } else if (type === 'sleepy_driver') {
      // Veering car
      const veerCar = createVehicle('car', '#808080');
      veerCar.position.set((lane - 1) * 7.5, 1, -100);
      veerCar.userData.speed = 0.25;
      veerCar.userData.veering = true;
      veerCar.userData.veerTimer = 0;
      hazard = veerCar;
    } else {
      // Road rage - fast aggressive car
      const rageCar = createVehicle('car', '#ff0000');
      rageCar.position.set((lane - 1) * 7.5, 1, -100);
      rageCar.userData.speed = 0.8;
      rageCar.userData.aggressive = true;
      hazard = rageCar;
    }
    
    hazard.userData.type = type;
    hazard.userData.lane = lane;
    sceneRef.current.add(hazard);
    hazardsRef.current.push(hazard);
  };

  const handleControls = () => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') laneRef.current = Math.max(0, laneRef.current - 1);
      if (e.key === 'ArrowRight' || e.key === 'd') laneRef.current = Math.min(2, laneRef.current + 1);
      if (e.key === 'ArrowUp' || e.key === 'w') gasPressedRef.current = true;
      if (e.key === 'ArrowDown' || e.key === 's') brakePressedRef.current = true;
      if (e.key === ' ' && turboBoost >= 20) {
        gasPressedRef.current = true;
        setTurboBoost(prev => Math.max(0, prev - 20));
        playSound('turbo');
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') gasPressedRef.current = false;
      if (e.key === 'ArrowDown' || e.key === 's') brakePressedRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  };

  const animate = () => {
    if (gameState !== 'playing') return;

    const maxSpeed = currentVehicle?.top_speed / 10 || 12;
    const acceleration = currentVehicle?.acceleration / 100 || 0.05;

    // Handle speed
    if (gasPressedRef.current) {
      setSpeed(prev => Math.min(maxSpeed, prev + acceleration));
    } else if (brakePressedRef.current) {
      setSpeed(prev => Math.max(0, prev - 0.1));
    } else {
      setSpeed(prev => Math.max(0, prev - 0.02)); // Natural deceleration
    }

    // Move player between lanes
    const targetX = (laneRef.current - 1) * 7.5;
    if (playerRef.current) {
      playerRef.current.position.x += (targetX - playerRef.current.position.x) * 0.1;
      
      // Wheel rotation based on speed
      playerRef.current.children.forEach(child => {
        if (child.geometry?.type === 'CylinderGeometry') {
          child.rotation.x -= speed * 0.1;
        }
      });
    }

    // Camera follow
    if (cameraRef.current && playerRef.current) {
      cameraRef.current.position.z = playerRef.current.position.z + 15 - speed * 0.5;
      cameraRef.current.position.y = 8 + speed * 0.2;
    }

    // Spawn traffic
    if (Math.random() < 0.02) spawnTraffic();
    if (Math.random() < 0.005) spawnHazard();

    // Update traffic
    trafficRef.current.forEach((vehicle, idx) => {
      vehicle.position.z += speed - vehicle.userData.speed;
      
      // Police lights animation
      if (vehicle.userData.type === 'police' && vehicle.userData.lights) {
        vehicle.userData.lights[0].visible = Math.floor(Date.now() / 200) % 2 === 0;
        vehicle.userData.lights[1].visible = Math.floor(Date.now() / 200) % 2 === 1;
      }
      
      // Remove off-screen
      if (vehicle.position.z > 20) {
        sceneRef.current.remove(vehicle);
        trafficRef.current.splice(idx, 1);
        goodDrivingRef.current++;
        
        // Reward turbo for good driving
        if (goodDrivingRef.current % 5 === 0) {
          setTurboBoost(prev => Math.min(100, prev + 10));
        }
      }

      // Collision detection
      if (playerRef.current && 
          Math.abs(vehicle.position.x - playerRef.current.position.x) < 2 &&
          Math.abs(vehicle.position.z - playerRef.current.position.z) < 4) {
        playSound('crash');
        endGame();
      }
    });

    // Update hazards
    hazardsRef.current.forEach((hazard, idx) => {
      hazard.position.z += speed - hazard.userData.speed;
      
      // Veering sleepy driver
      if (hazard.userData.veering) {
        hazard.userData.veerTimer += 0.05;
        hazard.position.x += Math.sin(hazard.userData.veerTimer) * 0.1;
      }
      
      if (hazard.position.z > 20) {
        sceneRef.current.remove(hazard);
        hazardsRef.current.splice(idx, 1);
      }

      // Collision
      if (playerRef.current &&
          Math.abs(hazard.position.x - playerRef.current.position.x) < 2 &&
          Math.abs(hazard.position.z - playerRef.current.position.z) < 4) {
        playSound('crash');
        endGame();
      }
    });

    // Change scenery
    sceneryChangeRef.current++;
    if (sceneryChangeRef.current > 1000) {
      const types = ['urban', 'suburban', 'rural'];
      const newScenery = types[Math.floor(Math.random() * types.length)];
      if (newScenery !== sceneryRef.current) {
        sceneryRef.current = newScenery;
        createScenery(sceneRef.current, newScenery);
        toast.success(`Entering ${newScenery} area 🏙️`);
      }
      sceneryChangeRef.current = 0;
    }

    setDistance(prev => prev + speed * 0.1);
    setScore(prev => prev + Math.floor(speed * 0.1));

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
    trafficRef.current = [];
    hazardsRef.current = [];
  };

  const startGame = () => {
    setScore(0);
    setDistance(0);
    setSpeed(0);
    setTurboBoost(100);
    laneRef.current = 1;
    gasPressedRef.current = false;
    brakePressedRef.current = false;
    goodDrivingRef.current = 0;
    sceneryChangeRef.current = 0;
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const endGame = async () => {
    setGameState('gameover');

    if (!currentUser || !currentVehicle) return;

    try {
      // Update vehicle distance
      await base44.entities.UserVehicle.update(currentVehicle.id, {
        total_distance: (currentVehicle.total_distance || 0) + distance
      });

      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'i95-racing',
        score: score,
        duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        reward_earned: Math.floor(score / 50)
      });

      toast.success(`🏁 Race Complete!`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button onClick={() => setShowGarage(true)} className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 transition">
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
              <div className="text-7xl mb-4">🏎️</div>
              <h2 className="text-5xl font-bold text-white mb-3">I-95 Highway Racing</h2>
              <p className="text-gray-300 mb-2">{isMobile ? 'Use on-screen controls' : 'Arrow Keys / WASD to drive'}</p>
              <p className="text-cyan-400 mb-6">Space for Turbo Boost!</p>
              {currentVehicle && (
                <p className="text-yellow-400 mb-6">Driving: {currentVehicle.vehicle_name}</p>
              )}
              <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 px-10 py-7 text-xl">
                <Play className="w-6 h-6 mr-3" />
                Start Racing
              </Button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="text-center">
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
              <h3 className="text-5xl font-bold text-white mb-4">Race Complete!</h3>
              <div className="bg-cyan-600/20 rounded-xl p-6 mb-6">
                <p className="text-gray-300 text-lg mb-2">Final Score</p>
                <p className="text-6xl font-bold text-cyan-400">{score}</p>
                <p className="text-yellow-400 mt-2">Distance: {Math.floor(distance)}mi</p>
              </div>
              <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-6 text-lg">
                Race Again
              </Button>
            </div>
          )}
        </div>
      )}

      <div ref={mountRef} className="w-full h-full" />

      {gameState === 'playing' && (
        <>
          <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-sm rounded-xl p-4">
            <div className="text-white space-y-2">
              <div className="text-sm">Score: <span className="font-bold text-cyan-400">{score}</span></div>
              <div className="text-sm">Distance: <span className="font-bold text-yellow-400">{Math.floor(distance)}mi</span></div>
              <div className="text-sm">Speed: <span className="font-bold text-green-400">{Math.floor(speed * 10)}mph</span></div>
              <div className="text-sm">
                Turbo: 
                <div className="w-32 h-2 bg-gray-700 rounded-full mt-1">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all"
                    style={{ width: `${turboBoost}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {isMobile && (
            <div className="absolute bottom-4 left-0 right-0 z-20 px-4">
              <div className="flex justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <Button 
                    onTouchStart={() => laneRef.current = Math.max(0, laneRef.current - 1)}
                    className="bg-cyan-600 h-16 px-8 text-2xl"
                  >
                    ←
                  </Button>
                  <Button 
                    onTouchStart={() => laneRef.current = Math.min(2, laneRef.current + 1)}
                    className="bg-cyan-600 h-16 px-8 text-2xl"
                  >
                    →
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    onTouchStart={() => gasPressedRef.current = true}
                    onTouchEnd={() => gasPressedRef.current = false}
                    className="bg-green-600 h-16 px-8 text-xl"
                  >
                    ⛽ GAS
                  </Button>
                  <Button 
                    onTouchStart={() => brakePressedRef.current = true}
                    onTouchEnd={() => brakePressedRef.current = false}
                    className="bg-red-600 h-16 px-8 text-xl"
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
                  className="bg-yellow-600 h-16 px-6"
                >
                  <Zap className="w-8 h-8" />
                  TURBO
                </Button>
              </div>
            </div>
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
    </div>
  );
}