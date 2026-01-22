import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function PerformanceMonitor({ children }) {
  const [metrics, setMetrics] = useState({
    fps: 60,
    memoryUsage: 0,
    networkSpeed: 'fast',
    batteryLevel: 100,
    isLowPowerMode: false
  });

  useEffect(() => {
    // Monitor FPS
    let lastTime = performance.now();
    let frames = 0;
    let fps = 60;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
        setMetrics(prev => ({ ...prev, fps }));
      }
      requestAnimationFrame(measureFPS);
    };
    
    const fpsId = requestAnimationFrame(measureFPS);

    // Monitor Memory (if available)
    const checkMemory = () => {
      if (performance.memory) {
        const usedMemory = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
        setMetrics(prev => ({ ...prev, memoryUsage: usedMemory }));
      }
    };
    const memoryInterval = setInterval(checkMemory, 5000);

    // Monitor Network
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      const updateConnectionStatus = () => {
        const effectiveType = connection.effectiveType;
        setMetrics(prev => ({ 
          ...prev, 
          networkSpeed: effectiveType === '4g' ? 'fast' : effectiveType === '3g' ? 'medium' : 'slow'
        }));
      };
      updateConnectionStatus();
      connection.addEventListener('change', updateConnectionStatus);
    }

    // Monitor Battery
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        const updateBatteryStatus = () => {
          setMetrics(prev => ({
            ...prev,
            batteryLevel: battery.level * 100,
            isLowPowerMode: battery.level < 0.2 || !battery.charging
          }));
        };
        updateBatteryStatus();
        battery.addEventListener('levelchange', updateBatteryStatus);
        battery.addEventListener('chargingchange', updateBatteryStatus);
      });
    }

    // Log performance issues
    const logPerformanceIssue = async () => {
      if (fps < 30 || metrics.memoryUsage > 0.9) {
        try {
          await base44.entities.ErrorLog.create({
            error_message: `Performance degradation detected`,
            error_type: 'performance',
            user_email: (await base44.auth.me())?.email || 'anonymous',
            url: window.location.href,
            user_agent: navigator.userAgent,
            component_stack: JSON.stringify({
              fps,
              memoryUsage: metrics.memoryUsage,
              networkSpeed: metrics.networkSpeed
            })
          });
        } catch (e) {
          console.warn('Failed to log performance issue:', e);
        }
      }
    };

    const perfLogInterval = setInterval(logPerformanceIssue, 30000);

    // Apply performance optimizations based on metrics
    const applyOptimizations = () => {
      if (metrics.isLowPowerMode || metrics.fps < 40 || metrics.memoryUsage > 0.8) {
        document.body.classList.add('low-power-mode');
        document.body.classList.add('reduce-animations');
      } else {
        document.body.classList.remove('low-power-mode');
        document.body.classList.remove('reduce-animations');
      }

      if (metrics.networkSpeed === 'slow') {
        document.body.classList.add('slow-network');
      } else {
        document.body.classList.remove('slow-network');
      }
    };

    const optimizationInterval = setInterval(applyOptimizations, 2000);

    return () => {
      cancelAnimationFrame(fpsId);
      clearInterval(memoryInterval);
      clearInterval(perfLogInterval);
      clearInterval(optimizationInterval);
    };
  }, []);

  return children;
}