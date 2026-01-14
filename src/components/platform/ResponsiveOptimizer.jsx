import { useEffect } from 'react';

export default function ResponsiveOptimizer() {
  useEffect(() => {
    // Detect device capabilities
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isHighDPI = window.devicePixelRatio > 1.5;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Apply device-specific optimizations
    if (isTouchDevice) {
      document.body.classList.add('touch-device');
      // Increase touch target sizes
      document.documentElement.style.setProperty('--touch-target', '48px');
    } else {
      document.body.classList.add('pointer-device');
      document.documentElement.style.setProperty('--touch-target', '32px');
    }

    // High DPI optimizations
    if (isHighDPI) {
      document.body.classList.add('high-dpi');
    }

    // Respect motion preferences
    if (prefersReducedMotion) {
      document.body.classList.add('reduce-motion');
      const style = document.createElement('style');
      style.innerHTML = `
        * {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Battery optimization
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        if (battery.level < 0.2 || battery.charging === false) {
          // Enable low-power mode
          document.body.classList.add('low-power-mode');
          // Reduce animations, disable auto-refresh
          const style = document.createElement('style');
          style.innerHTML = `
            .low-power-mode * {
              animation: none !important;
              transition: none !important;
            }
          `;
          document.head.appendChild(style);
        }
      });
    }

    // Network-aware loading
    if ('connection' in navigator) {
      const connection = navigator.connection;
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        document.body.classList.add('slow-network');
        // Disable auto-loading media
      }
    }

    // Viewport height fix for mobile browsers
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  return null;
}