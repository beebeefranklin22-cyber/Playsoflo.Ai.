import { useEffect } from 'react';
import { toast } from 'sonner';

export default function SafeErrorHandler() {
  useEffect(() => {
    // Prevent infinite refresh loops
    const checkRefreshLoop = () => {
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
      const loopActive = sessionStorage.getItem('refresh_loop_detected') === 'true';
      if (loopActive) {
        console.error('Error occurred but refresh loop prevention is active:', event.error);
        event.preventDefault();
        return;
      }

      console.error('Global error:', event.error);
      
      // Only show toast for non-network errors
      if (!event.error?.message?.includes('NetworkError')) {
        toast.error('An error occurred. Please try again.');
      }
    };

    const handleUnhandledRejection = (event) => {
      const loopActive = sessionStorage.getItem('refresh_loop_detected') === 'true';
      if (loopActive) {
        console.error('Promise rejection but refresh loop prevention is active:', event.reason);
        event.preventDefault();
        return;
      }

      console.error('Unhandled rejection:', event.reason);
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