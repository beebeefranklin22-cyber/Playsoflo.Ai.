import { useEffect } from 'react';
import { toast } from 'sonner';

export default function ServiceWorkerManager() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker.register('/sw-advanced.js')
        .then(registration => {
          console.log('✓ Service Worker registered');
          
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
      if ('sync' in registration) {
        navigator.serviceWorker.ready.then(swRegistration => {
          return swRegistration.sync.register('sync-queue');
        });
      }
    }

    // Enable background fetch for large files (music/video)
    if ('BackgroundFetchManager' in self) {
      console.log('✓ Background Fetch API available');
    }
  }, []);

  return null;
}