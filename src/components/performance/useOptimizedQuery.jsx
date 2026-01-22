import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

/**
 * Optimized Query Hook
 * Adds smart caching, retry logic, and error handling
 */
export default function useOptimizedQuery({
  queryKey,
  queryFn,
  enabled = true,
  staleTime = 60000, // 1 minute default
  cacheTime = 300000, // 5 minutes default
  retry = 3,
  retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  onError,
  ...options
}) {
  const [retryCount, setRetryCount] = useState(0);

  const query = useQuery({
    queryKey,
    queryFn: async (...args) => {
      try {
        const result = await queryFn(...args);
        setRetryCount(0); // Reset on success
        return result;
      } catch (error) {
        setRetryCount(prev => prev + 1);
        
        // Log persistent errors
        if (retryCount >= retry - 1) {
          console.error(`[useOptimizedQuery] Max retries reached for ${queryKey}:`, error);
          
          if (onError) {
            onError(error);
          }
        }
        
        throw error;
      }
    },
    enabled,
    staleTime,
    cacheTime,
    retry,
    retryDelay,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnReconnect: true, // Refetch on network reconnect
    ...options
  });

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      if (query.isError) {
        query.refetch();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [query.isError]);

  return {
    ...query,
    retryCount
  };
}