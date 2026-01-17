import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VirtualTourViewer({ property, onClose }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const images = property.images || [property.main_image];
  const hasVirtualTour = property.virtual_tour_url;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md">
          <div>
            <h2 className="text-white text-xl font-bold">{property.title}</h2>
            <p className="text-gray-400 text-sm">{property.location}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          <AnimatePresence mode="wait">
            {hasVirtualTour ? (
              <motion.div
                key="tour"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full max-w-6xl"
              >
                <iframe
                  src={property.virtual_tour_url}
                  className="w-full h-full rounded-2xl"
                  allowFullScreen
                  title="Virtual Tour"
                />
              </motion.div>
            ) : (
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative w-full h-full flex items-center justify-center"
              >
                <img
                  src={images[currentImageIndex]}
                  alt={`${property.title} - Image ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain rounded-2xl"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Arrows */}
          {!hasVirtualTour && images.length > 1 && (
            <>
              <button
                onClick={previousImage}
                className="absolute left-4 p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {!hasVirtualTour && images.length > 1 && (
          <div className="p-4 bg-black/50 backdrop-blur-md">
            <div className="flex gap-2 overflow-x-auto pb-2 max-w-6xl mx-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                    idx === currentImageIndex
                      ? "border-emerald-500"
                      : "border-white/20 hover:border-white/50"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image Counter */}
        {!hasVirtualTour && (
          <div className="absolute bottom-24 right-4 px-4 py-2 bg-black/70 backdrop-blur-md rounded-full text-white text-sm">
            {currentImageIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </motion.div>
  );
}