import { useEffect, useState } from 'react';

export default function CrossPlatformOptimizer() {
  const [platform, setPlatform] = useState('web');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isTvOS = /appletv/.test(userAgent) || window.matchMedia('(max-width: 1920px) and (min-width: 1280px)').matches;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else if (isTvOS) setPlatform('tvos');
    
    // Add platform-specific classes to body
    document.body.classList.add(`platform-${platform}`);
    if (isPWA) document.body.classList.add('pwa-mode');

    // iOS-specific optimizations
    if (isIOS) {
      // Prevent zoom on input focus
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
      }
      
      // Safe area support
      document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)');
    }

    // Android-specific optimizations
    if (isAndroid) {
      // Improve scroll performance
      document.body.style.overscrollBehavior = 'contain';
    }

    // TV-specific optimizations
    if (isTvOS) {
      // Enable d-pad navigation
      document.body.classList.add('tv-navigation');
      
      // Larger touch targets for TV
      document.documentElement.style.setProperty('--touch-target-size', '60px');
    }

    // Register service worker for offline support
    if ('serviceWorker' in navigator && isPWA) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('Service worker registration failed:', err);
      });
    }

    // Handle online/offline events
    const handleOnline = () => {
      document.dispatchEvent(new CustomEvent('app-online'));
    };
    const handleOffline = () => {
      document.dispatchEvent(new CustomEvent('app-offline'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Optimize for TV with CSS
    if (platform === 'tvos') {
      const style = document.createElement('style');
      style.innerHTML = `
        * { cursor: pointer !important; }
        button, a, input, [role="button"] {
          min-width: 60px;
          min-height: 60px;
        }
        .focusable:focus {
          outline: 3px solid #8B5CF6;
          outline-offset: 4px;
        }
      `;
      document.head.appendChild(style);
    }
  }, [platform]);

  return null;
}