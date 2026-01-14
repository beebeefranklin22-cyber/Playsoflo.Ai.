import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export default function AutoHealingSystem() {
  const healingIntervalRef = useRef(null);
  const lastCheckRef = useRef(Date.now());

  useEffect(() => {
    // Self-healing checks every 30 seconds
    healingIntervalRef.current = setInterval(async () => {
      try {
        // Check system health
        const now = Date.now();
        const timeSinceLastCheck = now - lastCheckRef.current;
        
        // Detect freeze (if more than 45 seconds passed)
        if (timeSinceLastCheck > 45000) {
          console.warn('Freeze detected - initiating recovery');
          await triggerAutoRecovery('freeze_detected');
        }

        lastCheckRef.current = now;

        // Check for unresolved errors
        const errors = await base44.entities.ErrorLog.filter(
          { resolved: false },
          '-created_date',
          10
        ).catch(() => []);

        if (errors.length > 5) {
          console.log('Multiple errors detected - running AI diagnostics');
          await runAIDiagnostics(errors);
        }

        // Memory leak detection
        if (performance.memory && performance.memory.usedJSHeapSize > 100000000) {
          console.warn('High memory usage detected - clearing caches');
          clearAppCaches();
        }

      } catch (error) {
        console.error('Auto-healing check failed:', error);
      }
    }, 30000);

    // Performance monitoring
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 3000) {
            console.warn('Slow operation detected:', entry.name);
          }
        }
      });
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    }

    return () => {
      if (healingIntervalRef.current) {
        clearInterval(healingIntervalRef.current);
      }
    };
  }, []);

  const runAIDiagnostics = async (errors) => {
    try {
      const result = await base44.functions.invoke('aiDiagnostics', {
        errorLogs: errors,
        systemMetrics: {
          memory: performance.memory?.usedJSHeapSize,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        },
        autoFix: true
      });

      if (result.autoFixApplied) {
        console.log('✅ AI auto-fix applied successfully');
      }
    } catch (error) {
      console.error('AI diagnostics failed:', error);
    }
  };

  const triggerAutoRecovery = async (reason) => {
    console.log('Initiating auto-recovery for:', reason);
    
    // Clear problematic state
    try {
      sessionStorage.setItem('auto_recovery_triggered', Date.now().toString());
      
      // Reload critical data
      window.dispatchEvent(new CustomEvent('system-recovery'));
      
    } catch (error) {
      console.error('Recovery failed:', error);
    }
  };

  const clearAppCaches = () => {
    try {
      // Clear old cache entries
      const cacheKeys = Object.keys(sessionStorage);
      cacheKeys.forEach(key => {
        if (key.startsWith('cache_') || key.startsWith('temp_')) {
          sessionStorage.removeItem(key);
        }
      });
      console.log('Caches cleared');
    } catch (error) {
      console.error('Cache clear failed:', error);
    }
  };

  return null; // Invisible component
}