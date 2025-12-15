import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Register service worker for offline caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        console.log('Service worker registration not available');
      });
    }

    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      
      // Sync queued actions
      syncOfflineQueue();
      
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineQueue = async () => {
    try {
      const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
      
      if (queue.length > 0) {
        console.log(`Syncing ${queue.length} queued actions...`);
        
        // Process queued actions here
        for (const action of queue) {
          try {
            // You can dispatch these to your API
            console.log('Syncing action:', action);
          } catch (err) {
            console.error('Failed to sync action:', err);
          }
        }
        
        localStorage.removeItem('offline_queue');
      }
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[9999] ${
              isOnline 
                ? 'bg-green-600' 
                : 'bg-red-600'
            } text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-5 h-5" />
                <span className="font-medium">Back online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5" />
                <span className="font-medium">No internet connection</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isOnline && !showNotification && (
        <div className="fixed top-16 left-0 right-0 z-50 bg-red-600 text-white py-2 text-center text-sm">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>You're offline - some features may be limited</span>
          </div>
        </div>
      )}
    </>
  );
}

// Utility functions for offline support
export const cacheData = (key, data) => {
  try {
    localStorage.setItem(`cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.error('Cache error:', err);
  }
};

export const getCachedData = (key, maxAge = 5 * 60 * 1000) => {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    
    if (Date.now() - timestamp > maxAge) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Cache retrieval error:', err);
    return null;
  }
};

export const queueOfflineAction = (action) => {
  try {
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    queue.push({
      ...action,
      timestamp: Date.now()
    });
    localStorage.setItem('offline_queue', JSON.stringify(queue));
  } catch (err) {
    console.error('Queue error:', err);
  }
};

export const isOffline = () => !navigator.onLine;