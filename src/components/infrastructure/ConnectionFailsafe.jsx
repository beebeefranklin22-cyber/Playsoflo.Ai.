import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function ConnectionFailsafe() {
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for connection failures
    const handleConnectionError = async (event) => {
      console.warn('🔌 Connection error detected:', event.detail);
      
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        await attemptReconnection();
      } else {
        console.error('❌ Max reconnection attempts reached');
        enableFullOfflineMode();
      }
    };

    // Listen for successful reconnection
    const handleReconnectionSuccess = () => {
      console.log('✅ Connection restored');
      reconnectAttempts.current = 0;
      disableOfflineMode();
      
      // Refresh all queries
      queryClient.invalidateQueries();
    };

    // Custom events for connection management
    window.addEventListener('connection-error', handleConnectionError);
    window.addEventListener('connection-restored', handleReconnectionSuccess);
    window.addEventListener('reconnect-all-services', handleFullReconnect);

    // Monitor WebSocket state
    const wsMonitor = setInterval(checkWebSocketHealth, 30000);

    return () => {
      window.removeEventListener('connection-error', handleConnectionError);
      window.removeEventListener('connection-restored', handleReconnectionSuccess);
      window.removeEventListener('reconnect-all-services', handleFullReconnect);
      clearInterval(wsMonitor);
    };
  }, []);

  const attemptReconnection = async () => {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    console.log(`🔄 Reconnection attempt ${reconnectAttempts.current} in ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Test connection with a simple query
      await base44.auth.isAuthenticated();
      window.dispatchEvent(new CustomEvent('connection-restored'));
    } catch (error) {
      console.error('Reconnection failed:', error);
      window.dispatchEvent(new CustomEvent('connection-error', { detail: error }));
    }
  };

  const handleFullReconnect = async () => {
    console.log('🔄 Full service reconnection initiated');
    reconnectAttempts.current = 0;
    
    // Clear all connection states
    sessionStorage.removeItem('ws_failed');
    sessionStorage.removeItem('offline_mode');
    
    // Trigger reconnection
    await attemptReconnection();
  };

  const checkWebSocketHealth = async () => {
    // Check if real-time subscriptions are working
    const wsFailed = sessionStorage.getItem('ws_failed');
    if (wsFailed) {
      console.warn('⚠️ WebSocket health check failed');
      window.dispatchEvent(new CustomEvent('restart-connections'));
    }
  };

  const enableFullOfflineMode = () => {
    console.log('📴 Enabling full offline mode');
    sessionStorage.setItem('offline_mode', 'full');
    document.body.classList.add('offline-mode');
    
    // Show user notification
    window.dispatchEvent(new CustomEvent('show-offline-notification'));
  };

  const disableOfflineMode = () => {
    sessionStorage.removeItem('offline_mode');
    document.body.classList.remove('offline-mode');
    window.dispatchEvent(new CustomEvent('hide-offline-notification'));
  };

  return null;
}