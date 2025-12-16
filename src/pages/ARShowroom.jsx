import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  Camera, X, Maximize, Share2, ShoppingCart, 
  Sparkles, ChevronLeft, Check, Grid, Box
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as THREE from "three";

export default function ARShowroom() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [arMode, setArMode] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [camera, setCamera] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ['marketplace-products'],
    queryFn: async () => {
      return await base44.entities.MarketplaceItem.filter({ status: 'available' });
    }
  });

  const startAR = async (product) => {
    setSelectedProduct(product);
    setArMode(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
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
        alpha: true 
      });
      renderer.setSize(window.innerWidth, window.innerHeight);

      // Add simple 3D product placeholder
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xa855f7,
        wireframe: true
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      sceneRef.current = { scene, camera, renderer, cube };

      const animate = () => {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
      };
      animate();

      toast.success('AR Mode Active! Point camera at a surface');
    } catch (error) {
      toast.error('Camera access denied or not available');
      setArMode(false);
    }
  };

  const stopAR = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (sceneRef.current) {
      sceneRef.current.renderer.dispose();
    }
    setArMode(false);
    setSelectedProduct(null);
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
            <span className="text-white font-semibold text-sm">AR Active</span>
          </div>

          <button
            onClick={capturePhoto}
            className="p-3 bg-purple-600 backdrop-blur-sm rounded-full hover:bg-purple-700 transition shadow-lg"
          >
            <Camera className="w-6 h-6 text-white" />
          </button>
        </div>

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
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg mb-2">Virtual Try-On Technology</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• See products in your actual space</li>
                <li>• Try furniture before buying</li>
                <li>• Visualize artwork on your walls</li>
                <li>• Check if items fit your room</li>
              </ul>
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