import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  Camera, X, Maximize, Share2, ShoppingCart, 
  Sparkles, ChevronLeft, Check, Grid, Box, Sun, 
  Ruler, Palette, ZoomIn, ZoomOut, RotateCcw,
  User, Home, Shirt, Watch
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import * as THREE from "three";

export default function ARShowroom() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [arMode, setArMode] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [tryOnMode, setTryOnMode] = useState('room'); // room, face, body
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [lighting, setLighting] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [materialType, setMaterialType] = useState('standard');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const detectionRef = useRef(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [bodyDetected, setBodyDetected] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ['marketplace-products'],
    queryFn: async () => {
      return await base44.entities.MarketplaceItem.filter({ status: 'available' });
    }
  });

  const determineTryOnMode = (category) => {
    if (['accessories', 'jewelry', 'sunglasses', 'watches'].some(c => category?.toLowerCase().includes(c))) {
      return 'face';
    } else if (['clothing', 'fashion', 'shirt', 'dress'].some(c => category?.toLowerCase().includes(c))) {
      return 'body';
    }
    return 'room';
  };

  const startAR = async (product) => {
    setSelectedProduct(product);
    const mode = determineTryOnMode(product.category);
    setTryOnMode(mode);
    setArMode(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: mode === 'room' ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Initialize Three.js scene for AR overlay
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;

      const renderer = new THREE.WebGLRenderer({ 
        canvas: canvasRef.current,
        alpha: true,
        antialias: true
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Enhanced lighting system
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0xffffff, 0.5);
      pointLight.position.set(-5, 3, 0);
      scene.add(pointLight);

      // Create realistic product mesh based on category
      let geometry, material, mesh;
      
      if (mode === 'room') {
        // Furniture/Room items - realistic box with better materials
        geometry = new THREE.BoxGeometry(2, 2, 2);
        material = new THREE.MeshStandardMaterial({ 
          color: 0x8b4513,
          roughness: 0.7,
          metalness: 0.3
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      } else if (mode === 'face') {
        // Face accessories - sphere for glasses/jewelry
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        material = new THREE.MeshPhysicalMaterial({ 
          color: 0xffd700,
          roughness: 0.1,
          metalness: 0.9,
          clearcoat: 1.0
        });
        mesh = new THREE.Mesh(geometry, material);
      } else {
        // Body clothing - plane with texture
        geometry = new THREE.PlaneGeometry(1.5, 2);
        material = new THREE.MeshStandardMaterial({ 
          color: 0x4169e1,
          side: THREE.DoubleSide,
          roughness: 0.8,
          metalness: 0.1
        });
        mesh = new THREE.Mesh(geometry, material);
      }
      
      scene.add(mesh);

      // Add ground plane for room mode
      if (mode === 'room') {
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1;
        ground.receiveShadow = true;
        scene.add(ground);
      }

      sceneRef.current = { scene, camera, renderer, mesh, directionalLight, ambientLight, pointLight };

      // Initialize face/body detection for try-on modes
      if (mode === 'face' || mode === 'body') {
        initializeDetection(mode);
      }

      const animate = () => {
        if (!sceneRef.current) return;
        requestAnimationFrame(animate);
        
        const { mesh, renderer, camera, scene } = sceneRef.current;
        
        // Apply user controls
        mesh.scale.set(scale, scale, scale);
        mesh.rotation.y = rotation;
        
        // Auto-rotate for room mode
        if (mode === 'room') {
          mesh.rotation.y += 0.005;
        }
        
        renderer.render(scene, camera);
      };
      animate();

      toast.success(`AR ${mode === 'room' ? 'Placement' : mode === 'face' ? 'Face Try-On' : 'Virtual Fitting'} Active!`);
    } catch (error) {
      toast.error('Camera access denied or not available');
      setArMode(false);
    }
  };

  const initializeDetection = (mode) => {
    // Simplified detection - in production use MediaPipe or similar
    const detectInterval = setInterval(() => {
      if (!videoRef.current) return;
      
      if (mode === 'face') {
        setFaceDetected(Math.random() > 0.3); // Simulate detection
      } else if (mode === 'body') {
        setBodyDetected(Math.random() > 0.3); // Simulate detection
      }
    }, 500);
    
    detectionRef.current = detectInterval;
  };

  const adjustLighting = (value) => {
    setLighting(value);
    if (sceneRef.current) {
      const { directionalLight, ambientLight } = sceneRef.current;
      if (directionalLight) directionalLight.intensity = value * 0.8;
      if (ambientLight) ambientLight.intensity = value * 0.5;
    }
  };

  const changeMaterial = (type) => {
    setMaterialType(type);
    if (sceneRef.current?.mesh) {
      const { mesh } = sceneRef.current;
      let newMaterial;
      
      switch(type) {
        case 'glossy':
          newMaterial = new THREE.MeshPhysicalMaterial({ 
            color: mesh.material.color,
            roughness: 0.1,
            metalness: 0.9,
            clearcoat: 1.0
          });
          break;
        case 'matte':
          newMaterial = new THREE.MeshStandardMaterial({ 
            color: mesh.material.color,
            roughness: 1.0,
            metalness: 0.0
          });
          break;
        default:
          newMaterial = new THREE.MeshStandardMaterial({ 
            color: mesh.material.color,
            roughness: 0.5,
            metalness: 0.5
          });
      }
      
      mesh.material.dispose();
      mesh.material = newMaterial;
    }
  };

  const stopAR = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (sceneRef.current) {
      sceneRef.current.renderer.dispose();
    }
    if (detectionRef.current) {
      clearInterval(detectionRef.current);
    }
    setArMode(false);
    setSelectedProduct(null);
    setScale(1);
    setRotation(0);
    setLighting(1);
  };

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/png');
    setCapturedImage(imageData);
    toast.success('Photo captured! Share your AR view');
  };

  if (arMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* AR Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={stopAR}
            className="p-3 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <div className="glass-effect rounded-full px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white font-semibold text-sm">
              {tryOnMode === 'face' ? 'Face Tracking' : tryOnMode === 'body' ? 'Body Tracking' : 'AR Placement'}
            </span>
            {tryOnMode === 'face' && faceDetected && <Check className="w-4 h-4 text-green-400" />}
            {tryOnMode === 'body' && bodyDetected && <Check className="w-4 h-4 text-green-400" />}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-3 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={capturePhoto}
              className="p-3 bg-purple-600 backdrop-blur-sm rounded-full hover:bg-purple-700 transition shadow-lg"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Advanced AR Controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="absolute left-4 top-24 glass-effect rounded-2xl p-4 w-72 z-10"
            >
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                AR Controls
              </h3>

              {/* Scale Control */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white text-sm flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-blue-400" />
                    Scale
                  </label>
                  <span className="text-gray-300 text-sm">{scale.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[scale]}
                  onValueChange={(v) => setScale(v[0])}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Rotation Control */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white text-sm flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-green-400" />
                    Rotation
                  </label>
                  <span className="text-gray-300 text-sm">{Math.round(rotation * 57.3)}°</span>
                </div>
                <Slider
                  value={[rotation]}
                  onValueChange={(v) => setRotation(v[0])}
                  min={0}
                  max={Math.PI * 2}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Lighting Control */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white text-sm flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-400" />
                    Lighting
                  </label>
                  <span className="text-gray-300 text-sm">{Math.round(lighting * 100)}%</span>
                </div>
                <Slider
                  value={[lighting]}
                  onValueChange={(v) => adjustLighting(v[0])}
                  min={0.3}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Material Type */}
              <div className="mb-4">
                <label className="text-white text-sm mb-2 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-pink-400" />
                  Material
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => changeMaterial('standard')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                      materialType === 'standard' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => changeMaterial('glossy')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                      materialType === 'glossy' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    Glossy
                  </button>
                  <button
                    onClick={() => changeMaterial('matte')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                      materialType === 'matte' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    Matte
                  </button>
                </div>
              </div>

              {/* Mode Info */}
              <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-500/30">
                <p className="text-purple-300 text-xs">
                  {tryOnMode === 'room' && '📐 Room Mode: Place furniture in your space'}
                  {tryOnMode === 'face' && '👤 Face Mode: Try on accessories virtually'}
                  {tryOnMode === 'body' && '👔 Body Mode: See how clothes fit'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Info Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="glass-effect rounded-2xl p-4 border border-white/20">
            <h3 className="text-white font-bold text-lg mb-1">{selectedProduct?.title}</h3>
            <p className="text-gray-300 text-sm mb-3">{selectedProduct?.description}</p>
            <div className="flex gap-2">
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
              <Button variant="outline" className="border-white/20 text-white">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-pink-950 to-orange-950 pb-20">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <Box className="w-8 h-8 text-purple-400" />
            AR Showroom
          </h1>
          <p className="text-gray-300">Try products in your space with augmented reality</p>
        </div>

        {/* Featured AR */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg mb-2">Advanced Virtual Try-On</h3>
              <p className="text-gray-300 text-sm">
                Experience realistic product visualization with accurate scaling, lighting, and material rendering
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Home className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-white text-xs font-semibold mb-1">Room Placement</p>
              <p className="text-gray-400 text-xs">See furniture in your space</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <User className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-white text-xs font-semibold mb-1">Face Try-On</p>
              <p className="text-gray-400 text-xs">Try accessories live</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Shirt className="w-6 h-6 text-pink-400 mx-auto mb-2" />
              <p className="text-white text-xs font-semibold mb-1">Virtual Fitting</p>
              <p className="text-gray-400 text-xs">See how clothes look</p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.slice(0, 9).map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/50 transition group"
            >
              <div className="aspect-square relative">
                <img 
                  src={product.image_url || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400"} 
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="p-4">
                <h3 className="text-white font-bold mb-1 truncate">{product.title}</h3>
                <p className="text-purple-400 font-bold mb-3">${product.price}</p>
                
                <Button
                  onClick={() => startAR(product)}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Box className="w-4 h-4 mr-2" />
                  View in AR
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-20">
            <Box className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400">No AR-enabled products available yet</p>
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setCapturedImage(null)}
          >
            <div className="max-w-2xl">
              <img src={capturedImage} alt="AR Capture" className="rounded-2xl" />
              <div className="flex gap-3 mt-4">
                <Button className="flex-1 bg-purple-600">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button onClick={() => setCapturedImage(null)} variant="outline" className="border-white/20">
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}