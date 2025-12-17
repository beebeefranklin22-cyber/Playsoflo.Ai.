import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Music, Pause, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StoryViewer({ stories, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (isPaused) return;

    const duration = 5000; // 5 seconds per story
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Move to next story
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, stories.length, onClose]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="relative w-full max-w-md h-full max-h-[90vh] bg-gray-900 rounded-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bars */}
          <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
            {stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all"
                  style={{
                    width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {currentStory.created_by?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  {currentStory.created_by?.split('@')[0] || "User"}
                </p>
                <p className="text-gray-300 text-xs">
                  {new Date(currentStory.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Story Content */}
          <div className="w-full h-full flex items-center justify-center">
            {currentStory.media_url && currentStory.media_url !== 'text-story' ? (
              currentStory.media_type === 'video' ? (
                <video
                  src={currentStory.media_url}
                  className="w-full h-full object-contain"
                  autoPlay
                  muted
                  onEnded={goToNext}
                />
              ) : (
                <img
                  src={currentStory.media_url}
                  className="w-full h-full object-contain"
                  alt="Story"
                />
              )
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center p-8">
                <p className="text-white text-4xl font-bold text-center">
                  {currentStory.caption}
                </p>
              </div>
            )}
          </div>

          {/* Caption overlay */}
          {currentStory.caption && currentStory.media_url !== 'text-story' && (
            <div className="absolute bottom-20 left-4 right-4 z-10">
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white text-sm">{currentStory.caption}</p>
              </div>
            </div>
          )}

          {/* Music indicator */}
          {currentStory.music && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                <Music className="w-4 h-4 text-pink-400 animate-pulse" />
                <p className="text-white text-sm truncate flex-1">{currentStory.music}</p>
              </div>
            </div>
          )}

          {/* Navigation areas */}
          <button
            className="absolute left-0 top-0 bottom-0 w-1/3 z-5"
            onClick={goToPrevious}
          />
          <button
            className="absolute right-0 top-0 bottom-0 w-1/3 z-5"
            onClick={goToNext}
          />
          <button
            className="absolute left-1/3 right-1/3 top-0 bottom-0 z-5"
            onClick={() => setIsPaused(!isPaused)}
          />

          {/* Navigation arrows */}
          {currentIndex > 0 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-full hover:bg-black/70 transition"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}
          {currentIndex < stories.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-full hover:bg-black/70 transition"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}