import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * Optimized Image Component
 * Features: Lazy loading, progressive loading, blur placeholder, error fallback
 */
export default function OptimizedImage({ 
  src, 
  alt, 
  className = "",
  width,
  height,
  priority = false,
  onLoad,
  fallback = null
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return; // Skip lazy loading for priority images

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Preload priority images
  useEffect(() => {
    if (priority && src) {
      const img = new Image();
      img.src = src;
      img.onload = () => setIsLoaded(true);
      img.onerror = () => setHasError(true);
    }
  }, [priority, src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    console.warn(`[OptimizedImage] Failed to load image: ${src}`);
  };

  if (hasError) {
    return (
      fallback || (
        <div 
          ref={imgRef}
          className={`bg-gray-800 flex items-center justify-center ${className}`}
          style={{ width, height }}
        >
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )
    );
  }

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      {!isLoaded && isInView && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
      )}
      
      {/* Actual image */}
      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={`w-full h-full object-cover ${className}`}
        />
      )}
    </div>
  );
}