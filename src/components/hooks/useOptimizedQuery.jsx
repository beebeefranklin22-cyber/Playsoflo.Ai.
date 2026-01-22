import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export function useOptimizedQuery(options) {
  const queryClient = useQueryClient();
  const [errorCount, setErrorCount] = useState(0);
  const errorLoggedRef = useRef(false);

  // Detect slow network
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  
  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      const checkSpeed = () => {
        setIsSlowNetwork(connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g');
      };
      checkSpeed();
      connection.addEventListener('change', checkSpeed);
      return () => connection.removeEventListener('change', checkSpeed);
    }
  }, []);

  const result = useQuery({
    ...options,
    staleTime: isSlowNetwork ? 60000 : (options.staleTime || 30000),
    cacheTime: isSlowNetwork ? 300000 : (options.cacheTime || 300000),
    retry: (failureCount, error) => {
      // Don't retry on 401/403
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: async (error) => {
      setErrorCount(prev => prev + 1);
      
      // Log to database only once per query key
      if (!errorLoggedRef.current && errorCount === 0) {
        errorLoggedRef.current = true;
        try {
          const user = await base44.auth.me().catch(() => null);
          await base44.entities.ErrorLog.create({
            error_message: `Query failed: ${options.queryKey?.join('/')}`,
            error_stack: error?.stack || '',
            error_type: 'global_error',
            user_email: user?.email || 'anonymous',
            url: window.location.href,
            user_agent: navigator.userAgent,
            component_stack: JSON.stringify({
              queryKey: options.queryKey,
              errorMessage: error?.message
            })
          });
        } catch (logError) {
          console.warn('Failed to log query error:', logError);
        }
      }

      // User feedback
      if (errorCount >= 2) {
        toast.error('Having trouble loading data. Check your connection.');
      }

      options.onError?.(error);
    }
  });

  // Prefetch related queries on slow network
  useEffect(() => {
    if (!isSlowNetwork || !result.data) return;

    const prefetchRelated = () => {
      if (options.prefetchRelated) {
        options.prefetchRelated.forEach(key => {
          queryClient.prefetchQuery(key);
        });
      }
    };

    const timeout = setTimeout(prefetchRelated, 1000);
    return () => clearTimeout(timeout);
  }, [result.data, isSlowNetwork]);

  return {
    ...result,
    isSlowNetwork
  };
}