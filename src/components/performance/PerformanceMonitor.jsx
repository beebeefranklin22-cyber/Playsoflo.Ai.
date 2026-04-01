import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    fps: 60,
    memory: 0,
    loadTime: 0,
    longTasks: 0
  });
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const warningShown = useRef(false);

  useEffect(() => {
    // Track FPS
    const measureFPS = () => {
      frameCount.current++;
      const now = performance.now();
      const delta = now - lastTime.current;

      if (delta >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / delta);
        setMetrics(prev => ({ ...prev, fps }));
        
        // Warn if FPS drops significantly
        if (fps < 30 && !warningShown.current) {
          console.warn('⚠️ Low FPS detected:', fps);
          warningShown.current = true;
        }
        
        frameCount.current = 0;
        lastTime.current = now;
      }
      requestAnimationFrame(measureFPS);
    };
    requestAnimationFrame(measureFPS);

    // Track memory usage (if available)
    const trackMemory = setInterval(() => {
      if (performance.memory) {
        const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
        setMetrics(prev => ({ ...prev, memory: usedMB }));

        // Warn if memory usage is high
        if (usedMB > limitMB * 0.8) {
          console.warn('⚠️ High memory usage:', usedMB, 'MB');
        }
      }
    }, 5000);

    // Track page load performance
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      setMetrics(prev => ({ ...prev, loadTime }));
    }

    // Use PerformanceObserver for long tasks
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              setMetrics(prev => ({ ...prev, longTasks: prev.longTasks + 1 }));
              console.warn('⚠️ Long task detected:', entry.duration, 'ms', entry.name);
            }
          }
        });
        observer.observe({ entryTypes: ['longtask', 'measure'] });

        return () => {
          observer.disconnect();
          clearInterval(trackMemory);
        };
      } catch (e) {
        console.log('PerformanceObserver not supported');
      }
    }

    return () => clearInterval(trackMemory);
  }, []);

  // Log critical performance issues
  useEffect(() => {
    if (metrics.fps < 20 || metrics.longTasks > 10) {
      const logError = async () => {
        try {
          await base44.entities.ErrorLog.create({
            error_message: 'Performance degradation detected',
            error_type: 'component_error',
            error_stack: JSON.stringify(metrics),
            url: window.location.href,
            user_agent: navigator.userAgent
          });
        } catch (e) {
          console.error('Failed to log performance issue:', e);
        }
      };
      logError();
    }
  }, [metrics.fps, metrics.longTasks]);

  // Dev mode only - show metrics overlay
  if (import.meta.env.DEV) {
    return (
      <div className="fixed bottom-4 left-4 z-[9999] bg-black/90 text-white text-xs p-3 rounded-lg border border-white/20 font-mono">
        <div>FPS: <span className={metrics.fps < 30 ? 'text-red-400' : 'text-green-400'}>{metrics.fps}</span></div>
        {metrics.memory > 0 && <div>Memory: {metrics.memory}MB</div>}
        {metrics.loadTime > 0 && <div>Load: {metrics.loadTime}ms</div>}
        {metrics.longTasks > 0 && <div className="text-yellow-400">Long tasks: {metrics.longTasks}</div>}
      </div>
    );
  }

  return null;
}