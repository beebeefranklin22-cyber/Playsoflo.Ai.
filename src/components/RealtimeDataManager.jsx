import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Manage real-time data with offline fallback
export default function RealtimeDataManager() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Delay start to avoid blocking initial render
    const startTimer = setTimeout(() => {
      const updateInterval = setInterval(async () => {
        if (navigator.onLine) {
          try {
            // Update crypto prices
            queryClient.invalidateQueries(['crypto-prices']);
            queryClient.invalidateQueries(['exchange-rates']);
            
            // Cache latest prices to IndexedDB
            const prices = queryClient.getQueryData(['crypto-prices']);
            if (prices) {
              await cachePrices(prices);
            }
          } catch (error) {
            console.warn('Realtime update failed:', error);
          }
        }
      }, 60000); // Every 60 seconds

      return () => clearInterval(updateInterval);
    }, 10000);

    return () => clearTimeout(startTimer);
  }, [queryClient]);

  return null;
}

async function cachePrices(prices) {
  try {
    const db = await openPriceDB().catch(() => null);
    if (!db || !db.objectStoreNames.contains('cached_crypto_prices')) {
      return;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('cached_crypto_prices', 'readwrite');
        const store = tx.objectStore('cached_crypto_prices');
        
        for (const [currency, data] of Object.entries(prices || {})) {
          store.put({
            currency,
            data,
            cachedAt: Date.now()
          });
        }
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  } catch (err) {
    // Silent fail
  }
}

async function getCachedPrices() {
  try {
    const db = await openPriceDB().catch(() => null);
    if (!db || !db.objectStoreNames.contains('cached_crypto_prices')) {
      return null;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('cached_crypto_prices', 'readonly');
        const request = tx.objectStore('cached_crypto_prices').getAll();
        
        request.onsuccess = () => {
          const items = request.result || [];
          const prices = {};
          
          items.forEach(item => {
            if (item && Date.now() - item.cachedAt < 5 * 60 * 1000) {
              prices[item.currency] = item.data;
            }
          });
          
          resolve(Object.keys(prices).length > 0 ? prices : null);
        };
        
        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  } catch (err) {
    return null;
  }
}

function openPriceDB() {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('PlaysoFloOffline', 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cached_crypto_prices')) {
          db.createObjectStore('cached_crypto_prices', { keyPath: 'currency' });
        }
      };
    } catch (e) {
      reject(e);
    }
  });
}