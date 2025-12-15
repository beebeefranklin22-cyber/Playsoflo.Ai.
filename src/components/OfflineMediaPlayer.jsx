import { useEffect } from 'react';

// Manage offline music/video caching
export default function OfflineMediaPlayer() {
  useEffect(() => {
    if ('caches' in window) {
      preloadPopularContent();
    }
  }, []);

  const preloadPopularContent = async () => {
    try {
      const cache = await caches.open('media-cache-v1');
      
      // Cache popular music tracks (in production, fetch from API)
      const popularTracks = [
        '/api/music/popular',
        '/api/trending/music'
      ];

      for (const url of popularTracks) {
        await cache.add(url).catch(() => {});
      }
      
      console.log('✓ Popular content cached');
    } catch (err) {
      console.error('Media cache error:', err);
    }
  };

  return null;
}

// Utility to cache media on-demand
export async function cacheMediaFile(url, trackId) {
  try {
    const cache = await caches.open('media-cache-v1');
    await cache.add(url);
    
    // Store metadata in IndexedDB
    const db = await openMusicDB();
    if (!db.objectStoreNames.contains('cached_music')) {
      console.warn('cached_music store not available');
      return;
    }
    return new Promise((resolve) => {
      const tx = db.transaction('cached_music', 'readwrite');
      tx.objectStore('cached_music').put({
        id: trackId,
        url,
        cachedAt: Date.now()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.error('Media cache error:', err);
  }
}

function openMusicDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PlaysoFloOffline', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}