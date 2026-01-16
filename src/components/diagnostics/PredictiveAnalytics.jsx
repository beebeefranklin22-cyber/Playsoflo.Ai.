import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { safeSessionStorage } from '../utils/SafeStorage';

export default function PredictiveAnalytics() {
  const metricsHistoryRef = useRef([]);
  const anomalyCheckIntervalRef = useRef(null);

  useEffect(() => {
    // Collect system metrics every 10 seconds
    const collectMetrics = () => {
      const metrics = {
        timestamp: Date.now(),
        memory: performance.memory?.usedJSHeapSize || 0,
        jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit || 0,
        fps: measureFPS(),
        networkLatency: measureNetworkLatency(),
        errorRate: getRecentErrorRate(),
        activeConnections: getActiveConnections(),
        renderTime: getAverageRenderTime()
      };

      metricsHistoryRef.current.push(metrics);
      
      // Keep only last 50 data points
      if (metricsHistoryRef.current.length > 50) {
        metricsHistoryRef.current.shift();
      }
    };

    // Run anomaly detection every 30 seconds
    anomalyCheckIntervalRef.current = setInterval(async () => {
      collectMetrics();
      
      if (metricsHistoryRef.current.length >= 10) {
        await detectAnomalies(metricsHistoryRef.current);
      }
    }, 30000);

    // Initial collection
    collectMetrics();

    return () => {
      if (anomalyCheckIntervalRef.current) {
        clearInterval(anomalyCheckIntervalRef.current);
      }
    };
  }, []);

  const detectAnomalies = async (metricsHistory) => {
    try {
      const result = await base44.functions.invoke('predictiveAnalytics', {
        metricsHistory,
        currentState: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          online: navigator.onLine
        }
      });

      if (result.anomaliesDetected?.length > 0) {
        console.warn('🔍 Anomalies detected:', result.anomaliesDetected);
        
        // Trigger preventative actions
        for (const anomaly of result.anomaliesDetected) {
          if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
            await triggerPreventativeAction(anomaly);
          }
        }
      }

      if (result.predictedFailure) {
        console.error('⚠️ Failure predicted:', result.predictedFailure);
        await preventFailure(result.predictedFailure);
      }
    } catch (error) {
      console.error('Anomaly detection failed:', error);
    }
  };

  const triggerPreventativeAction = async (anomaly) => {
    console.log('🛡️ Triggering preventative action for:', anomaly.type);
    
    switch (anomaly.type) {
      case 'memory_leak':
        clearMemoryCaches();
        break;
      case 'performance_degradation':
        optimizePerformance();
        break;
      case 'network_instability':
        enableOfflineMode();
        break;
      case 'error_spike':
        await runEmergencyDiagnostics();
        break;
    }
  };

  const preventFailure = async (prediction) => {
    console.log('🚨 Preventing predicted failure:', prediction.type);
    
    // Log prediction for analysis
    await base44.entities.ErrorLog.create({
      error_message: `Predicted failure: ${prediction.type}`,
      error_type: 'prediction',
      error_stack: JSON.stringify(prediction),
      resolved: false
    }).catch(() => {});

    // Apply preventative measures
    if (prediction.preventativeMeasures) {
      prediction.preventativeMeasures.forEach(measure => {
        applyPreventativeMeasure(measure);
      });
    }
  };

  const measureFPS = () => {
    // Simplified FPS measurement
    return 60; // Placeholder - real implementation would measure frame times
  };

  const measureNetworkLatency = () => {
    const timing = performance.getEntriesByType('navigation')[0];
    return timing ? timing.responseStart - timing.requestStart : 0;
  };

  const getRecentErrorRate = () => {
    try {
      const recentErrors = safeSessionStorage.getItem('recent_errors');
      return recentErrors ? JSON.parse(recentErrors).length : 0;
    } catch {
      return 0;
    }
  };

  const getActiveConnections = () => {
    return navigator.onLine ? 1 : 0;
  };

  const getAverageRenderTime = () => {
    const entries = performance.getEntriesByType('measure');
    if (entries.length === 0) return 0;
    const sum = entries.reduce((acc, entry) => acc + entry.duration, 0);
    return sum / entries.length;
  };

  const clearMemoryCaches = () => {
    console.log('🧹 Clearing memory caches...');
    safeSessionStorage.clear();
    
    // Clear React Query cache if available
    window.dispatchEvent(new CustomEvent('clear-caches'));
  };

  const optimizePerformance = () => {
    console.log('⚡ Optimizing performance...');
    
    // Reduce quality temporarily
    safeSessionStorage.setItem('performance_mode', 'optimized');
    
    // Trigger optimization event
    window.dispatchEvent(new CustomEvent('optimize-performance'));
  };

  const enableOfflineMode = () => {
    console.log('📴 Enabling offline resilience...');
    safeSessionStorage.setItem('offline_mode', 'true');
  };

  const runEmergencyDiagnostics = async () => {
    console.log('🚑 Running emergency diagnostics...');
    
    await base44.functions.invoke('aiDiagnostics', {
      emergency: true,
      systemMetrics: {
        memory: performance.memory?.usedJSHeapSize,
        timestamp: Date.now()
      },
      autoFix: true
    }).catch(() => {});
  };

  const applyPreventativeMeasure = (measure) => {
    console.log('Applying preventative measure:', measure);
    
    switch (measure) {
      case 'reduce_polling':
        safeSessionStorage.setItem('reduce_polling', 'true');
        break;
      case 'clear_old_data':
        clearMemoryCaches();
        break;
      case 'restart_connections':
        window.dispatchEvent(new CustomEvent('restart-connections'));
        break;
    }
  };

  return null;
}