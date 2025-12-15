import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Enhanced offline data caching with IndexedDB fallback
export default function OfflineDataCache() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Enable React Query persistence
    const persistor = {
      persistClient: async (client) => {
        try {
          const state = queryClient.getQueryCache().getAll().map(query => ({
            queryKey: query.queryKey,
            queryHash: query.queryHash,
            state: query.state
          }));
          
          localStorage.setItem('react-query-cache', JSON.stringify(state));
          
          // Also cache in IndexedDB if available
          if ('indexedDB' in window) {
            try {
              const db = await openDB();
              if (db.objectStoreNames.contains('cache')) {
                return new Promise((resolve) => {
                  const tx = db.transaction('cache', 'readwrite');
                  tx.objectStore('cache').put(state, 'query-cache');
                  tx.oncomplete = () => resolve();
                  tx.onerror = () => resolve();
                });
              }
            } catch (err) {
              console.error('IndexedDB cache error:', err);
            }
          }
        } catch (err) {
          console.error('Cache persist error:', err);
        }
      },
      
      restoreClient: async () => {
        try {
          // Try localStorage first
          const cached = localStorage.getItem('react-query-cache');
          if (cached) {
            const state = JSON.parse(cached);
            state.forEach(query => {
              queryClient.setQueryData(query.queryKey, query.state.data);
            });
            return;
          }
          
          // Fallback to IndexedDB
          if ('indexedDB' in window) {
            try {
              const db = await openDB();
              if (db.objectStoreNames.contains('cache')) {
                return new Promise((resolve) => {
                  const tx = db.transaction('cache', 'readonly');
                  const request = tx.objectStore('cache').get('query-cache');
                  
                  request.onsuccess = () => {
                    const state = request.result;
                    if (state) {
                      state.forEach(query => {
                        queryClient.setQueryData(query.queryKey, query.state.data);
                      });
                    }
                    resolve();
                  };
                  
                  request.onerror = () => resolve();
                });
              }
            } catch (err) {
              console.error('IndexedDB restore error:', err);
            }
          }
        } catch (err) {
          console.error('Cache restore error:', err);
        }
      }
    };

    // Restore cache on mount
    persistor.restoreClient();

    // Persist cache on data changes
    const interval = setInterval(() => {
      persistor.persistClient();
    }, 30000); // Persist every 30 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}

// IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PlaysoFlo', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache');
      }
    };
  });
}

// Export offline-aware fetch wrapper
export async function offlineFetch(url, options = {}) {
  const cacheKey = `fetch_${url}`;
  
  // If offline, return cached data
  if (!navigator.onLine) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Return data up to 1 hour old when offline
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          return data;
        }
      }
    } catch (err) {
      console.error('Offline fetch error:', err);
    }
    throw new Error('No internet connection and no cached data');
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    // Cache successful responses
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    
    return data;
  } catch (err) {
    // If fetch fails, try to return stale cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data } = JSON.parse(cached);
      console.warn('Using stale cache due to fetch error');
      return data;
    }
    throw err;
  }
}