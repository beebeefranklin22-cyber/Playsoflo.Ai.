import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function RealtimeFeedManager({ entities = [], queryKeys = [] }) {
  const queryClient = useQueryClient();
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    const unsubscribers = [];

    // Subscribe to all entity types for real-time updates
    entities.forEach(entityName => {
      const unsubscribe = base44.entities[entityName].subscribe((event) => {
        // Invalidate relevant queries
        queryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });

        // Track updates for UI feedback
        setUpdates(prev => [...prev, { entityName, event, timestamp: Date.now() }].slice(-10));
      });

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [entities.join(',')]);

  return null; // Invisible component
}