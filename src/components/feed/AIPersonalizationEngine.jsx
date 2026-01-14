import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function AIPersonalizationEngine({ currentUser, onPreferencesUpdate }) {
  const [preferences, setPreferences] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    // Use cached preferences from user record
    if (currentUser.ai_preferences) {
      setPreferences(currentUser.ai_preferences);
      onPreferencesUpdate?.(currentUser.ai_preferences);
      
      // Check if preferences are old (more than 1 day)
      const lastUpdate = currentUser.preferences_updated_at;
      if (lastUpdate) {
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (new Date(lastUpdate).getTime() > dayAgo) {
          return; // Use cached, don't reanalyze
        }
      }
    }

    // Analyze in background (non-blocking)
    setTimeout(() => {
      base44.functions.invoke('analyzeUserPreferences', {
        userEmail: currentUser.email,
        userInterests: currentUser.interests || []
      }).then(result => {
        if (result?.preferences) {
          setPreferences(result.preferences);
          onPreferencesUpdate?.(result.preferences);
        }
      }).catch(() => {
        // Silent fail - use cached or default
      });
    }, 2000);

  }, [currentUser?.email]);

  return null;
}