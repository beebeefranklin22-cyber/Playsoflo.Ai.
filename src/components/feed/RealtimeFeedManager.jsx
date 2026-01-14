import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function RealtimeFeedManager({ entities = [], queryKeys = [] }) {
  const queryClient = useQueryClient();
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    if (!entities || entities.length === 0) return;
    
    const unsubscribers = [];

    // Subscribe with debouncing
    entities.forEach(entityName => {
      let debounceTimer;
      
      try {
        const unsubscribe = base44.entities[entityName].subscribe((event) => {
          // Debounce updates to prevent excessive re-renders
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            queryKeys.forEach(key => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }, 1000);
        });

        unsubscribers.push(unsubscribe);
      } catch (error) {
        console.warn(`Failed to subscribe to ${entityName}:`, error);
      }
    });

    return () => {
      unsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (e) {}
      });
    };
  }, []);

  return null;
}