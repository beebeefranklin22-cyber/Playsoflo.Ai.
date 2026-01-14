import { useEffect } from 'react';
import { toast } from 'sonner';

export default function SafeErrorHandler() {
  useEffect(() => {
    // Prevent infinite refresh loops
    const checkRefreshLoop = () => {
      try {
        const lastRefresh = sessionStorage.getItem('last_refresh_time');
        const refreshCount = parseInt(sessionStorage.getItem('refresh_count') || '0');
        const now = Date.now();

      if (lastRefresh && now - parseInt(lastRefresh) < 5000) {
        // Multiple refreshes within 5 seconds
        const newCount = refreshCount + 1;
        sessionStorage.setItem('refresh_count', newCount.toString());

        if (newCount > 3) {
          // Stop the loop
          toast.error('Detected refresh loop - stopping automatic refreshes');
          sessionStorage.setItem('refresh_loop_detected', 'true');
          return true;
        }
      } else {
        // Reset counter if enough time has passed
        sessionStorage.setItem('refresh_count', '0');
      }

        sessionStorage.setItem('last_refresh_time', now.toString());
        return false;
      } catch (e) {
        // Storage access denied - just continue without loop detection
        console.warn('Storage access denied:', e);
        return false;
      }
    };

    const loopDetected = checkRefreshLoop();
    
    if (loopDetected) {
      // Clear loop detection after 1 minute
      setTimeout(() => {
        sessionStorage.removeItem('refresh_loop_detected');
        sessionStorage.setItem('refresh_count', '0');
      }, 60000);
    }

    // Global error handler
    const handleError = (event) => {
      try {
        const loopActive = sessionStorage.getItem('refresh_loop_detected') === 'true';
        if (loopActive) {
          console.error('Error occurred but refresh loop prevention is active:', event.error);
          event.preventDefault();
          return;
        }
      } catch (e) {
        // Storage access denied - continue
      }

      // Properly format error message
      const errorMessage = event.error?.message || 
                          event.error?.toString() || 
                          JSON.stringify(event.error) || 
                          'Unknown error';
      
      console.error('Global error:', errorMessage);
      
      // Ignore SecurityError and NetworkError
      if (errorMessage.includes('SecurityError') || 
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('insecure')) {
        event.preventDefault();
        return;
      }
      
      toast.error('An error occurred. Please try again.');
    };

    const handleUnhandledRejection = (event) => {
      try {
        const loopActive = sessionStorage.getItem('refresh_loop_detected') === 'true';
        if (loopActive) {
          console.error('Promise rejection but refresh loop prevention is active:', event.reason);
          event.preventDefault();
          return;
        }
      } catch (e) {
        // Storage access denied - continue
      }

      // Properly format rejection reason
      const reason = typeof event.reason === 'object' 
        ? JSON.stringify(event.reason) 
        : String(event.reason);
      
      console.error('Unhandled rejection:', reason);
      
      // Ignore SecurityError
      if (reason.includes('SecurityError') || reason.includes('insecure')) {
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}