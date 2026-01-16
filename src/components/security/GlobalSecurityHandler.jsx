import { useEffect } from 'react';

export default function GlobalSecurityHandler() {
  useEffect(() => {
    // Silently catch and ignore SecurityErrors
    const handleError = (event) => {
      if (event.error?.name === 'SecurityError' || 
          event.message?.includes('SecurityError') ||
          event.message?.includes('insecure')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
    };

    const handleRejection = (event) => {
      if (event.reason?.name === 'SecurityError' || 
          event.reason?.message?.includes('SecurityError') ||
          event.reason?.message?.includes('insecure')) {
        event.preventDefault();
        return true;
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleRejection, true);

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection, true);
    };
  }, []);

  return null;
}