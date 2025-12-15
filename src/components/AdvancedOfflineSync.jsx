import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AdvancedOfflineSync() {
  useEffect(() => {
    // Periodic sync when online
    const syncInterval = setInterval(async () => {
      if (navigator.onLine) {
        await syncOfflineData();
      }
    }, 60000); // Every minute

    // Sync on visibility change
    const handleVisibility = () => {
      if (!document.hidden && navigator.onLine) {
        syncOfflineData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const syncOfflineData = async () => {
    try {
      const db = await openDB();
      
      // Sync pending messages
      const pendingMessages = await getFromStore(db, 'pending_messages');
      if (pendingMessages.length > 0) {
        for (const msg of pendingMessages) {
          try {
            await base44.entities.ChatMessage.create(msg.data);
            await deleteFromStore(db, 'pending_messages', msg.id);
          } catch (err) {
            console.error('Failed to sync message:', err);
          }
        }
      }

      // Sync pending payments
      const pendingPayments = await getFromStore(db, 'pending_payments');
      if (pendingPayments.length > 0) {
        for (const payment of pendingPayments) {
          try {
            await base44.functions.invoke('processPayment', payment.data);
            await deleteFromStore(db, 'pending_payments', payment.id);
            toast.success('Payment synced: $' + payment.data.amount);
          } catch (err) {
            console.error('Failed to sync payment:', err);
          }
        }
      }

      console.log('✓ Offline data synced');
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  return null;
}

// IndexedDB helpers
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PlaysoFloOffline', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending_messages')) {
        db.createObjectStore('pending_messages', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pending_payments')) {
        db.createObjectStore('pending_payments', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cached_music')) {
        db.createObjectStore('cached_music', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_crypto_prices')) {
        db.createObjectStore('cached_crypto_prices', { keyPath: 'currency' });
      }
    };
  });
}

async function getFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteFromStore(db, storeName, id) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch (err) {
      resolve();
    }
  });
}

// Export for use in other components
export async function cacheForOffline(storeName, data) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.error('Cache error:', err);
  }
}

export async function queueForSync(storeName, data) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).add({ data, timestamp: Date.now() });
      tx.oncomplete = () => {
        toast.info('Action queued for sync when online');
        resolve();
      };
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.error('Queue error:', err);
  }
}