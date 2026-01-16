import { useEffect } from 'react';

export default function MultiDeviceValidator() {
  useEffect(() => {
    const validateDevice = () => {
      const device = {
        platform: detectPlatform(),
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        touchSupport: 'ontouchstart' in window,
        orientation: window.screen?.orientation?.type,
        pixelRatio: window.devicePixelRatio,
        online: navigator.onLine,
        connectionType: navigator.connection?.effectiveType
      };

      console.log('📱 Device Info:', device);

      // Apply platform-specific optimizations
      applyPlatformOptimizations(device);

      // Validate viewport
      validateViewport(device);

      // Check performance capabilities
      assessPerformance(device);
    };

    validateDevice();

    // Re-validate on resize or orientation change
    window.addEventListener('resize', validateDevice);
    window.addEventListener('orientationchange', validateDevice);

    return () => {
      window.removeEventListener('resize', validateDevice);
      window.removeEventListener('orientationchange', validateDevice);
    };
  }, []);

  const detectPlatform = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Windows/i.test(ua)) return 'windows';
    if (/Mac/i.test(ua)) return 'macos';
    if (/Linux/i.test(ua)) return 'linux';
    if (/TV/i.test(ua)) return 'tv';
    return 'unknown';
  };

  const applyPlatformOptimizations = (device) => {
    document.body.classList.add(`platform-${device.platform}`);
    
    if (device.touchSupport) {
      document.body.classList.add('touch-device');
    }

    // iOS-specific fixes
    if (device.platform === 'ios') {
      document.body.style.webkitTouchCallout = 'none';
      document.body.style.webkitUserSelect = 'none';
    }

    // TV optimizations
    if (device.platform === 'tv') {
      document.body.classList.add('platform-tvos');
      document.body.style.cursor = 'pointer';
    }

    // Set CSS custom properties
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    document.documentElement.style.setProperty('--touch-target', device.touchSupport ? '44px' : '32px');
  };

  const validateViewport = (device) => {
    // Ensure proper viewport scaling
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

    // Fix iOS viewport height
    if (device.platform === 'ios') {
      const fixViewport = () => {
        document.documentElement.style.height = `${window.innerHeight}px`;
      };
      fixViewport();
      window.addEventListener('resize', fixViewport);
    }
  };

  const assessPerformance = (device) => {
    const lowPower = device.connectionType === '2g' || 
                     device.connectionType === 'slow-2g' ||
                     device.screenSize.width < 768;

    if (lowPower) {
      console.log('🔋 Low-power mode detected - applying optimizations');
      document.body.classList.add('low-power-mode');
      sessionStorage.setItem('performance_mode', 'low');
    }

    // High DPI optimization
    if (device.pixelRatio > 2) {
      document.body.classList.add('high-dpi');
    }
  };

  return null;
}