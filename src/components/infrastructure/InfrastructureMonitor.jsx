import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

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
        });

        if (result.status) {
          setStatus(result.status);
          
          // Auto-repair any failing services
          if (result.failedServices?.length > 0) {
            console.warn('🔧 Auto-repairing services:', result.failedServices);
            await repairServices(result.failedServices);
          }
        }
      } catch (error) {
        console.error('Infrastructure health check failed:', error);
        // Trigger emergency recovery
        await triggerEmergencyRecovery();
      }
    };

    // Initial check
    runHealthCheck();

    // Periodic monitoring
    monitorIntervalRef.current = setInterval(runHealthCheck, 60000);

    // Monitor network changes
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
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
    sessionStorage.removeItem('agora_failed');
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
    sessionStorage.setItem('offline_mode', 'true');
    window.dispatchEvent(new CustomEvent('enable-offline-mode'));
  };

  const triggerEmergencyRecovery = async () => {
    console.log('🚨 Emergency recovery initiated');
    
    // Clear all service states
    sessionStorage.removeItem('service_status');
    
    // Reload critical services
    window.dispatchEvent(new CustomEvent('emergency-recovery'));
  };

  return null;
}