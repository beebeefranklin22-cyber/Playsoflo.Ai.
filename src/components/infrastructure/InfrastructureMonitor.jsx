import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { safeSessionStorage } from '../utils/SafeStorage';

export default function InfrastructureMonitor() {
  const [status, setStatus] = useState({
    streaming: 'unknown',
    database: 'unknown',
    functions: 'unknown',
    realtime: 'unknown',
    cdn: 'unknown'
  });
  const monitorIntervalRef = useRef(null);

  useEffect(() => {
    // Comprehensive health check every 60 seconds
    const runHealthCheck = async () => {
      try {
        const result = await base44.functions.invoke('infrastructureHealthCheck', {
          checkAll: true,
          autoRepair: true
        }).catch(() => ({ status: null }));

        if (result?.data?.status) {
          setStatus(result.data.status);
          
          // Auto-repair any failing services
          if (result.data.failedServices?.length > 0) {
            console.warn('🔧 Auto-repairing services:', result.data.failedServices);
            await repairServices(result.data.failedServices);
          }
        }
      } catch (error) {
        console.error('Infrastructure health check failed:', error);
      }
    };

    // Delay initial check to avoid blocking startup
    const initialTimer = setTimeout(runHealthCheck, 5000);

    // Periodic monitoring
    monitorIntervalRef.current = setInterval(runHealthCheck, 120000);

    // Monitor network changes
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      clearTimeout(initialTimer);
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  const handleNetworkChange = async () => {
    if (navigator.onLine) {
      console.log('🌐 Network restored - validating services');
      await reconnectServices();
    } else {
      console.log('📴 Network lost - enabling offline mode');
      enableOfflineMode();
    }
  };

  const repairServices = async (failedServices) => {
    for (const service of failedServices) {
      switch (service) {
        case 'streaming':
          await repairStreaming();
          break;
        case 'realtime':
          await repairRealtime();
          break;
        case 'database':
          await repairDatabase();
          break;
      }
    }
  };

  const repairStreaming = async () => {
    console.log('🎥 Repairing streaming infrastructure');
    safeSessionStorage.removeItem('agora_failed');
    window.dispatchEvent(new CustomEvent('restart-streaming'));
  };

  const repairRealtime = async () => {
    console.log('⚡ Repairing realtime connections');
    window.dispatchEvent(new CustomEvent('restart-connections'));
  };

  const repairDatabase = async () => {
    console.log('💾 Reconnecting to database');
    window.dispatchEvent(new CustomEvent('reconnect-database'));
  };

  const reconnectServices = async () => {
    window.dispatchEvent(new CustomEvent('reconnect-all-services'));
  };

  const enableOfflineMode = () => {
    safeSessionStorage.setItem('offline_mode', 'true');
    window.dispatchEvent(new CustomEvent('enable-offline-mode'));
  };

  const triggerEmergencyRecovery = async () => {
    console.log('🚨 Emergency recovery initiated');
    
    // Clear all service states
    safeSessionStorage.removeItem('service_status');
    
    // Reload critical services
    window.dispatchEvent(new CustomEvent('emergency-recovery'));
  };

  return null;
}