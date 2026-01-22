import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Performance Monitor - Tracks app performance metrics
 * Monitors: FPS, memory usage, network speed, render times
 */
export default function PerformanceMonitor({ enabled = true }) {
  const [metrics, setMetrics] = useState({
    fps: 60,
    memoryUsage: 0,
    slowRenders: 0,
    networkSpeed: 'unknown'
  });
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const slowRenderThreshold = 16.67; // 60fps = 16.67ms per frame

  useEffect(() => {
    if (!enabled) return;

    // Track FPS
    let animationFrameId;
    const trackFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTimeRef.current;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        setMetrics(prev => ({ ...prev, fps }));
        
        // Log performance warning if FPS drops below 30
        if (fps < 30) {
          console.warn(`[Performance] Low FPS detected: ${fps}`);
        }
        
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      animationFrameId = requestAnimationFrame(trackFPS);
    };
    trackFPS();

    // Track Memory Usage (if available)
    const trackMemory = setInterval(() => {
      if (performance.memory) {
        const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
        setMetrics(prev => ({ 
          ...prev, 
          memoryUsage: Math.round((usedMB / limitMB) * 100)
        }));

        // Warn if memory usage exceeds 80%
        if (usedMB / limitMB > 0.8) {
          console.warn(`[Performance] High memory usage: ${usedMB}MB / ${limitMB}MB`);
        }
      }
    }, 5000);

    // Track Network Speed
    const trackNetwork = () => {
      if (navigator.connection) {
        const effectiveType = navigator.connection.effectiveType;
        setMetrics(prev => ({ ...prev, networkSpeed: effectiveType }));
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          console.warn('[Performance] Slow network detected');
        }
      }
    };
    trackNetwork();
    navigator.connection?.addEventListener('change', trackNetwork);

    // Track Long Tasks (slow renders)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > slowRenderThreshold) {
          setMetrics(prev => ({ ...prev, slowRenders: prev.slowRenders + 1 }));
          console.warn(`[Performance] Slow render detected: ${entry.duration}ms`);
        }
      }
    });
    
    if ('PerformanceObserver' in window) {
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(trackMemory);
      navigator.connection?.removeEventListener('change', trackNetwork);
      observer.disconnect();
    };
  }, [enabled]);

  // Report critical performance issues to backend
  useEffect(() => {
    if (metrics.fps < 20 || metrics.memoryUsage > 90) {
      const reportIssue = async () => {
        try {
          await base44.entities.ErrorLog.create({
            error_message: 'Performance degradation detected',
            error_type: 'performance',
            user_agent: navigator.userAgent,
            url: window.location.href,
            component_stack: JSON.stringify(metrics)
          });
        } catch (err) {
          console.error('Failed to report performance issue:', err);
        }
      };
      reportIssue();
    }
  }, [metrics.fps, metrics.memoryUsage]);

  if (!enabled || process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] bg-black/90 text-white text-xs p-3 rounded-lg font-mono backdrop-blur-sm border border-white/20">
      <div className="space-y-1">
        <div className={metrics.fps < 30 ? 'text-red-400' : 'text-green-400'}>
          FPS: {metrics.fps}
        </div>
        <div className={metrics.memoryUsage > 80 ? 'text-red-400' : 'text-gray-300'}>
          Memory: {metrics.memoryUsage}%
        </div>
        <div className="text-gray-300">
          Network: {metrics.networkSpeed}
        </div>
        {metrics.slowRenders > 0 && (
          <div className="text-yellow-400">
            Slow renders: {metrics.slowRenders}
          </div>
        )}
      </div>
    </div>
  );
}