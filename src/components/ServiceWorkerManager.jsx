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

    // Monitor notifications when app is not focused
    const checkNotifications = async () => {
      if (document.hasFocus()) return; // Only show when app not in focus
      
      try {
        const user = await base44.auth.me();
        if (!user) return;

        const unreadNotifications = await base44.entities.Notification.filter({
          recipient_email: user.email,
          read: false
        });

        // Show browser notification for recent unread notifications
        if (Notification.permission === 'granted' && unreadNotifications.length > 0) {
          unreadNotifications.forEach(notif => {
            const createdAt = new Date(notif.created_date);
            const now = new Date();
            const ageSeconds = (now - createdAt) / 1000;

            // Only show notifications created in the last 30 seconds
            if (ageSeconds < 30) {
              const notification = new Notification(notif.title || 'PlaySoFlo', {
                body: notif.message,
                icon: 'https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=192&h=192&fit=crop',
                badge: 'https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=72&h=72&fit=crop',
                vibrate: [200, 100, 200, 100, 200],
                tag: notif.id,
                requireInteraction: notif.type === 'ride_update' || notif.type === 'delivery_update',
                silent: false
              });

              // Play notification sound
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
                audio.volume = 0.3;
                audio.play().catch(() => {});
              } catch (e) {
                console.log('Could not play sound');
              }

              // Auto-mark as read after showing
              setTimeout(() => {
                base44.entities.Notification.update(notif.id, { read: true }).catch(() => {});
              }, 2000);
            }
          });
        }
      } catch (e) {
        console.log('Notification check error:', e);
      }
    };

    // Check every 5 seconds when tab is not focused
    const interval = setInterval(checkNotifications, 5000);
    checkNotifications();

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}