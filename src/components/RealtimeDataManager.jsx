import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Manage real-time data with offline fallback
export default function RealtimeDataManager() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const updateInterval = setInterval(async () => {
      if (navigator.onLine) {
        // Update crypto prices
        queryClient.invalidateQueries(['crypto-prices']);
        queryClient.invalidateQueries(['exchange-rates']);
        
        // Cache latest prices to IndexedDB
        const prices = queryClient.getQueryData(['crypto-prices']);
        if (prices) {
          await cachePrices(prices);
        }
      } else {
        // Use cached prices when offline
        const cachedPrices = await getCachedPrices();
        if (cachedPrices) {
          queryClient.setQueryData(['crypto-prices'], cachedPrices);
        }
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(updateInterval);
  }, [queryClient]);

  return null;
}

async function cachePrices(prices) {
  try {
    const db = await openPriceDB();
    const tx = db.transaction('cached_crypto_prices', 'readwrite');
    const store = tx.objectStore('cached_crypto_prices');
    
    for (const [currency, data] of Object.entries(prices)) {
      await store.put({
        currency,
        data,
        cachedAt: Date.now()
      });
    }
  } catch (err) {
    console.error('Price cache error:', err);
  }
}

async function getCachedPrices() {
  try {
    const db = await openPriceDB();
    const tx = db.transaction('cached_crypto_prices', 'readonly');
    const items = await tx.objectStore('cached_crypto_prices').getAll();
    
    const prices = {};
    items.forEach(item => {
      // Only use prices less than 5 minutes old
      if (Date.now() - item.cachedAt < 5 * 60 * 1000) {
        prices[item.currency] = item.data;
      }
    });
    
    return Object.keys(prices).length > 0 ? prices : null;
  } catch (err) {
    console.error('Price retrieval error:', err);
    return null;
  }
}

function openPriceDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PlaysoFloOffline', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}