import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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

    // There has never been a /sw.js in this app -- Vercel's SPA catch-all
    // rewrite serves index.html for that path instead, so registering it
    // either failed outright or, worse, let a browser that had cached an
    // old registration from some earlier deployment keep intercepting
    // requests and serving stale JS bundles indefinitely (the actual cause
    // of "cannot add postgres_changes callbacks ... after subscribe()"
    // crashes on clients that were stuck on a build from before that fix
    // shipped -- a code fix on its own never reaches an already-registered
    // worker). Unregister anything already installed and clear its caches
    // so affected clients self-heal on next load, instead of registering
    // it again.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(registrations => Promise.all(registrations.map(r => r.unregister())))
        .catch(() => {});
    }
    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(keys.map(key => caches.delete(key))))
        .catch(() => {});
    }

    // Notification polling removed - handled by RealtimeNotificationManager via subscriptions

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}