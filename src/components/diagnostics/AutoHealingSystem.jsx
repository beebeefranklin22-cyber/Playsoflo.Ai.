import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PredictiveAnalytics from './PredictiveAnalytics';

export default function AutoHealingSystem() {
  const [healthStatus, setHealthStatus] = useState('healthy');
  const healingIntervalRef = useRef(null);
  const lastCheckRef = useRef(Date.now());

  useEffect(() => {
    // Enhanced self-healing checks every 15 seconds
    healingIntervalRef.current = setInterval(async () => {
      try {
        const now = Date.now();
        const timeSinceLastCheck = now - lastCheckRef.current;
        
        // Detect freeze (if more than 45 seconds passed)
        if (timeSinceLastCheck > 45000) {
          console.warn('🚨 Freeze detected - initiating recovery');
          setHealthStatus('recovering');
          await triggerAutoRecovery('freeze_detected');
          setHealthStatus('healthy');
        }

        lastCheckRef.current = now;

        // Check for error patterns and spikes
        const errors = await base44.entities.ErrorLog.filter(
          { resolved: false },
          '-created_date',
          20
        ).catch(() => []);

        // Advanced error pattern detection
        if (errors.length > 3) {
          const errorTypes = errors.map(e => e.error_type);
          const uniqueTypes = [...new Set(errorTypes)];
          
          // Same error repeating = critical issue
          if (uniqueTypes.length === 1 && errors.length > 5) {
            console.warn('🔴 Critical: Same error repeating');
            setHealthStatus('critical');
            await runEmergencyDiagnostics(errors, 'error_cascade');
          } else if (errors.length > 8) {
            console.warn('⚠️ High error rate detected');
            setHealthStatus('degraded');
            await runAIDiagnostics(errors);
          }
        }

        // Advanced memory monitoring with trend analysis
        if (performance.memory) {
          const memoryUsage = performance.memory.usedJSHeapSize;
          const memoryLimit = performance.memory.jsHeapSizeLimit;
          const usagePercent = (memoryUsage / memoryLimit) * 100;
          
          if (usagePercent > 85) {
            console.error('🔴 Critical memory usage:', usagePercent.toFixed(1) + '%');
            setHealthStatus('critical');
            await emergencyMemoryCleanup();
          } else if (usagePercent > 70) {
            console.warn('⚠️ High memory usage:', usagePercent.toFixed(1) + '%');
            setHealthStatus('degraded');
            clearAppCaches();
          }
        }

        // Check for slow operations
        const slowOps = performance.getEntriesByType('measure')
          .filter(e => e.duration > 2000);
        
        if (slowOps.length > 5) {
          console.warn('🐌 Multiple slow operations detected');
          await optimizePerformance();
        }

        // If all checks passed, status is healthy
        if (healthStatus !== 'healthy' && errors.length < 3) {
          setHealthStatus('healthy');
        }

      } catch (error) {
        console.error('Auto-healing check failed:', error);
        setHealthStatus('error');
      }
    }, 15000);

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
          memoryLimit: performance.memory?.jsHeapSizeLimit,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          online: navigator.onLine
        },
        autoFix: true
      });

      if (result.autoFixApplied) {
        console.log('✅ AI auto-fix applied successfully');
        setHealthStatus('healthy');
      }
    } catch (error) {
      console.error('AI diagnostics failed:', error);
    }
  };

  const runEmergencyDiagnostics = async (errors, issueType) => {
    console.log('🚑 Running emergency diagnostics for:', issueType);
    
    try {
      const result = await base44.functions.invoke('aiDiagnostics', {
        errorLogs: errors,
        systemMetrics: {
          memory: performance.memory?.usedJSHeapSize,
          timestamp: Date.now(),
          issueType
        },
        emergency: true,
        autoFix: true
      });

      if (result.autoFixApplied) {
        console.log('✅ Emergency fix applied');
        setHealthStatus('recovering');
        setTimeout(() => setHealthStatus('healthy'), 5000);
      }
    } catch (error) {
      console.error('Emergency diagnostics failed:', error);
    }
  };

  const emergencyMemoryCleanup = async () => {
    console.log('🧹 Emergency memory cleanup initiated');
    
    // Clear all caches
    clearAppCaches();
    
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Trigger React Query cache clear
    window.dispatchEvent(new CustomEvent('emergency-cleanup'));
  };

  const optimizePerformance = async () => {
    console.log('⚡ Auto-optimizing performance');
    
    // Enable performance mode
    sessionStorage.setItem('performance_mode', 'high');
    
    // Reduce unnecessary updates
    window.dispatchEvent(new CustomEvent('optimize-performance'));
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

  return (
    <>
      <PredictiveAnalytics />
      {/* Health status indicator (dev mode) */}
      {process.env.NODE_ENV === 'development' && healthStatus !== 'healthy' && (
        <div className="fixed top-20 right-4 z-[9999] px-3 py-2 rounded-lg glass-effect border border-white/20 text-xs text-white">
          Status: {healthStatus}
        </div>
      )}
    </>
  );
}