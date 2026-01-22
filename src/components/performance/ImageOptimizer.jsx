import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export default function OptimizedImage({ 
  src, 
  alt, 
  className = "",
  fallback = "/placeholder.jpg",
  lazy = true,
  quality = 80,
  blur = true,
  ...props 
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(!lazy);
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [lazy]);

  // Optimize image URL (if using a CDN that supports it)
  const optimizedSrc = React.useMemo(() => {
    if (!src || !inView) return null;
    
    // Add quality parameter if URL supports it
    if (src.includes('unsplash.com')) {
      return `${src}&q=${quality}&fm=webp`;
    }
    
    return src;
  }, [src, quality, inView]);

  if (!src) {
    return <div className={`bg-gray-800 ${className}`} />;
  }

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      {blur && !loaded && inView && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20 animate-pulse" />
      )}

      {/* Loading spinner */}
      {inView && !loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      )}

      {/* Actual image */}
      {inView && (
        <img
          src={error ? fallback : optimizedSrc}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true);
            setLoaded(true);
          }}
          loading={lazy ? "lazy" : "eager"}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}

// Progressive image loader
export function ProgressiveImage({ 
  lowQualitySrc, 
  highQualitySrc, 
  alt, 
  className = "" 
}) {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.src = highQualitySrc;
    img.onload = () => {
      setCurrentSrc(highQualitySrc);
      setLoading(false);
    };
  }, [highQualitySrc]);

  return (
    <div className={`relative ${className}`}>
      <img
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-500 ${
          loading ? 'blur-sm scale-105' : 'blur-0 scale-100'
        }`}
      />
    </div>
  );
}