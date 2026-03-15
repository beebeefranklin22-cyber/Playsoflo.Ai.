import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { base44 } from "@/api/base44Client";

export default function ServiceWorkerManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! ✅');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.info('You\'re offline. Some features may be limited.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator) {
      // Register service worker (will be created by build process)
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(async (registration) => {
          console.log('✓ Service Worker registered for PWA support');
          
          // Request notification permission
          if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              console.log('✓ Notification permission granted');
            }
          }
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                toast.info('App update available! Refresh to update.', {
                  action: {
                    label: 'Refresh',
                    onClick: () => window.location.reload()
                  }
                });
              }
            });
          });
        })
        .catch(err => console.log('SW registration failed:', err));

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_UPDATED') {
          console.log('Cache updated:', event.data.url);
        }
      });

      // Handle background sync
      navigator.serviceWorker.ready.then(swRegistration => {
        if ('sync' in swRegistration) {
          return swRegistration.sync.register('sync-queue').catch(() => {});
        }
      }).catch(() => {});
    }

    // Notification polling removed - handled by RealtimeNotificationManager via subscriptions

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}