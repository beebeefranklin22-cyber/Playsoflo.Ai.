import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import * as THREE from "three";

export default function SoFloRunner({ currentUser, onExit }) {
  const mountRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const sceneRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (gameState !== 'playing') return;

    // Three.js setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 10, 50);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Player (runner)
    const playerGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const playerMaterial = new THREE.MeshLambertMaterial({ color: 0xa855f7 });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 0.5, 0);
    scene.add(player);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(10, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x00cc88 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Obstacles
    const obstacles = [];
    for (let i = 0; i < 10; i++) {
      const obstacleGeometry = new THREE.BoxGeometry(1, 2, 1);
      const obstacleMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
      const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
      obstacle.position.set(
        (Math.random() - 0.5) * 4,
        1,
        -10 - i * 10
      );
      scene.add(obstacle);
      obstacles.push(obstacle);
    }

    // Coins
    const coins = [];
    for (let i = 0; i < 15; i++) {
      const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
      const coinMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
      const coin = new THREE.Mesh(coinGeometry, coinMaterial);
      coin.position.set(
        (Math.random() - 0.5) * 4,
        1,
        -5 - i * 7
      );
      coin.rotation.x = Math.PI / 2;
      scene.add(coin);
      coins.push(coin);
    }

    let playerLane = 0; // -1 left, 0 center, 1 right
    let gameSpeed = 0.1;
    let currentDistance = 0;
    let gameActive = true;

    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' && playerLane > -1) {
        playerLane--;
        player.position.x = playerLane * 2;
      }
      if (e.key === 'ArrowRight' && playerLane < 1) {
        playerLane++;
        player.position.x = playerLane * 2;
      }
      if (e.key === ' ') {
        // Jump (simplified)
        if (player.position.y <= 0.5) {
          let jumpHeight = 0;
          const jumpInterval = setInterval(() => {
            if (jumpHeight < 2) {
              player.position.y += 0.1;
              jumpHeight += 0.1;
            } else {
              clearInterval(jumpInterval);
              const fallInterval = setInterval(() => {
                if (player.position.y > 0.5) {
                  player.position.y -= 0.1;
                } else {
                  player.position.y = 0.5;
                  clearInterval(fallInterval);
                }
              }, 20);
            }
          }, 20);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    const animate = () => {
      if (!gameActive) return;

      requestAnimationFrame(animate);

      // Move obstacles
      obstacles.forEach(obstacle => {
        obstacle.position.z += gameSpeed;
        if (obstacle.position.z > 5) {
          obstacle.position.z = -50;
          obstacle.position.x = (Math.random() - 0.5) * 4;
        }

        // Collision detection
        if (Math.abs(obstacle.position.z - player.position.z) < 1 &&
            Math.abs(obstacle.position.x - player.position.x) < 1 &&
            player.position.y < 1.5) {
          gameActive = false;
          endGame(currentDistance);
        }
      });

      // Move coins
      coins.forEach(coin => {
        coin.position.z += gameSpeed;
        coin.rotation.y += 0.05;
        if (coin.position.z > 5) {
          coin.position.z = -50;
          coin.position.x = (Math.random() - 0.5) * 4;
        }

        // Coin collection
        if (Math.abs(coin.position.z - player.position.z) < 0.8 &&
            Math.abs(coin.position.x - player.position.x) < 0.8) {
          coin.position.z = -50;
          setScore(prev => prev + 10);
        }
      });

      // Update distance
      currentDistance += gameSpeed;
      setDistance(Math.floor(currentDistance * 10));

      // Increase speed gradually
      gameSpeed += 0.0001;

      camera.position.z = player.position.z + 5;
      camera.lookAt(player.position);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gameState]);

  const startGame = () => {
    setScore(0);
    setDistance(0);
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const endGame = async (finalDistance) => {
    setGameState('gameover');
    
    if (!currentUser) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const finalScore = score + finalDistance;
    const reward = Math.min(0.015, 0.003 + (finalScore / 1000) * 0.012);

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'soflo-runner',
        score: finalScore,
        duration_seconds: duration,
        reward_earned: reward
      });

      await base44.auth.updateMe({
        soflo_coins: (currentUser.soflo_coins || 0) + reward
      });

      toast.success(`🏃 Great run! Earned ${reward.toFixed(4)} SFC`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-sky-400 to-green-400">
      <button onClick={onExit} className="absolute top-4 right-4 p-2 bg-red-500 rounded-full hover:bg-red-600 z-10">
        <X className="w-6 h-6 text-white" />
      </button>

      {gameState === 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-white mb-4">🏃 SoFlo Runner 3D</h2>
            <p className="text-white mb-2">Arrow keys to move</p>
            <p className="text-white mb-6">Space to jump</p>
            <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700 px-8 py-6 text-lg">
              <Play className="w-5 h-5 mr-2" />
              Start Running
            </Button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-4xl font-bold text-white mb-4">Run Complete!</h3>
            <p className="text-white text-2xl mb-2">Score: {score + distance}</p>
            <p className="text-gray-300 mb-6">Distance: {distance}m</p>
            <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700 px-8 py-4">
              Run Again
            </Button>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">Score: {score}</div>
          <div className="text-lg">Distance: {distance}m</div>
        </div>
      )}

      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}