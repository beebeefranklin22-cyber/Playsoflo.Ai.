import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

export default function PresenceIndicators({ documentId, currentUser }) {
  const { data: presences = [], refetch } = useQuery({
    queryKey: ['presence', documentId],
    queryFn: async () => {
      const allPresence = await base44.entities.DocumentPresence.filter({
        document_id: documentId
      });
      
      // Filter out stale presence (>30 seconds old)
      const now = Date.now();
      return allPresence.filter(p => {
        const lastSeen = new Date(p.last_seen).getTime();
        return now - lastSeen < 30000 && p.user_email !== currentUser.email;
      });
    },
    refetchInterval: 3000,
    enabled: !!documentId
  });

  // Subscribe to presence updates
  useEffect(() => {
    if (!documentId) return;

    const unsubscribe = base44.entities.DocumentPresence.subscribe((event) => {
      if (event.data?.document_id === documentId) {
        refetch();
      }
    });

    return unsubscribe;
  }, [documentId, refetch]);

  if (presences.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence>
        {presences.slice(0, 5).map((presence, index) => (
          <motion.div
            key={presence.user_email}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="relative"
            style={{ zIndex: presences.length - index }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/20"
              style={{ backgroundColor: presence.color }}
              title={presence.user_name}
            >
              {presence.user_name?.[0]?.toUpperCase() || '?'}
            </div>
            {presence.is_editing && (
              <div
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white animate-pulse"
                style={{ backgroundColor: presence.color }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {presences.length > 5 && (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
          +{presences.length - 5}
        </div>
      )}
    </div>
  );
}