import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";

// Optimized query with automatic stale-while-revalidate
export function useOptimizedQuery(key, queryFn, options = {}) {
  const {
    staleTime = 30000, // 30 seconds
    cacheTime = 300000, // 5 minutes
    refetchOnWindowFocus = false,
    refetchInterval = false,
    retry = 1,
    ...restOptions
  } = options;

  return useQuery({
    queryKey: key,
    queryFn,
    staleTime,
    cacheTime,
    refetchOnWindowFocus,
    refetchInterval,
    retry,
    ...restOptions
  });
}

// Prefetch data before user needs it
export function usePrefetch(key, queryFn, condition = true) {
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (condition && !hasPrefetched.current) {
      queryClient.prefetchQuery({
        queryKey: key,
        queryFn,
        staleTime: 60000
      });
      hasPrefetched.current = true;
    }
  }, [condition, key, queryFn, queryClient]);
}

// Debounced query for search/filter
export function useDebouncedQuery(key, queryFn, value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return useQuery({
    queryKey: [...key, debouncedValue],
    queryFn: () => queryFn(debouncedValue),
    enabled: debouncedValue.length >= 2,
    staleTime: 30000
  });
}

// Note: useBatchQueries removed - calling hooks inside .map() violates rules of hooks.
// Use individual useQuery calls instead.

// Infinite scroll optimization
export function useInfiniteScrollOptimized(key, queryFn, options = {}) {
  return useInfiniteQuery({
    queryKey: key,
    queryFn,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < 20) return undefined;
      return pages.length * 20;
    },
    staleTime: 60000,
    cacheTime: 300000,
    ...options
  });
}